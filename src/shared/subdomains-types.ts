/**
 * Типы для поиска поддоменов (Certificate Transparency + DNS-перебор).
 */
export interface SubdomainQuery {
  sessionId: string
  domain: string
  useCrtSh: boolean
  useBruteforce: boolean
  concurrency?: number
  timeoutMs?: number
  /** Дополнительные метки для DNS-перебора — конкретные известные поддомены. */
  extraWords?: string[]
}

export type SubdomainSource = 'crtsh' | 'dns'

export interface SubdomainHost {
  sessionId: string
  subdomain: string
  ips: string[]
  source: SubdomainSource
}

export interface SubdomainProgress {
  sessionId: string
  phase: 'crtsh' | 'dns' | 'done'
  scanned: number
  total: number
  found: number
  done: boolean
  /** Заполнено, если источник (например crt.sh) не ответил — не значит «0 поддоменов». */
  error?: string
}
