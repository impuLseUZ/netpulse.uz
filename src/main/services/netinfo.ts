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

const IPV4_URL = 'https://api.ipify.org'
const TRACE_URL = 'https://speed.cloudflare.com/cdn-cgi/trace'
const TIMEOUT_MS = 4000

async function fetchText(url: string): Promise<string | undefined> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) return undefined
    return (await res.text()).trim() || undefined
  } catch {
    return undefined
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Внешний IP. Сначала пробуем IPv4-only сервис (ipify) — большинство
 * пользователей ожидают увидеть именно IPv4, а не IPv6, который отдаёт
 * Cloudflare trace на сетях с включённым IPv6. Если IPv4 недоступен
 * (сеть чисто IPv6 или ipify не отвечает) — падаем на Cloudflare trace.
 * undefined при любой сетевой ошибке (нет интернета/таймаут/блокировка).
 */
async function getExternalIp(): Promise<string | undefined> {
  const ipv4 = await fetchText(IPV4_URL)
  if (ipv4) return ipv4

  const trace = await fetchText(TRACE_URL)
  if (!trace) return undefined
  for (const line of trace.split('\n')) {
    if (line.startsWith('ip=')) return line.slice(3).trim() || undefined
  }
  return undefined
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
