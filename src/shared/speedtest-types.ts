/**
 * Типы для модуля Speedtest (Модуль 6).
 * Общие между main (сервис сетевой информации) и renderer (UI замера).
 *
 * Сам замер скорости выполняется в renderer через @cloudflare/speedtest
 * (библиотека опирается на браузерные API: fetch / performance / WebRTC),
 * поэтому метрики замера через IPC НЕ проходят. Через IPC идёт только
 * внешний IP/ISP, которые удобнее получить из main.
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

/** Фаза, в которой сейчас находится замер (для индикации в UI). */
export type SpeedtestPhase =
  | 'idle'
  | 'latency' // измерение пинга/джиттера
  | 'download' // загрузка
  | 'upload' // отдача
  | 'done'
  | 'error'

/** Итоговые/промежуточные метрики замера. Значения нормализованы для UI. */
export interface SpeedtestResult {
  /** Скорость загрузки, Мбит/с. */
  downloadMbps?: number
  /** Скорость отдачи, Мбит/с. */
  uploadMbps?: number
  /** Латентность (ненагруженная), мс. */
  pingMs?: number
  /** Джиттер, мс. */
  jitterMs?: number
}

/** Запись истории замеров (живёт только в текущей сессии renderer). */
export interface SpeedtestHistoryEntry extends SpeedtestResult {
  /** Уникальный id записи. */
  id: string
  /** Время завершения замера (epoch ms). */
  timestamp: number
  /** Внешний IP на момент замера. */
  ip?: string
  /** Провайдер на момент замера. */
  isp?: string
}