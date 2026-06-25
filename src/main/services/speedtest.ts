/**
 * Сервис модуля Speedtest (Модуль 6) — серверная часть (main).
 *
 * Возвращает внешний IP и провайдера для шапки страницы.
 * Использует несколько источников с fallback:
 *   1. speed.cloudflare.com/cdn-cgi/trace  — предпочтительно (тот же провайдер)
 *   2. api.ipify.org                        — простой IP-only fallback
 *   3. ip-api.com/json                      — IP + ISP + страна
 *
 * Если Cloudflare заблокирован фаерволом (Kerio Control, MikroTik),
 * сервис молча переключается на следующий источник и всё равно возвращает IP.
 * Единственный случай когда бросает — нет интернета совсем.
 */
import { NetworkInfo } from '@shared/speedtest-types'

const TIMEOUT_MS = 5000

async function fetchText(url: string): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const text = await fetchText(url)
  return JSON.parse(text) as Record<string, unknown>
}

function parseTrace(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const idx = line.indexOf('=')
    if (idx > 0) out[line.slice(0, idx)] = line.slice(idx + 1).trim()
  }
  return out
}

/** Источник 1: Cloudflare trace — IP + страна + colo. */
async function tryCloudflare(): Promise<NetworkInfo | null> {
  try {
    const text = await fetchText('https://speed.cloudflare.com/cdn-cgi/trace')
    const t = parseTrace(text)
    const ip = t['ip']
    if (!ip) return null
    console.info('[speedtest:main] got IP from Cloudflare:', ip)
    return {
      ip,
      country: t['loc'] || undefined,
      colo: t['colo'] || undefined,
    }
  } catch (err) {
    console.warn('[speedtest:main] Cloudflare trace failed:', (err as Error).message)
    return null
  }
}

/** Источник 2: ipify — только IP, очень надёжный, редко блокируется. */
async function tryIpify(): Promise<NetworkInfo | null> {
  try {
    const text = await fetchText('https://api.ipify.org')
    const ip = text.trim()
    if (!ip || !ip.includes('.')) return null
    console.info('[speedtest:main] got IP from ipify:', ip)
    return { ip }
  } catch (err) {
    console.warn('[speedtest:main] ipify failed:', (err as Error).message)
    return null
  }
}

/** Источник 3: ip-api — IP + ISP + страна (без HTTPS на бесплатном плане, но работает). */
async function tryIpApi(): Promise<NetworkInfo | null> {
  try {
    const data = await fetchJson('http://ip-api.com/json?fields=status,query,country,countryCode,isp')
    if (data['status'] !== 'success') return null
    const ip = String(data['query'] ?? '')
    if (!ip) return null
    console.info('[speedtest:main] got IP from ip-api:', ip)
    return {
      ip,
      isp: data['isp'] ? String(data['isp']) : undefined,
      country: data['countryCode'] ? String(data['countryCode']) : undefined,
    }
  } catch (err) {
    console.warn('[speedtest:main] ip-api failed:', (err as Error).message)
    return null
  }
}

/**
 * Возвращает внешний IP и (если удалось) провайдера.
 * Пробует источники по очереди. Бросает только если все недоступны.
 */
export async function getNetworkInfo(): Promise<NetworkInfo> {
  // Пробуем все источники параллельно с таймаутом, берём первый успешный
  // (но с приоритетом: CF > ipify > ip-api)
  const cf = tryCloudflare()
  const ipify = tryIpify()
  const ipapi = tryIpApi()

  // Сначала ждём Cloudflare — он предпочтителен
  const cfResult = await cf
  if (cfResult) return cfResult

  // Если CF не ответил — берём ipify (самый простой)
  const ipifyResult = await ipify
  if (ipifyResult) return ipifyResult

  // Последний шанс — ip-api (HTTP, не HTTPS — проходит даже через жёсткие FW)
  const ipapiResult = await ipapi
  if (ipapiResult) return ipapiResult

  // Ни один источник не ответил
  const err = new Error('Не удалось определить внешний IP. Нет доступа к интернету.')
  ;(err as Error & { code?: string }).code = 'E_NETWORK'
  throw err
}