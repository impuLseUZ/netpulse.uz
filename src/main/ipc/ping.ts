/**
 * IPC-домен 'ping': разовый ping, проверка TCP-портов, непрерывный режим (Модуль 4).
 * Непрерывный режим шлёт тики push-событием ping:tick во все окна.
 */
import { BrowserWindow } from 'electron'
import { CHANNELS } from '@shared/channels'
import {
  ContinuousStartQuery,
  PortCheckQuery,
  PingResult,
  PortResult
} from '@shared/pingport-types'
import { checkPorts } from '../services/portcheck'
import { pingOnce, startContinuous, stopContinuous } from '../services/ping'
import { getSettings } from '../services/settings'
import { handle } from './handle'

export function registerPingIpc(): void {
  handle<PingResult>(CHANNELS.ping.once, (arg) => {
    const q = arg as { host: string; timeoutMs?: number }
    return pingOnce(q.host, q.timeoutMs ?? getSettings().defaultTimeoutMs)
  })

  handle<PortResult[]>(CHANNELS.ping.checkPorts, (arg) => {
    const q = arg as PortCheckQuery
    const settings = getSettings()
    return checkPorts(
      q.host,
      q.ports,
      q.timeoutMs ?? settings.defaultTimeoutMs,
      settings.concurrencyLimit
    )
  })

  handle<void>(CHANNELS.ping.startContinuous, (arg) => {
    const q = arg as ContinuousStartQuery
    const settings = getSettings()
    startContinuous(
      q.sessionId,
      q.host,
      q.intervalMs ?? 1000,
      q.timeoutMs ?? settings.defaultTimeoutMs,
      (tick) => {
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send(CHANNELS.ping.tickEvent, tick)
        }
      }
    )
  })

  handle<void>(CHANNELS.ping.stopContinuous, (arg) => {
    const q = arg as { sessionId: string }
    stopContinuous(q.sessionId)
  })
}
