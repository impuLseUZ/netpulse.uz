/**
 * IPC-домен 'portscan': полный сканер TCP-портов.
 * start запускает скан; открытые порты и прогресс идут push-событиями.
 */
import { BrowserWindow } from 'electron'
import { CHANNELS } from '@shared/channels'
import { PortScanHost, PortScanProgress, PortScanQuery } from '@shared/portscan-types'
import { portsForPreset } from '@shared/portscan-presets'
import { cancelPortScan, scanPorts } from '../services/portscanner'
import { getSettings } from '../services/settings'
import { handle } from './handle'

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

export function registerPortScannerIpc(): void {
  handle<void>(CHANNELS.portscan.start, async (arg) => {
    const q = arg as PortScanQuery
    const settings = getSettings()
    const ports = portsForPreset(q.preset, q.customRange)
    await scanPorts(
      q.sessionId,
      q.host,
      ports,
      {
        timeoutMs: q.timeoutMs ?? settings.defaultTimeoutMs,
        // Порт-скан на одном хосте переносит куда более высокую конкурентность,
        // чем host-discovery по подсети — большинство портов закрыты и отвечают
        // мгновенным RST, ждать полный таймаут приходится только для filtered.
        concurrency: q.concurrency ?? Math.max(settings.concurrencyLimit, 200),
        grabBanner: q.grabBanner ?? true
      },
      {
        onHost: (host) => {
          const ev: PortScanHost = host
          broadcast(CHANNELS.portscan.hostEvent, ev)
        },
        onProgress: (progress) => {
          const ev: PortScanProgress = { sessionId: q.sessionId, ...progress }
          broadcast(CHANNELS.portscan.progressEvent, ev)
        }
      }
    )
  })

  handle<void>(CHANNELS.portscan.cancel, (arg) => {
    const q = arg as { sessionId: string }
    cancelPortScan(q.sessionId)
  })
}
