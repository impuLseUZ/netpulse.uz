/**
 * Типы для модуля Трассировка (Модуль 2, PingPlotter).
 * Общие между main и renderer.
 */

/** Один хоп маршрута со статистикой по непрерывным пробам. */
export interface TraceHop {
  /** Номер хопа (TTL). */
  hop: number
  /** IP узла (или undefined, если не отвечает — звёздочка). */
  ip?: string
  /** Reverse DNS имя. */
  hostname?: string
  /** Текущая (последняя) задержка, мс. */
  lastMs?: number
  min?: number
  avg?: number
  max?: number
  /** Джиттер (средн. модуль разности последовательных проб), мс. */
  jitter?: number
  /** Процент потерь, 0..100. */
  lossPercent: number
  /** Отправлено проб / получено ответов. */
  sent: number
  received: number
}

export interface TraceStartQuery {
  sessionId: string
  /** Целевой хост: IP или домен. */
  target: string
  /** Максимум хопов. */
  maxHops?: number
  /** Интервал непрерывных проб, мс. */
  intervalMs?: number
  /** Таймаут одной пробы, мс. */
  timeoutMs?: number
  /** Резолвить reverse DNS хопов. */
  resolveNames?: boolean
}

/** Метод построения маршрута. */
export type TraceMethod = 'raw' | 'system'

/** Событие: маршрут построен/обновлён (полный список хопов). */
export interface TraceRouteEvent {
  sessionId: string
  target: string
  resolvedIp?: string
  hops: TraceHop[]
  method: TraceMethod
  /** Идёт ли непрерывный мониторинг. */
  monitoring: boolean
}

/** Точка для графика latency во времени (по конкретному хопу или конечному узлу). */
export interface TraceSample {
  sessionId: string
  timestamp: number
  /** Номер хопа, к которому относится проба. */
  hop: number
  /** Задержка, мс; null — потеря. */
  ms: number | null
}
