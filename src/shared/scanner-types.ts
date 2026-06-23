/**
 * Типы для модуля Сканер сети (Модуль 1).
 * Общие между main, worker и renderer.
 */

/** Один обнаруженный хост. */
export interface ScanHost {
  ip: string
  alive: boolean
  /** Время отклика ICMP, мс. */
  timeMs?: number
  /** Имя устройства (reverse DNS). */
  hostname?: string
  /** MAC-адрес из ARP-таблицы. */
  mac?: string
  /** Производитель по OUI. */
  vendor?: string
}

export interface ScanQuery {
  /** Идентификатор сессии (генерирует renderer, для отмены и фильтрации событий). */
  sessionId: string
  /** Ввод диапазона: CIDR, диапазон через дефис, список через запятую. */
  range: string
  /** Таймаут одной пробы, мс. */
  timeoutMs?: number
  /** Лимит параллельности. */
  concurrency?: number
  /** Резолвить reverse DNS для живых хостов. */
  resolveNames?: boolean
}

/** Прогресс сканирования. */
export interface ScanProgress {
  sessionId: string
  total: number
  scanned: number
  found: number
  done: boolean
  /** Метод, которым реально сканируем: raw-сокеты или системный ping. */
  method: 'raw' | 'system'
}

/** Событие: найден живой хост (приходит инкрементально). */
export interface ScanHostEvent {
  sessionId: string
  host: ScanHost
}

/** Локальный сетевой интерфейс для автоподстановки диапазона. */
export interface LocalSubnet {
  /** CIDR активного интерфейса, например "192.168.1.0/24". */
  cidr: string
  /** IP самого интерфейса. */
  address: string
  ifaceName: string
}
