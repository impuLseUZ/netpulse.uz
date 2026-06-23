import { create } from 'zustand'
import type { ModuleId } from '@/lib/nav'

interface NavState {
  active: ModuleId
  setActive: (id: ModuleId) => void
}

export const useNavStore = create<NavState>((set) => ({
  active: 'scanner',
  setActive: (id) => set({ active: id })
}))
