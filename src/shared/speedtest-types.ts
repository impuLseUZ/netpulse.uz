/**
 * Типы для модуля Speedtest (Модуль 6).
 * Общие между main (сервис сетевой информации) и renderer (UI замера).
 */

/** Внешний IP и сведения о провайдере (для шапки модуля). */
export interface NetworkInfo {
  /** Внешний IPv4/IPv6, как его видит Cloudflare edge. */
  ip: string
  /** Провайдер/организация (ASN org), если удалось определить. */
  isp?: string
  /** Код страны (например "UZ"), если доступен. */
  country?: string
  /** Город/локация Cloudflare edge (colo), например "TAS". */
  colo?: string
}

/** Фаза, в которой сейчас находится замер. */
export type SpeedtestPhase =
  | 'idle'
  | 'preflight'  // диагностика сети перед замером
  | 'latency'
  | 'download'
  | 'upload'
  | 'done'
  | 'error'

/** Итоговые/промежуточные метрики замера. */
export interface SpeedtestResult {
  downloadMbps?: number
  uploadMbps?: number
  pingMs?: number
  jitterMs?: number
}

/** Запись истории замеров (живёт только в текущей сессии renderer). */
export interface SpeedtestHistoryEntry extends SpeedtestResult {
  id: string
  timestamp: number
  ip?: string
  isp?: string
  /**
   * true = замер выполнен через HTTP-fallback (за фаерволом).
   * false/undefined = полный Cloudflare-тест.
   */
  isFallback?: boolean
}