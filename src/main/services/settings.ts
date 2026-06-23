/**
 * Персист настроек через electron-store (JSON-файл в userData).
 */
import Store from 'electron-store'
import { AppSettings, DEFAULT_SETTINGS } from '@shared/types'

interface Schema {
  settings: AppSettings
}

const store = new Store<Schema>({
  name: 'netpulse-settings',
  defaults: { settings: DEFAULT_SETTINGS }
})

export function getSettings(): AppSettings {
  // Сливаем с дефолтами на случай новых полей после обновления.
  return { ...DEFAULT_SETTINGS, ...store.get('settings') }
}

export function setSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...patch }
  store.set('settings', next)
  return next
}
