/**
 * Типы для HTTP-инспектора (мини-Postman + анализ security-заголовков).
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export interface HttpHeader {
  key: string
  value: string
}

export interface HttpRequestQuery {
  url: string
  method: HttpMethod
  headers: HttpHeader[]
  body?: string
  timeoutMs?: number
  followRedirects: boolean
}

export interface RedirectHop {
  url: string
  status: number
  location: string
}

export interface SecurityHeaderCheck {
  name: string
  present: boolean
  value?: string
  recommendation: string
}

export interface HttpResponseResult {
  status: number
  statusText: string
  ok: boolean
  headers: HttpHeader[]
  body: string
  bodyTruncated: boolean
  sizeBytes: number
  elapsedMs: number
  finalUrl: string
  redirectChain: RedirectHop[]
  securityHeaders: SecurityHeaderCheck[]
  /** Заполнено, если тело похоже на JSON и успешно распарсилось (для pretty-print). */
  isJson: boolean
}
