/**
 * IPC-домен 'updater': проверка обновлений через GitHub API (Модуль 7).
 * Состояние renderer получает push-событием updater:state.
 */
import { CHANNELS } from '@shared/channels'
import { UpdateState } from '@shared/types'
import {
  checkForUpdates,
  getUpdateState,
  openReleasePage,
} from '../services/updater'
import { handle } from './handle'

export function registerUpdaterIpc(): void {
  handle<UpdateState>(CHANNELS.updater.getState, () => getUpdateState())
  handle<void>(CHANNELS.updater.check, () => checkForUpdates())
  // download → открывает страницу релиза в браузере
  handle<void>(CHANNELS.updater.download, () => { openReleasePage() })
  // quitAndInstall → тоже открывает страницу (пользователь скачивает сам)
  handle<void>(CHANNELS.updater.quitAndInstall, () => { openReleasePage() })
}