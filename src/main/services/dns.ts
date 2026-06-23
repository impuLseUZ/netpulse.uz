/**
 * DNS-сервис (Модуль 5). Работает в main process.
 * Встроенный dns.promises; кастомный сервер через new Resolver() + setServers().
 * Все запросы с таймаутом и обработкой ошибок — сеть может не ответить.
 */
import { promises as dns, Resolver } from 'node:dns'
import {
  DnsLookupResult,
  DnsQuery,
  DnsRecord,
  DnsRecordType,
  DNS_RECORD_TYPES
} from '@shared/dns-types'
import { isValidIPv4 } from '@shared/ipv4'

/** Оборачивает промис таймаутом, чтобы запрос не висел вечно. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Таймаут запроса ${label}`)), ms)
    )
  ])
}

/**
 * Общий интерфейс резолвера: и dns.promises, и new Resolver() реализуют
 * один набор методов. Union сбивает вывод типов, поэтому фиксируем форму явно.
 */
interface DnsResolver {
  resolve4(host: string): Promise<string[]>
  resolve6(host: string): Promise<string[]>
  resolveMx(host: string): Promise<{ priority: number; exchange: string }[]>
  resolveNs(host: string): Promise<string[]>
  resolveTxt(host: string): Promise<string[][]>
  reverse(ip: string): Promise<string[]>
}

/** Возвращает резолвер: системный или с кастомным сервером. */
function makeResolver(server?: string): DnsResolver {
  if (server && server.trim()) {
    const r = new Resolver()
    r.setServers([server.trim()])
    return r as unknown as DnsResolver
  }
  return dns as unknown as DnsResolver
}

/** Запрос одного типа записи. Ошибки конкретного типа не валят весь lookup. */
async function resolveType(
  resolver: DnsResolver,
  host: string,
  type: DnsRecordType,
  timeoutMs: number
): Promise<DnsRecord[]> {
  try {
    switch (type) {
      case 'A': {
        const a = await withTimeout(resolver.resolve4(host), timeoutMs, 'A')
        return a.map((v) => ({ type, value: v }))
      }
      case 'AAAA': {
        const a = await withTimeout(resolver.resolve6(host), timeoutMs, 'AAAA')
        return a.map((v) => ({ type, value: v }))
      }
      case 'MX': {
        const mx = await withTimeout(resolver.resolveMx(host), timeoutMs, 'MX')
        return mx
          .sort((x, y) => x.priority - y.priority)
          .map((m) => ({ type, value: `${m.priority} ${m.exchange}`, priority: m.priority }))
      }
      case 'NS': {
        const ns = await withTimeout(resolver.resolveNs(host), timeoutMs, 'NS')
        return ns.map((v) => ({ type, value: v }))
      }
      case 'TXT': {
        const txt = await withTimeout(resolver.resolveTxt(host), timeoutMs, 'TXT')
        return txt.map((chunks) => ({ type, value: chunks.join('') }))
      }
      case 'PTR': {
        // PTR: ожидаем IP. dns.reverse возвращает имена.
        const ptr = await withTimeout(resolver.reverse(host), timeoutMs, 'PTR')
        return ptr.map((v) => ({ type, value: v }))
      }
      default:
        return []
    }
  } catch {
    // Нет записей данного типа / ошибка типа — возвращаем пусто, не валим всё.
    return []
  }
}

export async function dnsLookup(query: DnsQuery, timeoutMs = 5000): Promise<DnsLookupResult> {
  const host = query.host.trim()
  if (!host) throw new Error('Пустой запрос')

  const resolver = makeResolver(query.server)
  const start = Date.now()

  // Выбор типов: один или основной набор. Для PTR требуется IP.
  let types: DnsRecordType[]
  if (query.type === 'ALL') {
    types = DNS_RECORD_TYPES.filter((t) => (t === 'PTR' ? isValidIPv4(host) : true))
  } else {
    types = [query.type]
  }

  const groups = await Promise.all(types.map((t) => resolveType(resolver, host, t, timeoutMs)))
  const records = groups.flat()

  return {
    host,
    server: query.server?.trim() || 'system',
    records,
    elapsedMs: Date.now() - start
  }
}
