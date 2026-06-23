/**
 * IPC-домен 'speedtest': внешний IP/ISP (Модуль 6).
 *
 * Сам замер скорости через IPC не идёт — он выполняется в renderer
 * (@cloudflare/speedtest, браузерные API). Здесь только сетевая информация.
 */
import { CHANNELS } from '@shared/channels'
import { NetworkInfo } from '@shared/speedtest-types'
import { getNetworkInfo } from '../services/speedtest'
import { handle } from './handle'

export function registerSpeedtestIpc(): void {
  handle<NetworkInfo>(CHANNELS.speedtest.getNetworkInfo, () => getNetworkInfo())
}
