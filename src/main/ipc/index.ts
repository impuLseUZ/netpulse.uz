/**
 * Регистрация всех IPC-доменов.
 */
import { registerAppIpc } from './app'
import { registerUpdaterIpc } from './updater'
import { registerDnsIpc } from './dns'
import { registerPingIpc } from './ping'
import { registerScannerIpc } from './scanner'
import { registerTracerIpc } from './tracer'

export function registerAllIpc(): void {
  registerAppIpc()
  registerUpdaterIpc()
  registerDnsIpc()
  registerPingIpc()
  registerScannerIpc()
  registerTracerIpc()
}
