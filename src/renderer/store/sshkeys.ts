import { create } from 'zustand'
import type { SshKeyMeta, SshKeyGenerateQuery, SshKeyImportQuery } from '@shared/sshkeys-types'

interface SshKeysState {
  keys: SshKeyMeta[]
  loading: boolean
  error: string | null
  load: () => Promise<void>
  generate: (q: SshKeyGenerateQuery) => Promise<SshKeyMeta | null>
  importKey: (q: SshKeyImportQuery) => Promise<SshKeyMeta | null>
  deleteKey: (id: string) => Promise<void>
}

export const useSshKeysStore = create<SshKeysState>((set, get) => ({
  keys: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true })
    const res = await window.netpulse.sshkeys.list()
    set({ loading: false, keys: res.ok ? res.data : get().keys })
  },

  generate: async (q) => {
    set({ error: null })
    const res = await window.netpulse.sshkeys.generate(q)
    if (!res.ok) {
      set({ error: res.error.message })
      return null
    }
    set((s) => ({ keys: [res.data, ...s.keys] }))
    return res.data
  },

  importKey: async (q) => {
    set({ error: null })
    const res = await window.netpulse.sshkeys.import(q)
    if (!res.ok) {
      set({ error: res.error.message })
      return null
    }
    set((s) => ({ keys: [res.data, ...s.keys] }))
    return res.data
  },

  deleteKey: async (id) => {
    const res = await window.netpulse.sshkeys.delete(id)
    if (res.ok) set((s) => ({ keys: s.keys.filter((k) => k.id !== id) }))
  }
}))
