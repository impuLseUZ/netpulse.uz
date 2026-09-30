/**
 * IPC-домен 'localports': снимок локальных слушающих портов/процессов.
 */
import { CHANNELS } from '@shared/channels'
import { LocalPortEntry } from '@shared/localports-types'
import { listLocalPorts } from '../services/localports'
import { handle } from './handle'

export function registerLocalPortsIpc(): void {
  handle<LocalPortEntry[]>(CHANNELS.localports.list, () => listLocalPorts())
}
