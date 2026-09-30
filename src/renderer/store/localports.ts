import { create } from 'zustand'
import type { LocalPortEntry } from '@shared/localports-types'

interface LocalPortsState {
  entries: LocalPortEntry[]
  loading: boolean
  autoRefresh: boolean
  lastUpdated: number | null
  setAutoRefresh: (v: boolean) => void
  refresh: () => Promise<void>
}

export const useLocalPortsStore = create<LocalPortsState>((set, get) => ({
  entries: [],
  loading: false,
  autoRefresh: false,
  lastUpdated: null,

  setAutoRefresh: (v) => set({ autoRefresh: v }),

  refresh: async () => {
    if (get().loading) return
    set({ loading: true })
    const res = await window.netpulse.localports.list()
    set({
      loading: false,
      lastUpdated: Date.now(),
      entries: res.ok ? res.data : get().entries
    })
  }
}))
