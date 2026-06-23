/**
 * IPC-домен 'tracer' (Модуль 2).
 * start строит маршрут и запускает мониторинг; маршрут и сэмплы идут
 * push-событиями в renderer.
 */
import { BrowserWindow } from 'electron'
import { CHANNELS } from '@shared/channels'
import { TraceRouteEvent, TraceSample, TraceStartQuery } from '@shared/trace-types'
import { startTrace, stopTrace } from '../services/trace'
import { getSettings } from '../services/settings'
import { handle } from './handle'

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

export function registerTracerIpc(): void {
  handle<void>(CHANNELS.tracer.start, async (arg) => {
    const q = arg as TraceStartQuery
    const settings = getSettings()
    await startTrace(
      q.sessionId,
      q.target,
      {
        maxHops: q.maxHops ?? 30,
        intervalMs: q.intervalMs ?? 2500,
        timeoutMs: q.timeoutMs ?? settings.defaultTimeoutMs,
        resolveNames: q.resolveNames ?? true,
        preferRaw: true
      },
      {
        onRoute: (data) => {
          const ev: TraceRouteEvent = { sessionId: q.sessionId, target: q.target, ...data }
          broadcast(CHANNELS.tracer.routeEvent, ev)
        },
        onSample: (sample) => {
          const ev: TraceSample = { sessionId: q.sessionId, ...sample }
          broadcast(CHANNELS.tracer.sampleEvent, ev)
        }
      }
    )
  })

  handle<void>(CHANNELS.tracer.stop, (arg) => {
    const q = arg as { sessionId: string }
    stopTrace(q.sessionId)
  })
}
