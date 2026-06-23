/**
 * Построение маршрута до цели.
 * Приоритет — raw (net-ping traceRoute, инкремент TTL): точнее и быстрее.
 * Fallback — системный tracert/traceroute с парсингом вывода.
 */
import { tracerouteArgs } from '../adapters/platform'
import { parseTraceOutput } from '../adapters/trace-parse'
import { run } from './proc'
import { TraceMethod } from '@shared/trace-types'

export interface RouteHop {
  hop: number
  ip?: string
}

export interface BuiltRoute {
  hops: RouteHop[]
  method: TraceMethod
}

/**
 * Пытается построить маршрут через raw net-ping.
 * Возвращает null, если модуль недоступен, raw-сокет не открылся,
 * ИЛИ если за отведённое время traceRoute не завершился (нет прав и т.п.).
 */
function buildRaw(
  target: string,
  maxHops: number,
  timeoutMs: number
): Promise<BuiltRoute | null> | null {
  let ping: typeof import('net-ping')
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ping = require('net-ping') as typeof import('net-ping')
  } catch {
    return null // модуль не установлен
  }

  let session: ReturnType<typeof ping.createSession>
  try {
    session = ping.createSession({
      networkProtocol: ping.NetworkProtocol.IPv4,
      timeout: timeoutMs,
      retries: 0,
      ttl: maxHops
    })
  } catch {
    return null // raw-сокет не открылся (нет прав)
  }

  return new Promise<BuiltRoute | null>((resolve) => {
    const hops: RouteHop[] = []
    let settled = false

    const close = (): void => {
      try {
        session.close()
      } catch {
        /* ignore */
      }
    }
    const finish = (result: BuiltRoute | null): void => {
      if (settled) return
      settled = true
      close()
      resolve(result)
    }

    // Защитный таймаут: если traceRoute не завершился (часто без admin) —
    // отменяем raw и отдаём null, чтобы сработал системный fallback.
    const guard = setTimeout(
      () => finish(null),
      maxHops * (timeoutMs + 200) + 2000
    )

    const feedCb = (
      error: (Error & { source?: string }) | null,
      target_: string,
      ttl: number
    ): void => {
      if (error) {
        const source = (error as { source?: string }).source
        hops.push({ hop: ttl, ip: source })
      } else {
        hops.push({ hop: ttl, ip: target_ })
      }
    }
    const doneCb = (): void => {
      clearTimeout(guard)
      hops.sort((a, b) => a.hop - b.hop)
      finish(hops.length > 0 ? { hops, method: 'raw' } : null)
    }

    try {
      session.traceRoute(target, maxHops, feedCb, doneCb)
    } catch {
      clearTimeout(guard)
      finish(null)
    }
  })
}

/** Системный traceroute (всегда доступен). */
async function buildSystem(
  target: string,
  maxHops: number,
  timeoutMs: number
): Promise<BuiltRoute> {
  const { cmd, args } = tracerouteArgs(target, { maxHops, timeoutMs })
  const res = await run(cmd, args, {
    timeoutMs: maxHops * (timeoutMs + 500) + 5000,
    encoding: 'latin1'
  })
  const parsed = parseTraceOutput(res.stdout)
  return { hops: parsed.map((h) => ({ hop: h.hop, ip: h.ip })), method: 'system' }
}

export async function buildRoute(
  target: string,
  maxHops: number,
  timeoutMs: number,
  preferRaw = true
): Promise<BuiltRoute> {
  if (preferRaw) {
    const rawPromise = buildRaw(target, maxHops, timeoutMs)
    if (rawPromise) {
      const result = await rawPromise
      if (result && result.hops.length > 0) return result
      // null или пусто — уходим в системный
    }
  }
  return buildSystem(target, maxHops, timeoutMs)
}