/**
 * IPC-домен 'app': сведения о платформе и настройки.
 */
import { app } from 'electron'
import { CHANNELS } from '@shared/channels'
import { AppSettings, PlatformInfo } from '@shared/types'
import { osFamily } from '../adapters/platform'
import { getSettings, setSettings } from '../services/settings'
import { handle } from './handle'

/**
 * Реальная проверка доступности raw-сокетов:
 * пытаемся создать сессию net-ping — если открылось, права есть.
 * Сессию сразу закрываем, нам нужен только факт.
 */
function rawSocketsAvailable(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ping = require('net-ping') as typeof import('net-ping')
    const session = ping.createSession({
      networkProtocol: ping.NetworkProtocol.IPv4,
      timeout: 1000,
      retries: 0,
    })
    try { session.close() } catch { /* ignore */ }
    return true
  } catch {
    return false
  }
}

/**
 * Человекочитаемое название платформы вместо внутренних идентификаторов Node.js.
 * process.platform возвращает: 'win32', 'darwin', 'linux', 'freebsd' и т.д.
 */
function platformLabel(platform: NodeJS.Platform): string {
  const map: Partial<Record<NodeJS.Platform, string>> = {
    win32:   'Windows',
    darwin:  'macOS',
    linux:   'Linux',
    freebsd: 'FreeBSD',
    openbsd: 'OpenBSD',
    sunos:   'SunOS',
    android: 'Android',
  }
  return map[platform] ?? platform
}

export function registerAppIpc(): void {
  handle<PlatformInfo>(CHANNELS.app.getPlatformInfo, () => ({
    platform: platformLabel(process.platform) as NodeJS.Platform,
    rawSocketsAvailable: rawSocketsAvailable(),
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
  }))

  handle<AppSettings>(CHANNELS.app.getSettings, () => getSettings())

  handle<AppSettings>(CHANNELS.app.setSettings, (patch) =>
    setSettings(patch as Partial<AppSettings>)
  )

  void osFamily // адаптер уже подключён; используется доменными сервисами
}