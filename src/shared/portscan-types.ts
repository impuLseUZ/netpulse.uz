import type { PortScanPreset } from './portscan-presets'

export interface PortScanQuery {
  sessionId: string
  host: string
  preset: PortScanPreset
  /** Для preset === 'custom': "22,80,443,8000-8010". */
  customRange?: string
  timeoutMs?: number
  concurrency?: number
  /** Пытаться прочитать баннер сервиса после успешного connect. */
  grabBanner?: boolean
}

export type PortScanStatus = 'open' | 'closed' | 'filtered'

export interface PortScanHost {
  sessionId: string
  port: number
  status: PortScanStatus
  timeMs?: number
  service?: string
  banner?: string
}

export interface PortScanProgress {
  sessionId: string
  scanned: number
  total: number
  openCount: number
  done: boolean
}
