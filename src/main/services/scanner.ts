/**
 * Сервис сканера сети (Модуль 1). Работает в main process.
 * Ping-sweep по списку IP с ограничением concurrency (p-limit).
 * Живые хосты обогащаются: reverse DNS (имя), MAC из ARP, вендор по OUI.
 * Результаты отдаются инкрементально через колбэки onHost/onProgress.
 *
 * Тяжесть операции здесь — это сетевое ожидание (I/O), а не CPU, поэтому
 * асинхронный пул в main не блокирует event loop и UI остаётся отзывчивым.
 * Системный ping идёт через child_process; raw — через net-ping (асинхронно).
 */
import { promises as dns } from 'node:dns'
import pLimit from 'p-limit'
import { parseRange } from '@shared/scan-range'
import { ScanHost, ScanProgress } from '@shared/scanner-types'
import { createPingProbe, PingMethod } from './ping-probe'
import { readArpTable } from '../adapters/arp'
import { vendorForMac } from '../adapters/oui'

interface ScanCallbacks {
  onHost: (host: ScanHost) => void
  onProgress: (progress: Omit<ScanProgress, 'sessionId'>) => void
}

interface ActiveScan {
  cancelled: boolean
}

const activeScans = new Map<string, ActiveScan>()

/** Reverse DNS с мягкой обработкой ошибок. */
async function reverseDns(ip: string): Promise<string | undefined> {
  try {
    const names = await dns.reverse(ip)
    return names[0]
  } catch {
    return undefined
  }
}

export async function runScan(
  sessionId: string,
  range: string,
  opts: { timeoutMs: number; concurrency: number; resolveNames: boolean; preferRaw: boolean },
  cb: ScanCallbacks
): Promise<void> {
  const ips = parseRange(range)
  const state: ActiveScan = { cancelled: false }
  activeScans.set(sessionId, state)

  const probe = createPingProbe(opts.timeoutMs, opts.preferRaw)
  const method: PingMethod = probe.method
  const limit = pLimit(Math.max(1, opts.concurrency))

  let scanned = 0
  let found = 0
  const total = ips.length

  const emitProgress = (done = false): void => {
    cb.onProgress({ total, scanned, found, done, method })
  }
  emitProgress()

  const scanOne = async (ip: string): Promise<void> => {
    if (state.cancelled) return
    const r = await probe.ping(ip)
    scanned++
    if (r.alive) {
      found++
      const host: ScanHost = { ip, alive: true, timeMs: r.timeMs }
      // Имя резолвим параллельно (не блокируем дальнейший sweep).
      if (opts.resolveNames) {
        host.hostname = await reverseDns(ip)
      }
      cb.onHost(host)
    }
    // Прогресс шлём не на каждый адрес, чтобы не залить renderer.
    if (scanned % 8 === 0 || scanned === total) emitProgress()
  }

  try {
    await Promise.all(ips.map((ip) => limit(() => scanOne(ip))))

    // После sweep — разово читаем ARP-таблицу и дополняем MAC/вендор.
    // (ARP заполняется ядром по факту общения с хостами во время пинга.)
    if (!state.cancelled) {
      const arp = await readArpTable()
      for (const [ip, mac] of arp) {
        // Дополняем уже найденные живые хосты MAC-ом и вендором.
        cb.onHost({
          ip,
          alive: true,
          mac,
          vendor: vendorForMac(mac)
        })
      }
    }
  } finally {
    probe.close()
    emitProgress(true)
    activeScans.delete(sessionId)
  }
}

export function cancelScan(sessionId: string): void {
  const s = activeScans.get(sessionId)
  if (s) s.cancelled = true
}
