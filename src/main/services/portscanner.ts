/**
 * Полный сканер TCP-портов. Работает в main process.
 *
 * В отличие от checkPorts() (portcheck.ts, Модуль 4 — небольшой список портов
 * «за один раз»), этот сервис рассчитан на сотни-тысячи портов: отдаёт
 * результаты и прогресс инкрементально (как scanner.ts) и поддерживает отмену.
 *
 * Определение сервиса — двухуровневое: сначала статическая таблица известных
 * портов (serviceForPort), затем, если включён grabBanner, короткая попытка
 * прочитать баннер, который сервер присылает сам (SSH/FTP/SMTP/POP3/IMAP
 * делают это сразу после connect) — даёт точную версию вместо простой догадки.
 */
import net from 'node:net'
import pLimit from 'p-limit'
import { serviceForPort } from '@shared/pingport-types'
import { PortScanHost, PortScanProgress, PortScanStatus } from '@shared/portscan-types'
import { checkTcp } from './portcheck'

const BANNER_WAIT_MS = 400
const BANNER_MAX_BYTES = 160

interface PortScanCallbacks {
  onHost: (host: PortScanHost) => void
  onProgress: (progress: Omit<PortScanProgress, 'sessionId'>) => void
}

interface ActiveScan {
  cancelled: boolean
}

const activeScans = new Map<string, ActiveScan>()

/** Ждёт короткое время данные, которые сервер присылает сам после connect. */
function grabBanner(host: string, port: number): Promise<string | undefined> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let resolved = false
    const finish = (banner?: string): void => {
      if (resolved) return
      resolved = true
      socket.destroy()
      resolve(banner)
    }
    socket.setTimeout(BANNER_WAIT_MS)
    socket.once('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8', 0, Math.min(chunk.length, BANNER_MAX_BYTES))
      // eslint-disable-next-line no-control-regex
      finish(text.replace(/[\x00-\x09\x0b-\x1f]/g, '').trim() || undefined)
    })
    socket.once('timeout', () => finish(undefined))
    socket.once('error', () => finish(undefined))
    socket.connect(port, host)
  })
}

export async function scanPorts(
  sessionId: string,
  host: string,
  ports: number[],
  opts: { timeoutMs: number; concurrency: number; grabBanner: boolean },
  cb: PortScanCallbacks
): Promise<void> {
  const target = host.trim()
  if (!target) throw new Error('Пустой хост')
  if (ports.length === 0) throw new Error('Пустой список портов')

  const state: ActiveScan = { cancelled: false }
  activeScans.set(sessionId, state)
  const limit = pLimit(Math.max(1, opts.concurrency))

  let scanned = 0
  let openCount = 0
  const total = ports.length

  const emitProgress = (done = false): void => {
    cb.onProgress({ scanned, total, openCount, done })
  }
  emitProgress()

  const scanOne = async (port: number): Promise<void> => {
    if (state.cancelled) return
    const r = await checkTcp(target, port, opts.timeoutMs)
    scanned++
    if (r.status === 'open') {
      openCount++
      let banner: string | undefined
      if (opts.grabBanner) banner = await grabBanner(target, port)
      cb.onHost({
        sessionId,
        port,
        status: r.status as PortScanStatus,
        timeMs: r.timeMs,
        service: serviceForPort(port),
        banner
      })
    }
    if (scanned % 20 === 0 || scanned === total) emitProgress()
  }

  try {
    await Promise.all(ports.map((p) => limit(() => scanOne(p))))
  } finally {
    emitProgress(true)
    activeScans.delete(sessionId)
  }
}

export function cancelPortScan(sessionId: string): void {
  const s = activeScans.get(sessionId)
  if (s) s.cancelled = true
}
