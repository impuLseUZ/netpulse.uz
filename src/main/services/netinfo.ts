/**
 * Сервис 'netinfo' — адреса хоста для шапки приложения.
 *
 * local  — мгновенно и офлайн, из активного сетевого интерфейса;
 * external — best-effort через Cloudflare trace (нужен интернет, может не быть).
 *
 * Оба поля опциональны: функция никогда не бросает, отсутствующее
 * значение просто не заполняется — шапка покажет то, что есть.
 */
import { detectLocalSubnet } from '../adapters/local-subnet'
import { NetAddresses } from '@shared/netinfo-types'

const TRACE_URL = 'https://speed.cloudflare.com/cdn-cgi/trace'
const TIMEOUT_MS = 4000

/** Внешний IP через Cloudflare trace; undefined при любой сетевой ошибке. */
async function getExternalIp(): Promise<string | undefined> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(TRACE_URL, { signal: ctrl.signal })
    if (!res.ok) return undefined
    const text = await res.text()
    for (const line of text.split('\n')) {
      if (line.startsWith('ip=')) return line.slice(3).trim() || undefined
    }
    return undefined
  } catch {
    // нет интернета / таймаут / блокировка — внешний IP просто неизвестен
    return undefined
  } finally {
    clearTimeout(timer)
  }
}

/** Локальный IPv4 активного интерфейса; undefined, если интерфейс не найден. */
function getLocalIp(): { local?: string; ifaceName?: string } {
  try {
    const subnet = detectLocalSubnet()
    if (subnet) return { local: subnet.address, ifaceName: subnet.ifaceName }
  } catch {
    /* networkInterfaces недоступны — крайне маловероятно */
  }
  return {}
}

/** Возвращает доступные адреса. Никогда не бросает. */
export async function getAddresses(): Promise<NetAddresses> {
  const { local, ifaceName } = getLocalIp()
  const external = await getExternalIp()
  console.info('[netinfo] addresses:', { external, local, ifaceName })
  return { external, local, ifaceName }
}
