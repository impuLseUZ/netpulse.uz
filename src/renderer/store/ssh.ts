/**
 * Zustand-стор SSH-модуля (Модуль 8).
 *
 * Хранит:
 *  - список профилей (без паролей/ключей)
 *  - список активных сессий
 *  - id активной вкладки
 *
 * Подписки на push-события (ssh:data, ssh:status) регистрируются один раз
 * в методе subscribeEvents() и привязываются к конкретным sessionId.
 */
import { create } from 'zustand'
import type { SshProfilePublic, SshSession, SshSessionStatus } from '@shared/ssh-types'

interface SshState {
  /** Все сохранённые профили. */
  profiles: SshProfilePublic[]
  /** Активные (открытые) сессии-вкладки. */
  sessions: SshSession[]
  /** sessionId активной вкладки. */
  activeSessionId: string | null
  /** Подписки зарегистрированы? */
  subscribed: boolean

  // ── Действия ────────────────────────────────────────────────────────────
  /** Загрузить профили из main. */
  loadProfiles: () => Promise<void>
  /** Открыть новую сессию по профилю. */
  openSession: (profileId: string, password?: string, privateKey?: string) => Promise<void>
  /** Закрыть сессию. */
  closeSession: (sessionId: string) => Promise<void>
  /** Переключить активную вкладку. */
  setActiveSession: (sessionId: string) => void
  /** Зарегистрировать push-подписки. */
  subscribeEvents: () => void
  /** Внутренний апдейт статуса сессии. */
  _updateStatus: (sessionId: string, status: SshSessionStatus, error?: string) => void
}

export const useSshStore = create<SshState>((set, get) => ({
  profiles: [],
  sessions: [],
  activeSessionId: null,
  subscribed: false,

  loadProfiles: async () => {
    const res = await window.netpulse.ssh.listProfiles()
    if (res.ok) {
      // Сортируем: недавно подключённые сверху.
      const sorted = [...res.data].sort(
        (a, b) => (b.lastConnectedAt ?? 0) - (a.lastConnectedAt ?? 0)
      )
      set({ profiles: sorted })
    }
  },

  openSession: async (profileId, password, privateKey) => {
    const profile = get().profiles.find((p) => p.id === profileId)
    if (!profile) return

    const sessionId = `ssh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    const newSession: SshSession = {
      sessionId,
      profileId,
      label: profile.label,
      host: profile.host,
      status: 'connecting',
    }

    set((s) => ({
      sessions: [...s.sessions, newSession],
      activeSessionId: sessionId,
    }))

    get().subscribeEvents()

    await window.netpulse.ssh.connect({ sessionId, profileId, password, privateKey })
  },

  closeSession: async (sessionId) => {
    await window.netpulse.ssh.disconnect(sessionId)
    set((s) => {
      const remaining = s.sessions.filter((x) => x.sessionId !== sessionId)
      const nextActive =
        s.activeSessionId === sessionId
          ? (remaining[remaining.length - 1]?.sessionId ?? null)
          : s.activeSessionId
      return { sessions: remaining, activeSessionId: nextActive }
    })
  },

  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

  subscribeEvents: () => {
    if (get().subscribed) return
    set({ subscribed: true })

    window.netpulse.ssh.onStatus((ev: import('@shared/ssh-types').SshStatusEvent) => {
      get()._updateStatus(ev.sessionId, ev.status, ev.error)
    })

    // onData обрабатывается напрямую в компоненте терминала через ref,
    // чтобы не гонять PTY-данные через React state (слишком высокая частота).
  },

  _updateStatus: (sessionId, status, error) => {
    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.sessionId === sessionId ? { ...sess, status, error } : sess
      ),
    }))
  },
}))
