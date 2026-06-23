/**
 * Ping-сервис (Модуль 4). Работает в main process.
 * Системный ping через адаптер (spawn массивом, без shell).
 * Разовый ping + непрерывный режим (ping -t-подобный) с колбэком на каждый тик.
 */
import { pingArgs } from '../adapters/platform'
import { parsePingOutput } from '../adapters/ping-parse'
import { run } from './proc'
import { PingResult, ContinuousTick } from '@shared/pingport-types'

/** Один ICMP-пинг (1 пакет). */
export async function pingOnce(host: string, timeoutMs = 1000): Promise<PingResult> {
  const { cmd, args } = pingArgs(host, timeoutMs)
  // Кодировка latin1 на Windows помогает с кириллицей в выводе ping.
  const res = await run(cmd, args, { timeoutMs: timeoutMs + 2000, encoding: 'latin1' })
  const parsed = parsePingOutput(res.stdout, res.code, res.timedOut)
  return {
    host,
    alive: parsed.alive,
    timeMs: parsed.timeMs,
    min: parsed.min,
    avg: parsed.avg,
    max: parsed.max,
    lossPercent: parsed.lossPercent,
    raw: res.stdout
  }
}

/** Активные непрерывные сессии: sessionId -> таймер. */
const sessions = new Map<string, NodeJS.Timeout>()

/**
 * Запускает непрерывный пинг. На каждый ответ вызывает onTick.
 */
export function startContinuous(
  sessionId: string,
  host: string,
  intervalMs: number,
  timeoutMs: number,
  onTick: (tick: ContinuousTick) => void
): void {
  stopContinuous(sessionId)
  let seq = 0
  let busy = false

  const tick = async (): Promise<void> => {
    if (busy) return
    busy = true
    const current = ++seq
    try {
      const r = await pingOnce(host, timeoutMs)
      onTick({
        sessionId,
        seq: current,
        timestamp: Date.now(),
        alive: r.alive,
        timeMs: r.timeMs
      })
    } finally {
      busy = false
    }
  }

  void tick()
  const timer = setInterval(() => void tick(), intervalMs)
  sessions.set(sessionId, timer)
}

export function stopContinuous(sessionId: string): void {
  const timer = sessions.get(sessionId)
  if (timer) {
    clearInterval(timer)
    sessions.delete(sessionId)
  }
}

/** Остановить все сессии (при закрытии окна). */
export function stopAllContinuous(): void {
  for (const timer of sessions.values()) clearInterval(timer)
  sessions.clear()
}
