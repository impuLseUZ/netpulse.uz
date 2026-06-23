import { create } from 'zustand'
import {
  AppSettings,
  DEFAULT_SETTINGS,
  PlatformInfo,
  ThemeMode,
  Locale
} from '@shared/types'
import { setLocale } from '@/i18n'

interface AppState {
  settings: AppSettings
  platform: PlatformInfo | null
  loaded: boolean
  init: () => Promise<void>
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
}

/** Применяет тему к <html>: учитывает 'system'. */
function applyTheme(theme: ThemeMode): void {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)
}

export const useAppStore = create<AppState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  platform: null,
  loaded: false,

  init: async () => {
    const [settingsRes, platformRes] = await Promise.all([
      window.netpulse.app.getSettings(),
      window.netpulse.app.getPlatformInfo()
    ])

    const settings = settingsRes.ok ? settingsRes.data : DEFAULT_SETTINGS
    applyTheme(settings.theme)
    setLocale(settings.locale)

    set({
      settings,
      platform: platformRes.ok ? platformRes.data : null,
      loaded: true
    })
  },

  updateSettings: async (patch) => {
    const res = await window.netpulse.app.setSettings(patch)
    const next = res.ok ? res.data : { ...get().settings, ...patch }
    if (patch.theme) applyTheme(next.theme)
    if (patch.locale) setLocale(next.locale as Locale)
    set({ settings: next })
  }
}))
