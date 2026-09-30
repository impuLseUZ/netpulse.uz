/**
 * HTTP-инспектор: произвольный HTTP-запрос + разбор ответа (мини-Postman)
 * и проверка security-заголовков. Работает в main process — не подпадает
 * под CSP renderer'а (иначе пришлось бы разрешать connect-src на все хосты
 * сразу, что сводит CSP на нет), как и остальные внешние запросы в проекте
 * (SSL, WHOIS, поддомены).
 *
 * Редиректы следуем вручную (redirect: 'manual' на каждом шаге), чтобы
 * показать полную цепочку хопов, а не только финальный URL.
 */
import {
  HttpRequestQuery,
  HttpResponseResult,
  HttpHeader,
  RedirectHop,
  SecurityHeaderCheck
} from '@shared/httpinspect-types'

const MAX_BODY_BYTES = 300_000
const TIMEOUT_MS_DEFAULT = 10000
const MAX_REDIRECTS = 10

const SECURITY_HEADERS: { name: string; recommendation: string }[] = [
  { name: 'strict-transport-security', recommendation: 'Принуждает HTTPS, защищает от downgrade-атак.' },
  { name: 'content-security-policy', recommendation: 'Ограничивает источники контента, снижает риск XSS.' },
  { name: 'x-frame-options', recommendation: 'Защищает от clickjacking через iframe.' },
  { name: 'x-content-type-options', recommendation: 'Запрещает MIME-sniffing браузером.' },
  { name: 'referrer-policy', recommendation: 'Контролирует, сколько данных уходит в заголовке Referer.' },
  { name: 'permissions-policy', recommendation: 'Ограничивает доступ к API браузера (камера, геолокация и т.п.).' },
  { name: 'x-xss-protection', recommendation: 'Устаревший, но иногда всё ещё ожидаемый заголовок защиты от XSS.' }
]

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('Пустой URL')
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function headersToArray(h: Headers): HttpHeader[] {
  const out: HttpHeader[] = []
  h.forEach((value, key) => out.push({ key, value }))
  return out
}

function checkSecurityHeaders(headers: HttpHeader[]): SecurityHeaderCheck[] {
  return SECURITY_HEADERS.map((sh) => {
    const found = headers.find((h) => h.key.toLowerCase() === sh.name)
    return { name: sh.name, present: !!found, value: found?.value, recommendation: sh.recommendation }
  })
}

function looksLikeJson(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  try {
    JSON.parse(t)
    return true
  } catch {
    return false
  }
}

export async function sendHttpRequest(q: HttpRequestQuery): Promise<HttpResponseResult> {
  const start = Date.now()
  const headersInit: Record<string, string> = {}
  for (const h of q.headers) {
    const key = h.key.trim()
    if (key) headersInit[key] = h.value
  }

  const hasBody = q.body && !['GET', 'HEAD'].includes(q.method)

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), q.timeoutMs ?? TIMEOUT_MS_DEFAULT)

  try {
    let currentUrl = normalizeUrl(q.url)
    const redirectChain: RedirectHop[] = []
    let res: Response

    for (let hop = 0; ; hop++) {
      res = await fetch(currentUrl, {
        method: q.method,
        headers: headersInit,
        body: hasBody ? q.body : undefined,
        redirect: 'manual',
        signal: ctrl.signal
      })

      const isRedirect = res.status >= 300 && res.status < 400
      const location = res.headers.get('location')
      if (!q.followRedirects || !isRedirect || !location) break
      if (hop >= MAX_REDIRECTS) throw new Error('Слишком много редиректов')

      const nextUrl = new URL(location, currentUrl).toString()
      redirectChain.push({ url: currentUrl, status: res.status, location: nextUrl })
      currentUrl = nextUrl
    }

    const buf = Buffer.from(await res.arrayBuffer())
    const truncated = buf.length > MAX_BODY_BYTES
    const body = buf.subarray(0, MAX_BODY_BYTES).toString('utf8')
    const headers = headersToArray(res.headers)

    return {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      headers,
      body,
      bodyTruncated: truncated,
      sizeBytes: buf.length,
      elapsedMs: Date.now() - start,
      finalUrl: currentUrl,
      redirectChain,
      securityHeaders: checkSecurityHeaders(headers),
      isJson: looksLikeJson(body)
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new Error('Таймаут запроса')
    throw err
  } finally {
    clearTimeout(timer)
  }
}
