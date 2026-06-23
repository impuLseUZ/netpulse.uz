/**
 * IPC-домен 'app': сведения о платформе и настройки.
 */
import { app } from 'electron'
import { CHANNELS } from '@shared/channels'
import { AppSettings, PlatformInfo } from '@shared/types'
import { osFamily } from '../adapters/platform'
import { getSettings, setSettings } from '../services/settings'
import { handle } from './handle'

/** Доступность raw-сокетов проверим реально на шаге сканера (net-ping). */
function rawSocketsAvailable(): boolean {
  return false
}

export function registerAppIpc(): void {
  handle<PlatformInfo>(CHANNELS.app.getPlatformInfo, () => ({
    platform: process.platform,
    rawSocketsAvailable: rawSocketsAvailable(),
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron
  }))

  handle<AppSettings>(CHANNELS.app.getSettings, () => getSettings())

  handle<AppSettings>(CHANNELS.app.setSettings, (patch) =>
    setSettings(patch as Partial<AppSettings>)
  )

  void osFamily // адаптер уже подключён; используется доменными сервисами
}
