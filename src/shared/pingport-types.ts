/**
 * Типы для модулей Ping и Port (Модуль 4).
 * Общие между main (сервисы) и renderer (UI). Только TCP.
 */

/** Известные сервисы по номеру порта (для подсказки в UI). */
export const PORT_SERVICES: Record<number, string> = {
  20: 'FTP-DATA',
  21: 'FTP',
  22: 'SSH',
  23: 'Telnet',
  25: 'SMTP',
  53: 'DNS',
  80: 'HTTP',
  110: 'POP3',
  123: 'NTP',
  135: 'RPC',
  137: 'NetBIOS',
  138: 'NetBIOS',
  139: 'NetBIOS',
  143: 'IMAP',
  161: 'SNMP',
  389: 'LDAP',
  443: 'HTTPS',
  445: 'SMB',
  465: 'SMTPS',
  587: 'SMTP',
  636: 'LDAPS',
  993: 'IMAPS',
  995: 'POP3S',
  1433: 'MSSQL',
  1521: 'Oracle',
  3306: 'MySQL',
  3389: 'RDP',
  5432: 'PostgreSQL',
  5900: 'VNC',
  6379: 'Redis',
  8080: 'HTTP-alt',
  8443: 'HTTPS-alt',
  27017: 'MongoDB'
}

export function serviceForPort(port: number): string | undefined {
  return PORT_SERVICES[port]
}

/* ── ICMP ping (разовый) ── */

export interface PingResult {
  host: string
  /** Хост ответил хотя бы на один пакет. */
  alive: boolean
  /** Время отклика последнего пакета, мс (если есть). */
  timeMs?: number
  min?: number
  avg?: number
  max?: number
  /** Доля потерь, 0..100. */
  lossPercent: number
  /** Сырой вывод утилиты (для отладки/лога). */
  raw?: string
}

/* ── Проверка портов (только TCP) ── */

export type PortStatus = 'open' | 'closed' | 'filtered'

export interface PortResult {
  port: number
  status: PortStatus
  /** Время установления соединения, мс (для open). */
  timeMs?: number
  service?: string
}

export interface PortCheckQuery {
  host: string
  /** Список TCP-портов. */
  ports: number[]
  timeoutMs?: number
}

/* ── Непрерывный режим (ping -t) ── */

export interface ContinuousStartQuery {
  /** Идентификатор сессии (генерирует renderer). */
  sessionId: string
  host: string
  /** Интервал между пробами, мс. */
  intervalMs?: number
  timeoutMs?: number
}

/** Одна строка живого лога непрерывного пинга. */
export interface ContinuousTick {
  sessionId: string
  seq: number
  timestamp: number
  alive: boolean
  timeMs?: number
}
