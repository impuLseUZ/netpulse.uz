/**
 * IPC-домен 'sshkeys': менеджер SSH-ключей.
 */
import { CHANNELS } from '@shared/channels'
import {
  SshKeyMeta,
  SshKeyGenerateQuery,
  SshKeyImportQuery,
  SshKeyExportResult
} from '@shared/sshkeys-types'
import { deleteKey, exportKey, generateKey, importKey, listKeys } from '../services/sshkeys'
import { handle } from './handle'

export function registerSshKeysIpc(): void {
  handle<SshKeyMeta[]>(CHANNELS.sshkeys.list, () => listKeys())
  handle<SshKeyMeta>(CHANNELS.sshkeys.generate, (arg) => generateKey(arg as SshKeyGenerateQuery))
  handle<SshKeyMeta>(CHANNELS.sshkeys.import, (arg) => importKey(arg as SshKeyImportQuery))
  handle<void>(CHANNELS.sshkeys.delete, (arg) => deleteKey((arg as { id: string }).id))
  handle<SshKeyExportResult>(CHANNELS.sshkeys.export, (arg) => exportKey((arg as { id: string }).id))
}
