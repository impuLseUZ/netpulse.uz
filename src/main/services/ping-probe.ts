/**
 * Движок ICMP-пинга для сканера.
 * Приоритет — raw-сокеты (net-ping): быстро, но требует прав администратора
 * и нативной сборки (electron-rebuild). Если raw недоступен (нет модуля /
 * нет прав / ошибка открытия сокета) — fallback на системный ping.
 *
 * SKILL: всегда предусматривать fallback.
 */
import { pingArgs } from '../adapters/platform'
import { parsePingOutput } from '../adapters/ping-parse'
import { run } from './proc'

export type PingMethod = 'raw' | 'system'

export interface PingProbe {
  ping(ip: string): Promise<{ alive: boolean; timeMs?: number }>
  close(): void
  readonly method: PingMethod
}

/** Пытается создать raw-движок через net-ping. null — если недоступен. */
function tryCreateRaw(timeoutMs: number): PingProbe | null {
  try {
    // Динамический require: модуль может отсутствовать/не собраться — это ок.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ping = require('net-ping') as typeof import('net-ping')
    const session = ping.createSession({
      networkProtocol: ping.NetworkProtocol.IPv4,
      timeout: timeoutMs,
      retries: 0
    })
    return {
      method: 'raw',
      ping: (ip: string) =>
        new Promise((resolve) => {
          const start = Date.now()
          session.pingHost(ip, (error) => {
            if (error) resolve({ alive: false })
            else resolve({ alive: true, timeMs: Date.now() - start })
          })
        }),
      close: () => {
        try {
          session.close()
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    return null // модуль не установлен / raw-сокет не открылся
  }
}

/** Системный движок (всегда доступен). */
function createSystem(timeoutMs: number): PingProbe {
  return {
    method: 'system',
    ping: async (ip: string) => {
      const { cmd, args } = pingArgs(ip, timeoutMs)
      const res = await run(cmd, args, { timeoutMs: timeoutMs + 1500, encoding: 'latin1' })
      console.log('[ping raw output]', JSON.stringify(res.stdout))
      const parsed = parsePingOutput(res.stdout, res.code, res.timedOut)
      return { alive: parsed.alive, timeMs: parsed.timeMs }
    },
    close: () => {
      /* нечего закрывать */
    }
  }
}

/** Создаёт движок: raw если возможно, иначе системный. */
export function createPingProbe(timeoutMs: number, preferRaw = true): PingProbe {
  if (preferRaw) {
    const raw = tryCreateRaw(timeoutMs)
    if (raw) return raw
  }
  return createSystem(timeoutMs)
}
