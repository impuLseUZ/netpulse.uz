/**
 * Preflight-диагностика перед запуском Speedtest.
 *
 * Цель: до старта замера быстро определить что именно доступно —
 * Cloudflare, timing API, SSL — и вернуть hint для выбора метода замера.
 *
 * Не бросает исключений. Всегда возвращает PreflightResult.
 */

/** Что именно выявила диагностика. */
export type FirewallHint =
  | 'ok'               // всё доступно, запускаем Cloudflare-тест
  | 'timing_blocked'   // fetch проходит, но Timing-Allow-Origin отсутствует → Kerio SSL-inspection
  | 'cf_blocked'       // speed.cloudflare.com полностью заблокирован
  | 'ssl_error'        // сертификат подменён (Kerio/FortiGate MITM)
  | 'no_internet'      // интернета нет вообще
  | 'unknown'          // что-то другое

export interface PreflightResult {
  hint: FirewallHint
  /** RTT до probe-сервера, мс (если измерение прошло). */
  latencyMs?: number
  /** Оригинальное сообщение ошибки для логов. */
  errorMessage?: string
  /** Можно ли запускать основной Cloudflare-тест. */
  canUsePrimary: boolean
  /** Можно ли использовать HTTP-fallback (HTTPS 443 доступен). */
  canUseFallback: boolean
}

const CF_TRACE_URL = 'https://speed.cloudflare.com/cdn-cgi/trace'
const CF_DOWN_URL  = 'https://speed.cloudflare.com/__down?bytes=1024'
const FALLBACK_PROBE_URL = 'https://www.google.com/generate_204'
const TIMEOUT_MS = 5000

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: 'no-store' })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Проверяем, не обнулил ли фаервол Performance Resource Timing.
 * Kerio Control при SSL-inspection убирает transferSize и duration —
 * именно эти данные использует @cloudflare/speedtest для расчёта скорости.
 * Если они нулевые — библиотека вернёт 0 Мбит/с или упадёт.
 */
function isTimingBlocked(urlPrefix: string): boolean {
  try {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const entry = entries.find((e) => e.name.startsWith(urlPrefix))
    if (!entry) return false
    // Timing заблокирован если и transferSize и длительность равны 0
    return entry.transferSize === 0 && entry.responseEnd - entry.responseStart < 1
  } catch {
    return false
  }
}

/** Основная функция диагностики. Выполняется ~1-3 с. */
export async function runPreflight(): Promise<PreflightResult> {
  let cfOk = false
  let cfError: string | undefined
  let latencyMs: number | undefined

  // ── Шаг 1: Пробуем Cloudflare ────────────────────────────────────────────
  try {
    const t0 = performance.now()
    const res = await fetchWithTimeout(CF_TRACE_URL, TIMEOUT_MS)
    latencyMs = Math.round(performance.now() - t0)

    if (res.ok) {
      // Читаем тело чтобы timing запись появилась в PerformanceObserver
      await res.text()
      cfOk = true

      // Шаг 1b: Проверяем, не заблокировал ли фаервол timing
      if (isTimingBlocked(CF_DOWN_URL.split('?')[0]) || isTimingBlocked('https://speed.cloudflare.com')) {
        return {
          hint: 'timing_blocked',
          latencyMs,
          errorMessage: 'Performance Resource Timing обнулён (DPI/SSL-inspection)',
          canUsePrimary: false,
          canUseFallback: true,
        }
      }
    } else {
      cfError = `HTTP ${res.status}`
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    cfError = msg

    // SSL-ошибка означает MITM (FortiGate, Kerio с SSL-инспекцией)
    if (
      msg.includes('ERR_CERT') ||
      msg.includes('certificate') ||
      msg.includes('SSL') ||
      msg.includes('CERT_AUTHORITY_INVALID') ||
      msg.includes('CERT_DATE_INVALID')
    ) {
      return {
        hint: 'ssl_error',
        errorMessage: msg,
        canUsePrimary: false,
        canUseFallback: false,
      }
    }
  }

  if (!cfOk) {
    // ── Шаг 2: Cloudflare недоступен — проверяем, есть ли интернет вообще ──
    try {
      const t0 = performance.now()
      const res = await fetchWithTimeout(FALLBACK_PROBE_URL, TIMEOUT_MS)
      latencyMs = Math.round(performance.now() - t0)

      if (res.ok || res.status === 204) {
        // Интернет есть, но Cloudflare заблокирован конкретно
        return {
          hint: 'cf_blocked',
          latencyMs,
          errorMessage: cfError,
          canUsePrimary: false,
          canUseFallback: true,
        }
      }
    } catch {
      // Нет интернета совсем
      return {
        hint: 'no_internet',
        errorMessage: cfError,
        canUsePrimary: false,
        canUseFallback: false,
      }
    }

    return {
      hint: 'cf_blocked',
      errorMessage: cfError,
      canUsePrimary: false,
      canUseFallback: true,
    }
  }

  // Всё доступно
  return {
    hint: 'ok',
    latencyMs,
    canUsePrimary: true,
    canUseFallback: true,
  }
}