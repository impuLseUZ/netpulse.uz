/**
 * Минимальная декларация типов для пакета 'net-ping' (нет официальных @types).
 */
declare module 'net-ping' {
  export const NetworkProtocol: { IPv4: number; IPv6: number }

  interface SessionOptions {
    networkProtocol?: number
    packetSize?: number
    retries?: number
    sessionId?: number
    timeout?: number
    ttl?: number
  }

  type PingCallback = (
    error: Error | null,
    target: string,
    sent?: Date,
    rcvd?: Date
  ) => void

  type TraceFeedCallback = (
    error: (Error & { source?: string }) | null,
    target: string,
    ttl: number,
    sent: Date,
    rcvd: Date
  ) => void

  type TraceDoneCallback = (error: Error | null, target: string) => void

  interface Session {
    pingHost(target: string, callback: PingCallback): void
    traceRoute(
      target: string,
      maxHopsOrCallback: number | TraceFeedCallback,
      feedCallback: TraceFeedCallback,
      doneCallback: TraceDoneCallback
    ): void
    close(): void
    on(event: string, listener: (...args: unknown[]) => void): void
  }

  export function createSession(options?: SessionOptions): Session

  /** Ошибка превышения TTL — её source содержит IP промежуточного хопа. */
  export class TimeExceededError extends Error {
    source: string
  }
  export class RequestTimedOutError extends Error {}
}
