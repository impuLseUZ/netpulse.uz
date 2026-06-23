/**
 * IPC-домен 'scanner' (Модуль 1).
 * start запускает sweep; хосты и прогресс идут push-событиями в renderer.
 */
import { BrowserWindow } from 'electron'
import { CHANNELS } from '@shared/channels'
import { LocalSubnet, ScanHostEvent, ScanProgress, ScanQuery } from '@shared/scanner-types'
import { detectLocalSubnet } from '../adapters/local-subnet'
import { cancelScan, runScan } from '../services/scanner'
import { getSettings } from '../services/settings'
import { handle } from './handle'

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

export function registerScannerIpc(): void {
  handle<LocalSubnet | null>(CHANNELS.scanner.detectSubnet, () => detectLocalSubnet())

  handle<void>(CHANNELS.scanner.start, async (arg) => {
    const q = arg as ScanQuery
    const settings = getSettings()
    await runScan(
      q.sessionId,
      q.range,
      {
        timeoutMs: q.timeoutMs ?? settings.defaultTimeoutMs,
        concurrency: q.concurrency ?? settings.concurrencyLimit,
        resolveNames: q.resolveNames ?? true,
        preferRaw: true
      },
      {
        onHost: (host) => {
          const ev: ScanHostEvent = { sessionId: q.sessionId, host }
          broadcast(CHANNELS.scanner.hostEvent, ev)
        },
        onProgress: (progress) => {
          const ev: ScanProgress = { sessionId: q.sessionId, ...progress }
          broadcast(CHANNELS.scanner.progressEvent, ev)
        }
      }
    )
  })

  handle<void>(CHANNELS.scanner.cancel, (arg) => {
    const q = arg as { sessionId: string }
    cancelScan(q.sessionId)
  })
}
