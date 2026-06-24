/**
 * IPC-домен 'netinfo': адреса хоста (внешний + локальный IP) для шапки.
 */
import { CHANNELS } from '@shared/channels'
import { NetAddresses } from '@shared/netinfo-types'
import { getAddresses } from '../services/netinfo'
import { handle } from './handle'

export function registerNetinfoIpc(): void {
  handle<NetAddresses>(CHANNELS.netinfo.getAddresses, () => getAddresses())
}
