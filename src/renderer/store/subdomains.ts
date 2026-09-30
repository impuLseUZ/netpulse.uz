import { create } from 'zustand'
import type { SubdomainHost, SubdomainProgress } from '@shared/subdomains-types'

interface SubdomainsState {
  domain: string
  extraWords: string
  useCrtSh: boolean
  useBruteforce: boolean
  running: boolean
  hosts: Record<string, SubdomainHost> // ключ — subdomain, для мёржа
  progress: SubdomainProgress | null
  /** Ошибка crt.sh за текущий запуск — отдельно от progress, который перезаписывается фазой DNS. */
  crtShError: string | null
  sessionId: string | null
  subscribed: boolean
  setDomain: (d: string) => void
  setExtraWords: (w: string) => void
  setUseCrtSh: (v: boolean) => void
  setUseBruteforce: (v: boolean) => void
  subscribe: () => void
  start: () => Promise<void>
  cancel: () => Promise<void>
}

export const useSubdomainsStore = create<SubdomainsState>((set, get) => ({
  domain: '',
  extraWords: '',
  useCrtSh: true,
  useBruteforce: true,
  running: false,
  hosts: {},
  progress: null,
  crtShError: null,
  sessionId: null,
  subscribed: false,

  setDomain: (d) => set({ domain: d }),
  setExtraWords: (w) => set({ extraWords: w }),
  setUseCrtSh: (v) => set({ useCrtSh: v }),
  setUseBruteforce: (v) => set({ useBruteforce: v }),

  subscribe: () => {
    if (get().subscribed) return
    set({ subscribed: true })
    window.netpulse.subdomains.onHost((ev: SubdomainHost) => {
      if (ev.sessionId !== get().sessionId) return
      set((state) => ({ hosts: { ...state.hosts, [ev.subdomain]: ev } }))
    })
    window.netpulse.subdomains.onProgress((ev: SubdomainProgress) => {
      if (ev.sessionId !== get().sessionId) return
      set({ progress: ev })
      if (ev.error) set({ crtShError: ev.error })
      if (ev.done) set({ running: false })
    })
  },

  start: async () => {
    const domain = get().domain.trim()
    if (!domain || get().running) return
    const { useCrtSh, useBruteforce, extraWords } = get()
    if (!useCrtSh && !useBruteforce) return
    const words = extraWords
      .split(/[,\s]+/)
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean)
    const sessionId = `subdomains-${Date.now()}`
    set({ sessionId, running: true, hosts: {}, progress: null, crtShError: null })
    get().subscribe()
    const res = await window.netpulse.subdomains.start({
      sessionId, domain, useCrtSh, useBruteforce,
      extraWords: words.length > 0 ? words : undefined
    })
    if (!res.ok) set({ running: false })
  },

  cancel: async () => {
    const id = get().sessionId
    if (id) await window.netpulse.subdomains.cancel(id)
    set({ running: false })
  }
}))
