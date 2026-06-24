import { create } from 'zustand'
import type { UpdateState } from '@shared/types'

interface UpdaterState {
  state: UpdateState
  /** Пользователь скрыл баннер для текущей версии. */
  dismissed: boolean
  init: () => Promise<void>
  check: () => Promise<void>
  dismiss: () => void
}

export const useUpdaterStore = create<UpdaterState>((set) => ({
  state: { status: 'idle' },
  dismissed: false,

  init: async () => {
    const res = await window.netpulse.updater.getState()
    if (res.ok) set({ state: res.data })
    window.netpulse.updater.onState((state: UpdateState) =>
      set((prev) => ({
        state,
        // Новая доступная версия — снова показываем баннер.
        dismissed: state.status === 'available' ? false : prev.dismissed,
      }))
    )
  },

  check: async () => {
    await window.netpulse.updater.check()
  },

  dismiss: () => set({ dismissed: true }),
}))