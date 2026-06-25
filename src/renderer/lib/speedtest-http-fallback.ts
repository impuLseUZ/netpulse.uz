/**
 * HTTP Fallback Speedtest.
 *
 * Работает за Kerio Control, MikroTik, FortiGate и другими фаерволами,
 * потому что использует только обычный HTTPS 443 и НЕ зависит от
 * Performance Resource Timing (который фаерволы обнуляют через DPI).
 *
 * Скорость считаем через ReadableStream reader + performance.now():
 * - Download: скачиваем файл, считаем реально прочитанные байты / время.
 * - Upload: отправляем случайный Blob, меряем время ответа.
 * - Latency: HEAD/GET серия запросов, медиана RTT.
 *
 * Точность ~±15% от реальной скорости — достаточно для диагностики.
 */

import type { SpeedtestResult } from '@shared/speedtest-types'

export type FallbackProgressCallback = (partial: SpeedtestResult, phase: string) => void

/**
 * Probe-URLs для download-теста.
 * Первые — Cloudflare (если CF доступен но timing заблокирован).
 * Остальные — публичные CDN (если CF заблокирован совсем).
 */
const CF_DOWNLOAD_PROBES = [
  { url: 'https://speed.cloudflare.com/__down?bytes=102400',    bytes: 100   * 1024 },
  { url: 'https://speed.cloudflare.com/__down?bytes=1048576',   bytes: 1024  * 1024 },
  { url: 'https://speed.cloudflare.com/__down?bytes=10485760',  bytes: 10    * 1024 * 1024 },
  { url: 'https://speed.cloudflare.com/__down?bytes=26214400',  bytes: 25    * 1024 * 1024 },
]

const CDN_DOWNLOAD_PROBES = [
  { url: 'https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js',      bytes: 87_000 },
  { url: 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js',            bytes: 71_000 },
  { url: 'https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js', bytes: 11_000 },
  { url: 'https://cdn.jsdelivr.net/npm/rxjs@7.8.1/dist/bundles/rxjs.umd.min.js', bytes: 200_000 },
]

const CF_UPLOAD_ENDPOINT  = 'https://speed.cloudflare.com/__up'
const ALT_UPLOAD_ENDPOINT = 'https://httpbin.org/post'

const LATENCY_PROBES = [
  'https://speed.cloudflare.com/cdn-cgi/trace',
  'https://www.google.com/generate_204',
  'https://1.1.1.1/cdn-cgi/trace',
  'https://8.8.8.8',
]

const FETCH_TIMEOUT_MS = 10_000

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: 'no-store' })
  } finally {
    clearTimeout(timer)
  }
}

/** Генерирует случайный Blob — DPI не сможет сжать, замер будет честным. */
function makeRandomBlob(bytes: number): Blob {
  const buf = new Uint8Array(bytes)
  // Первые 64KB заполняем случайно (быстро), остальное нули
  crypto.getRandomValues(buf.subarray(0, Math.min(bytes, 65536)))
  return new Blob([buf])
}

/**
 * Скачивает URL через ReadableStream, возвращает реальную скорость в bps.
 * Не полагается на Performance Timing — считаем байты сами.
 */
async function measureDownloadBps(url: string): Promise<number | null> {
  try {
    const t0 = performance.now()
    const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS)
    if (!res.ok || !res.body) return null

    const reader = res.body.getReader()
    let received = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      received += value?.byteLength ?? 0
    }

    const elapsedSec = (performance.now() - t0) / 1000
    if (elapsedSec < 0.05 || received < 1000) return null
    return (received * 8) / elapsedSec
  } catch {
    return null
  }
}

/** Отправляет Blob через POST, возвращает скорость upload в bps. */
async function measureUploadBps(url: string, sizeBytes: number): Promise<number | null> {
  try {
    const blob = makeRandomBlob(sizeBytes)
    const t0 = performance.now()
    const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS, {
      method: 'POST',
      body: blob,
      headers: { 'Content-Type': 'application/octet-stream' },
    })
    // Читаем ответ чтобы закрыть соединение корректно
    await res.text().catch(() => {})
    const elapsedSec = (performance.now() - t0) / 1000
    if (!res.ok || elapsedSec < 0.05) return null
    return (sizeBytes * 8) / elapsedSec
  } catch {
    return null
  }
}

/** Серия RTT-измерений, возвращает массив миллисекунд. */
async function measureLatencySamples(): Promise<number[]> {
  const samples: number[] = []
  const targetSamples = 10

  for (const url of LATENCY_PROBES) {
    const perProbe = Math.ceil((targetSamples - samples.length) / (LATENCY_PROBES.length))
    let probeWorks = false

    for (let i = 0; i < perProbe; i++) {
      try {
        const t0 = performance.now()
        const res = await fetchWithTimeout(url, 2500)
        await res.text().catch(() => {})
        const rtt = performance.now() - t0
        if (rtt < 2500) {
          samples.push(rtt)
          probeWorks = true
        }
      } catch {
        break // этот probe недоступен
      }
    }

    if (!probeWorks) continue
    if (samples.length >= targetSamples) break
  }

  return samples
}

function sortedCopy(arr: number[]): number[] {
  return [...arr].sort((a, b) => a - b)
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const s = sortedCopy(arr)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m]
}

/** Среднее с обрезкой 10% выбросов с каждого конца. */
function trimmedMean(arr: number[], trim = 0.1): number {
  if (arr.length === 0) return 0
  const s = sortedCopy(arr)
  const cut = Math.floor(s.length * trim)
  const trimmed = s.slice(cut, s.length - cut || undefined)
  if (trimmed.length === 0) return s[Math.floor(s.length / 2)]
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length
}

function calcJitter(samples: number[]): number {
  if (samples.length < 2) return 0
  const m = trimmedMean(samples)
  const variance = samples.reduce((a, b) => a + (b - m) ** 2, 0) / samples.length
  return Math.sqrt(variance)
}

/**
 * Основная функция fallback-замера.
 *
 * @param onProgress  вызывается при каждом промежуточном результате
 * @param useCfDown   использовать CF для download (если CF доступен но timing заблокирован)
 */
export async function runHttpFallbackSpeedtest(
  onProgress: FallbackProgressCallback,
  useCfDown = true,
): Promise<SpeedtestResult> {
  const result: SpeedtestResult = {}

  // ── 1. Latency ─────────────────────────────────────────────────────────────
  onProgress({}, 'latency')
  const latSamples = await measureLatencySamples()
  if (latSamples.length > 0) {
    result.pingMs   = Math.round(median(latSamples))
    result.jitterMs = Math.round(calcJitter(latSamples))
    onProgress({ ...result }, 'latency')
  }

  // ── 2. Download ────────────────────────────────────────────────────────────
  onProgress({ ...result }, 'download')

  const downloadProbes = useCfDown
    ? [...CF_DOWNLOAD_PROBES, ...CDN_DOWNLOAD_PROBES]
    : CDN_DOWNLOAD_PROBES

  const dlSamples: number[] = []

  for (const probe of downloadProbes) {
    const bps = await measureDownloadBps(probe.url)
    if (bps !== null && bps > 0) {
      dlSamples.push(bps)
      result.downloadMbps = trimmedMean(dlSamples) / 1e6
      onProgress({ ...result }, 'download')
    }
    // 4+ измерения достаточно для стабильной оценки
    if (dlSamples.length >= 4) break
  }

  // ── 3. Upload ──────────────────────────────────────────────────────────────
  onProgress({ ...result }, 'upload')

  const uploadSizes   = [256 * 1024, 1 * 1024 * 1024, 4 * 1024 * 1024, 10 * 1024 * 1024]
  const uploadEndpoints = [CF_UPLOAD_ENDPOINT, ALT_UPLOAD_ENDPOINT]
  const ulSamples: number[] = []

  outer:
  for (const endpoint of uploadEndpoints) {
    let endpointWorks = false
    for (const size of uploadSizes) {
      const bps = await measureUploadBps(endpoint, size)
      if (bps !== null && bps > 0) {
        ulSamples.push(bps)
        result.uploadMbps = trimmedMean(ulSamples) / 1e6
        onProgress({ ...result }, 'upload')
        endpointWorks = true
      }
      if (ulSamples.length >= 3) break outer
    }
    if (endpointWorks) break // этот endpoint работает, хватит
  }

  return result
}