import { create } from 'zustand'
import type { ScanHost, ScanProgress } from '@shared/scanner-types'

interface ScannerState {
  range: string
  running: boolean
  hosts: Record<string, ScanHost> // ключ — IP, для мёржа
  progress: ScanProgress | null
  sessionId: string | null
  subscribed: boolean
  setRange: (r: string) => void
  init: () => Promise<void>
  start: () => Promise<void>
  cancel: () => Promise<void>
  subscribe: () => void
}

export const useScannerStore = create<ScannerState>((set, get) => ({
  range: '',
  running: false,
  hosts: {},
  progress: null,
  sessionId: null,
  subscribed: false,

  setRange: (r) => set({ range: r }),

  init: async () => {
    if (!get().range) {
      const res = await window.netpulse.scanner.detectSubnet()
      if (res.ok && res.data) set({ range: res.data.cidr })
    }
  },

  subscribe: () => {
    if (get().subscribed) return
    set({ subscribed: true })
    window.netpulse.scanner.onHost((ev) => {
      if (ev.sessionId !== get().sessionId) return
      set((state) => {
        const prev = state.hosts[ev.host.ip]
        // Мёрж: новые непустые поля перекрывают старые.
        const merged: ScanHost = { ...prev, ...ev.host }
        if (prev) {
          merged.hostname = ev.host.hostname ?? prev.hostname
          merged.mac = ev.host.mac ?? prev.mac
          merged.vendor = ev.host.vendor ?? prev.vendor
          merged.timeMs = ev.host.timeMs ?? prev.timeMs
        }
        return { hosts: { ...state.hosts, [ev.host.ip]: merged } }
      })
    })
    window.netpulse.scanner.onProgress((ev) => {
      if (ev.sessionId !== get().sessionId) return
      set({ progress: ev })
      if (ev.done) set({ running: false })
    })
  },

  start: async () => {
    const range = get().range.trim()
    if (!range || get().running) return
    const sessionId = `scan-${Date.now()}`
    set({ sessionId, running: true, hosts: {}, progress: null })
    get().subscribe()
    const res = await window.netpulse.scanner.start({ sessionId, range, resolveNames: true })
    if (!res.ok) set({ running: false })
  },

  cancel: async () => {
    const id = get().sessionId
    if (id) await window.netpulse.scanner.cancel(id)
    set({ running: false })
  }
}))
