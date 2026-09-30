import { create } from 'zustand'
import type { PortScanHost, PortScanProgress } from '@shared/portscan-types'
import type { PortScanPreset } from '@shared/portscan-presets'

interface PortScannerState {
  host: string
  preset: PortScanPreset
  customRange: string
  grabBanner: boolean
  running: boolean
  hosts: Record<number, PortScanHost> // ключ — порт
  progress: PortScanProgress | null
  sessionId: string | null
  subscribed: boolean
  setHost: (h: string) => void
  setPreset: (p: PortScanPreset) => void
  setCustomRange: (r: string) => void
  setGrabBanner: (v: boolean) => void
  subscribe: () => void
  start: () => Promise<void>
  cancel: () => Promise<void>
}

export const usePortScannerStore = create<PortScannerState>((set, get) => ({
  host: '',
  preset: 'top',
  customRange: '',
  grabBanner: true,
  running: false,
  hosts: {},
  progress: null,
  sessionId: null,
  subscribed: false,

  setHost: (h) => set({ host: h }),
  setPreset: (p) => set({ preset: p }),
  setCustomRange: (r) => set({ customRange: r }),
  setGrabBanner: (v) => set({ grabBanner: v }),

  subscribe: () => {
    if (get().subscribed) return
    set({ subscribed: true })
    window.netpulse.portscan.onHost((ev: PortScanHost) => {
      if (ev.sessionId !== get().sessionId) return
      set((state) => ({ hosts: { ...state.hosts, [ev.port]: ev } }))
    })
    window.netpulse.portscan.onProgress((ev: PortScanProgress) => {
      if (ev.sessionId !== get().sessionId) return
      set({ progress: ev })
      if (ev.done) set({ running: false })
    })
  },

  start: async () => {
    const host = get().host.trim()
    if (!host || get().running) return
    const { preset, customRange, grabBanner } = get()
    if (preset === 'custom' && !customRange.trim()) return
    const sessionId = `portscan-${Date.now()}`
    set({ sessionId, running: true, hosts: {}, progress: null })
    get().subscribe()
    const res = await window.netpulse.portscan.start({
      sessionId, host, preset, customRange: customRange.trim() || undefined, grabBanner
    })
    if (!res.ok) set({ running: false })
  },

  cancel: async () => {
    const id = get().sessionId
    if (id) await window.netpulse.portscan.cancel(id)
    set({ running: false })
  }
}))
