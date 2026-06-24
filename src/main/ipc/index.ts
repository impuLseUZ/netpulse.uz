/**
 * Регистрация всех IPC-доменов.
 */
import { registerAppIpc } from './app'
import { registerUpdaterIpc } from './updater'
import { registerDnsIpc } from './dns'
import { registerPingIpc } from './ping'
import { registerScannerIpc } from './scanner'
import { registerTracerIpc } from './tracer'
import { registerSpeedtestIpc } from './speedtest'
import { registerNetinfoIpc } from './netinfo'
import { registerSshIpc } from './ssh'

export function registerAllIpc(): void {
  registerAppIpc()
  registerUpdaterIpc()
  registerDnsIpc()
  registerPingIpc()
  registerScannerIpc()
  registerTracerIpc()
  registerSpeedtestIpc()
  registerNetinfoIpc()
  registerSshIpc()
}
