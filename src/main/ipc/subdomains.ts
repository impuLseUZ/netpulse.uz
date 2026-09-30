/**
 * IPC-домен 'subdomains': поиск через CT-логи + DNS-перебор.
 * start запускает поиск; найденные поддомены и прогресс идут push-событиями.
 */
import { BrowserWindow } from 'electron'
import { CHANNELS } from '@shared/channels'
import { SubdomainHost, SubdomainProgress, SubdomainQuery } from '@shared/subdomains-types'
import { cancelSubdomainSearch, findSubdomains } from '../services/subdomains'
import { getSettings } from '../services/settings'
import { handle } from './handle'

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

export function registerSubdomainsIpc(): void {
  handle<void>(CHANNELS.subdomains.start, async (arg) => {
    const q = arg as SubdomainQuery
    const settings = getSettings()
    await findSubdomains(
      q.sessionId,
      q.domain,
      {
        useCrtSh: q.useCrtSh,
        useBruteforce: q.useBruteforce,
        concurrency: q.concurrency ?? settings.concurrencyLimit,
        timeoutMs: q.timeoutMs ?? settings.defaultTimeoutMs,
        extraWords: q.extraWords
      },
      {
        onHost: (host) => {
          const ev: SubdomainHost = host
          broadcast(CHANNELS.subdomains.hostEvent, ev)
        },
        onProgress: (progress) => {
          const ev: SubdomainProgress = { sessionId: q.sessionId, ...progress }
          broadcast(CHANNELS.subdomains.progressEvent, ev)
        }
      }
    )
  })

  handle<void>(CHANNELS.subdomains.cancel, (arg) => {
    const q = arg as { sessionId: string }
    cancelSubdomainSearch(q.sessionId)
  })
}
