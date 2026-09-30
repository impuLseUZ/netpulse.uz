/**
 * Типы для локального монитора портов/процессов (netstat-вьюер).
 */
export type LocalPortProtocol = 'TCP' | 'UDP'

export interface LocalPortEntry {
  protocol: LocalPortProtocol
  localAddress: string
  port: number
  pid?: number
  processName?: string
}
