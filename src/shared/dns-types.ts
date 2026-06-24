/**
 * Типы для модуля DNS Lookup (Модуль 5).
 * Общие между main (сервис) и renderer (UI).
 */

/** Поддерживаемые типы записей в этой итерации. */
export type DnsRecordType = 'A' | 'AAAA' | 'MX' | 'NS' | 'TXT' | 'PTR'

export const DNS_RECORD_TYPES: DnsRecordType[] = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'PTR']

/** Одна запись результата (значение приведено к строке для единообразия UI). */
export interface DnsRecord {
  type: DnsRecordType
  /** Готовое к показу значение (для MX — "10 mail.example.com" и т.п.). */
  value: string
  /** Доп. поле приоритета для MX. */
  priority?: number
}

export interface DnsQuery {
  /** Домен или IP (для PTR). */
  host: string
  /** Конкретный тип или 'ALL' для основных. */
  type: DnsRecordType | 'ALL'
  /** Кастомный DNS-сервер, например "8.8.8.8". Пусто — системный резолвер. */
  server?: string
}

export interface DnsLookupResult {
  host: string
  server: string // фактически использованный сервер ('system' или IP)
  records: DnsRecord[]
  /** Время ответа, мс. */
  elapsedMs: number
}

/* ── WHOIS ── */

export interface WhoisQuery {
  /** Домен или IP. */
  query: string
}

export interface WhoisResult {
  query: string
  /** Сырой текст ответа whois-сервера. */
  raw: string
  elapsedMs: number
}

/* ── SSL / TLS сертификат ── */

export interface SslQuery {
  /** Домен (хост). */
  host: string
  /** Порт TLS, по умолчанию 443. */
  port?: number
}

export interface SslResult {
  host: string
  port: number
  /** Общее имя (CN) субъекта сертификата. */
  subjectCN?: string
  /** Альтернативные имена (SAN), уже распарсенные. */
  altNames: string[]
  /** Издатель: организация (O) или CN. */
  issuer?: string
  /** Действителен с (ISO-строка). */
  validFrom?: string
  /** Действителен до (ISO-строка). */
  validTo?: string
  /** Сколько дней осталось до истечения (может быть отрицательным). */
  daysRemaining?: number
  /** Истёк ли сертификат. */
  expired: boolean
  /** Серийный номер. */
  serialNumber?: string
  /** Отпечаток SHA-256. */
  fingerprint256?: string
  /** Версия протокола (например "TLSv1.3"). */
  protocol?: string
  /** Согласованный шифр (например "TLS_AES_256_GCM_SHA384"). */
  cipher?: string
  /** Прошла ли стандартная проверка доверия цепочки. */
  authorized: boolean
  /** Причина, если проверка доверия не прошла. */
  authorizationError?: string
  elapsedMs: number
}
