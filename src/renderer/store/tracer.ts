/**
 * Zustand store модуля Трассировка (Модуль 2).
 *
 * Изменения v2:
 * - Убраны samples и selectedHop (график удалён из UI).
 * - Исправлен баг повторной подписки: unsubscribe-функции теперь хранятся
 *   и вызываются при stop(), чтобы старые слушатели не накапливались.
 * - Добавлено поле error для отображения ошибки запуска.
 * - Добавлен lastUpdated для отображения времени последнего обновления.
 */
import { create } from 'zustand'
import type { TraceHop, TraceMethod } from '@shared/trace-types'

interface TracerState {
  target: string
  running: boolean
  method: TraceMethod | null
  resolvedIp?: string
  hops: TraceHop[]
  error: string | null
  lastUpdated: number | null
  sessionId: string | null

  setTarget: (t: string) => void
  start: () => Promise<void>
  stop: () => Promise<void>
  reset: () => void
}

/** Функции отписки от IPC-событий (хранятся между вызовами). */
let unsubRoute: (() => void) | null = null
let unsubSample: (() => void) | null = null

function cleanupSubscriptions(): void {
  if (unsubRoute) { unsubRoute(); unsubRoute = null }
  if (unsubSample) { unsubSample(); unsubSample = null }
}

export const useTracerStore = create<TracerState>((set, get) => ({
  target: '',
  running: false,
  method: null,
  resolvedIp: undefined,
  hops: [],
  error: null,
  lastUpdated: null,
  sessionId: null,

  setTarget: (t) => set({ target: t }),

  reset: () => {
    cleanupSubscriptions()
    set({
      running: false,
      method: null,
      resolvedIp: undefined,
      hops: [],
      error: null,
      lastUpdated: null,
      sessionId: null,
    })
  },

  start: async () => {
    const target = get().target.trim()
    if (!target || get().running) return

    // Останавливаем предыдущую сессию если была
    const prevId = get().sessionId
    if (prevId) {
      await window.netpulse.tracer.stop(prevId)
    }
    cleanupSubscriptions()

    const sessionId = `trace-${Date.now()}`
    set({
      sessionId,
      running: true,
      hops: [],
      error: null,
      lastUpdated: null,
      method: null,
      resolvedIp: undefined,
    })

    // Подписываемся на события — сохраняем unsubscribe-функции
    unsubRoute = window.netpulse.tracer.onRoute((ev) => {
      if (ev.sessionId !== get().sessionId) return
      set({
        hops: ev.hops,
        method: ev.method,
        resolvedIp: ev.resolvedIp,
        running: ev.monitoring,
        lastUpdated: Date.now(),
      })
      if (!ev.monitoring) {
        cleanupSubscriptions()
      }
    })

    // onSample больше не нужен для графика, но оставляем подписку
    // чтобы не накапливались необработанные события в IPC-очереди
    unsubSample = window.netpulse.tracer.onSample((_s) => {
      // данные сэмплов игнорируем — график удалён
    })

    const res = await window.netpulse.tracer.start({ sessionId, target })
    if (!res.ok) {
      cleanupSubscriptions()
      set({
        running: false,
        error: res.error?.message ?? 'Ошибка запуска трассировки',
      })
    }
  },

  stop: async () => {
    const id = get().sessionId
    cleanupSubscriptions()
    if (id) await window.netpulse.tracer.stop(id)
    set({ running: false })
  },
}))