/**
 * Сервис модуля Speedtest (Модуль 6) — серверная часть (main).
 *
 * Здесь только определение внешнего IP и провайдера. Сам замер скорости
 * выполняется в renderer (@cloudflare/speedtest использует браузерные API).
 *
 * Источник — Cloudflare `cdn-cgi/trace`: лёгкий текстовый эндпоинт вида
 * "ip=1.2.3.4\nloc=UZ\ncolo=TAS\n...". Тот же провайдер, что и сам замер,
 * без ключей. ISP/ASN там нет, поэтому организацию дотягиваем отдельным
 * запросом к Cloudflare RADAR (best-effort; при ошибке просто опускаем).
 *
 * Требует интернета — это единственный сетевой модуль наряду с WHOIS.
 */
import { NetworkInfo } from '@shared/speedtest-types'

const TRACE_URL = 'https://speed.cloudflare.com/cdn-cgi/trace'
const TIMEOUT_MS = 5000

/** fetch с таймаутом через AbortController (сеть всегда может зависнуть). */
async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

/** Парсит "key=value" построчно в объект. */
function parseTrace(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const idx = line.indexOf('=')
    if (idx > 0) out[line.slice(0, idx)] = line.slice(idx + 1).trim()
  }
  return out
}

/** Best-effort определение организации (ISP) по IP через Cloudflare RADAR. */
async function lookupIsp(ip: string): Promise<string | undefined> {
  try {
    const text = await fetchText(
      `https://rest.cloudflare.com/cdn-cgi/trace?ip=${encodeURIComponent(ip)}`,
      TIMEOUT_MS
    )
    // Если эндпоинт недоступен/сменился — молча опускаем ISP, не роняя замер.
    const t = parseTrace(text)
    return t['asOrganization'] || undefined
  } catch {
    return undefined
  }
}

/**
 * Возвращает внешний IP и (best-effort) провайдера.
 * Бросает понятную ошибку только если недоступен сам IP.
 */
export async function getNetworkInfo(): Promise<NetworkInfo> {
  let text: string
  try {
    text = await fetchText(TRACE_URL, TIMEOUT_MS)
  } catch (err) {
    const e = err as Error
    console.error('[speedtest:main] trace fetch failed:', e.message)
    const out = new Error('Нет доступа к серверу Cloudflare. Проверьте интернет-соединение.')
    ;(out as Error & { code?: string }).code = 'E_NETWORK'
    out.cause = e
    throw out
  }

  const t = parseTrace(text)
  const ip = t['ip'] ?? ''
  const isp = ip ? await lookupIsp(ip) : undefined
  console.info('[speedtest:main] network info:', { ip, isp, loc: t['loc'], colo: t['colo'] })

  return {
    ip,
    isp,
    country: t['loc'] || undefined,
    colo: t['colo'] || undefined
  }
}