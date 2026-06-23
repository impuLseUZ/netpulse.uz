/**
 * Автоопределение локальной подсети по активному IPv4-интерфейсу.
 * Используется как значение по умолчанию для поля диапазона в сканере.
 */
import { networkInterfaces } from 'node:os'
import { ipv4ToInt, intToIPv4, prefixToMask } from '@shared/ipv4'
import { LocalSubnet } from '@shared/scanner-types'

/** netmask "255.255.255.0" -> длина префикса. */
function netmaskToPrefix(netmask: string): number {
  const n = ipv4ToInt(netmask)
  let count = 0
  let m = n >>> 0
  while (m & 0x80000000) {
    count++
    m = (m << 1) >>> 0
  }
  return count
}

/** Находит первый внешний (не loopback) IPv4-интерфейс и возвращает его CIDR. */
export function detectLocalSubnet(): LocalSubnet | null {
  const ifaces = networkInterfaces()
  for (const [name, addrs] of Object.entries(ifaces)) {
    if (!addrs) continue
    for (const addr of addrs) {
      // family может быть 'IPv4' (старые ноды) или 4 (новые)
      const isV4 = addr.family === 'IPv4' || (addr.family as unknown as number) === 4
      if (!isV4 || addr.internal) continue
      const prefix = netmaskToPrefix(addr.netmask)
      const network = (ipv4ToInt(addr.address) & prefixToMask(prefix)) >>> 0
      return {
        cidr: `${intToIPv4(network)}/${prefix}`,
        address: addr.address,
        ifaceName: name
      }
    }
  }
  return null
}
