/**
 * Локальный монитор портов/процессов — аналог netstat с именами процессов.
 * Снимок состояния по запросу (не поток): рендерер сам решает, как часто
 * обновлять (см. store/localports.ts — авто-обновление по таймеру).
 *
 * Windows: netstat -ano (порт+PID) + tasklist (PID -> имя процесса).
 * macOS/Linux: lsof -iTCP -sTCP:LISTEN / -iUDP (порт+PID+имя одной командой).
 * Всё best-effort — если утилита недоступна/упала, просто пустой список,
 * не валим страницу.
 */
import { osFamily } from '../adapters/platform'
import { run } from './proc'
import { LocalPortEntry } from '@shared/localports-types'

function splitAddrPort(raw: string): { address: string; port: number } | null {
  const m = /^(.*):(\d+)$/.exec(raw.trim())
  if (!m) return null
  const port = parseInt(m[2], 10)
  if (!Number.isFinite(port)) return null
  return { address: m[1], port }
}

/** Windows: netstat -ano + tasklist для имён процессов. */
async function listWindows(): Promise<LocalPortEntry[]> {
  const [netstatRes, tasklistRes] = await Promise.all([
    run('netstat', ['-ano'], { timeoutMs: 8000 }),
    run('tasklist', ['/fo', 'csv', '/nh'], { timeoutMs: 8000 })
  ])

  const pidToName = new Map<number, string>()
  for (const line of tasklistRes.stdout.split(/\r?\n/)) {
    const m = /^"([^"]*)","(\d+)"/.exec(line)
    if (m) pidToName.set(parseInt(m[2], 10), m[1])
  }

  const entries: LocalPortEntry[] = []
  for (const line of netstatRes.stdout.split(/\r?\n/)) {
    const tokens = line.trim().split(/\s+/)
    if (tokens[0] !== 'TCP' && tokens[0] !== 'UDP') continue

    const protocol = tokens[0] as 'TCP' | 'UDP'
    let local: string | undefined
    let pid: string | undefined

    if (protocol === 'TCP' && tokens.length >= 5) {
      // Proto  Local  Foreign  State  PID
      if (tokens[3] !== 'LISTENING') continue
      local = tokens[1]
      pid = tokens[4]
    } else if (protocol === 'UDP' && tokens.length >= 4) {
      // Proto  Local  Foreign  PID (без State — UDP без соединений)
      local = tokens[1]
      pid = tokens[3]
    } else {
      continue
    }

    const parsed = splitAddrPort(local)
    if (!parsed) continue
    const pidNum = pid ? parseInt(pid, 10) : undefined
    entries.push({
      protocol,
      localAddress: parsed.address,
      port: parsed.port,
      pid: Number.isFinite(pidNum) ? pidNum : undefined,
      processName: pidNum !== undefined ? pidToName.get(pidNum) : undefined
    })
  }
  return entries
}

/** macOS/Linux: lsof, отдельно TCP(LISTEN) и UDP. */
async function listUnixLsof(): Promise<LocalPortEntry[]> {
  const [tcpRes, udpRes] = await Promise.all([
    run('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN'], { timeoutMs: 8000 }),
    run('lsof', ['-nP', '-iUDP'], { timeoutMs: 8000 })
  ])

  const parse = (output: string, protocol: 'TCP' | 'UDP'): LocalPortEntry[] => {
    const out: LocalPortEntry[] = []
    for (const line of output.split(/\r?\n/)) {
      if (!line || line.startsWith('COMMAND')) continue
      const tokens = line.trim().split(/\s+/)
      if (tokens.length < 2) continue
      const processName = tokens[0]
      const pid = parseInt(tokens[1], 10)
      // NAME — последний токен вида "*:80" / "127.0.0.1:80" / "[::1]:80", возможно с "(LISTEN)".
      const nameToken = tokens.find((t) => /:\d+$/.test(t) || /:\d+\(LISTEN\)$/.test(t))
      if (!nameToken) continue
      const clean = nameToken.replace(/\(LISTEN\)$/, '')
      const parsed = splitAddrPort(clean)
      if (!parsed) continue
      out.push({
        protocol,
        localAddress: parsed.address,
        port: parsed.port,
        pid: Number.isFinite(pid) ? pid : undefined,
        processName
      })
    }
    return out
  }

  return [...parse(tcpRes.stdout, 'TCP'), ...parse(udpRes.stdout, 'UDP')]
}

/** Дедуп по (protocol, address, port, pid) — netstat/lsof иногда дублируют строки (v4+v6, несколько fd). */
function dedupe(entries: LocalPortEntry[]): LocalPortEntry[] {
  const seen = new Map<string, LocalPortEntry>()
  for (const e of entries) {
    const key = `${e.protocol}|${e.localAddress}|${e.port}|${e.pid ?? ''}`
    if (!seen.has(key)) seen.set(key, e)
  }
  return [...seen.values()]
}

export async function listLocalPorts(): Promise<LocalPortEntry[]> {
  try {
    const os = osFamily()
    const entries = os === 'win' ? await listWindows() : await listUnixLsof()
    return dedupe(entries).sort((a, b) => a.port - b.port || a.protocol.localeCompare(b.protocol))
  } catch {
    return []
  }
}
