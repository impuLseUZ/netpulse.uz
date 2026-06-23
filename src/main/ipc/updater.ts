/**
 * IPC-домен 'updater': команды автообновления (Модуль 7).
 * Состояние renderer получает push-событием updater:state (см. services/updater.ts).
 */
import { CHANNELS } from '@shared/channels'
import { UpdateState } from '@shared/types'
import {
  checkForUpdates,
  downloadUpdate,
  getUpdateState,
  quitAndInstall
} from '../services/updater'
import { handle } from './handle'

export function registerUpdaterIpc(): void {
  handle<UpdateState>(CHANNELS.updater.getState, () => getUpdateState())
  handle<void>(CHANNELS.updater.check, () => checkForUpdates())
  handle<void>(CHANNELS.updater.download, () => downloadUpdate())
  handle<void>(CHANNELS.updater.quitAndInstall, () => quitAndInstall())
}
