import { create } from 'zustand'
import type { TraceHop, TraceMethod, TraceSample } from '@shared/trace-types'

/** Точка графика: время + задержка по выбранному хопу. */
export interface ChartPoint {
  t: number
  ms: number | null
}

interface TracerState {
  target: string
  running: boolean
  method: TraceMethod | null
  resolvedIp?: string
  hops: TraceHop[]
  /** Сэмплы по каждому хопу для графика (ограниченный буфер). */
  samples: Record<number, ChartPoint[]>
  /** Какой хоп показывать на графике (номер). */
  selectedHop: number | null
  sessionId: string | null
  subscribed: boolean
  setTarget: (t: string) => void
  setSelectedHop: (h: number) => void
  subscribe: () => void
  start: () => Promise<void>
  stop: () => Promise<void>
}

const MAX_POINTS = 120

export const useTracerStore = create<TracerState>((set, get) => ({
  target: '',
  running: false,
  method: null,
  resolvedIp: undefined,
  hops: [],
  samples: {},
  selectedHop: null,
  sessionId: null,
  subscribed: false,

  setTarget: (t) => set({ target: t }),
  setSelectedHop: (h) => set({ selectedHop: h }),

  subscribe: () => {
    if (get().subscribed) return
    set({ subscribed: true })
    window.netpulse.tracer.onRoute((ev) => {
      if (ev.sessionId !== get().sessionId) return
      set((state) => ({
        hops: ev.hops,
        method: ev.method,
        resolvedIp: ev.resolvedIp,
        running: ev.monitoring,
        // По умолчанию выбираем последний хоп (конечный узел).
        selectedHop:
          state.selectedHop ?? (ev.hops.length ? ev.hops[ev.hops.length - 1].hop : null)
      }))
    })
    window.netpulse.tracer.onSample((s: TraceSample) => {
      if (s.sessionId !== get().sessionId) return
      set((state) => {
        const arr = state.samples[s.hop] ? [...state.samples[s.hop]] : []
        arr.push({ t: s.timestamp, ms: s.ms })
        if (arr.length > MAX_POINTS) arr.shift()
        return { samples: { ...state.samples, [s.hop]: arr } }
      })
    })
  },

  start: async () => {
    const target = get().target.trim()
    if (!target || get().running) return
    const sessionId = `trace-${Date.now()}`
    set({ sessionId, running: true, hops: [], samples: {}, selectedHop: null, method: null })
    get().subscribe()
    const res = await window.netpulse.tracer.start({ sessionId, target })
    if (!res.ok) set({ running: false })
  },

  stop: async () => {
    const id = get().sessionId
    if (id) await window.netpulse.tracer.stop(id)
    set({ running: false })
  }
}))
