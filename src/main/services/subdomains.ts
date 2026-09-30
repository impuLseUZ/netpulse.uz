/**
 * Поиск поддоменов (Модуль «Subdomains»). Работает в main process.
 *
 * Два независимых источника, оба best-effort:
 *  1. Certificate Transparency — публичный лог crt.sh. Пассивный, находит
 *     реальные выпущенные сертификаты, не трогает сам домен.
 *  2. DNS-перебор по словарю частых префиксов — активный, резолвит
 *     ${word}.${domain} напрямую, поэтому находит и то, что в CT-логах
 *     никогда не светилось (например, поддомены без своего сертификата).
 *
 * Результаты отдаются инкрементально через cb.onHost, как в scanner.ts.
 */
import { promises as dns } from 'node:dns'
import pLimit from 'p-limit'
import { SubdomainHost, SubdomainProgress } from '@shared/subdomains-types'
import { SUBDOMAIN_WORDLIST } from './subdomain-wordlist'

const CRTSH_TIMEOUT_MS = 12000

interface SubdomainCallbacks {
  onHost: (host: SubdomainHost) => void
  onProgress: (progress: Omit<SubdomainProgress, 'sessionId'>) => void
}

interface ActiveSearch {
  cancelled: boolean
}

const activeSearches = new Map<string, ActiveSearch>()

interface CrtShEntry {
  name_value?: string
}

/** Достаёт из имени сертификата валидные поддомены искомого домена. */
function namesFromCrtEntry(entry: CrtShEntry, domain: string): string[] {
  if (!entry.name_value) return []
  const domainLower = domain.toLowerCase()
  return entry.name_value
    .split('\n')
    .map((n) => n.trim().toLowerCase())
    .filter((n) => n && !n.includes('*') && (n === domainLower || n.endsWith(`.${domainLower}`)))
}

/**
 * Пассивный поиск через crt.sh. Не бросает — ошибку/таймаут возвращает
 * отдельным полем, чтобы UI мог явно показать «источник не ответил»
 * вместо того чтобы молча показать 0 результатов и создать впечатление,
 * что у домена нет поддоменов.
 */
async function queryCrtSh(domain: string): Promise<{ names: string[]; error?: string }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), CRTSH_TIMEOUT_MS)
  try {
    const res = await fetch(`https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' }
    })
    if (!res.ok) return { names: [], error: `crt.sh: HTTP ${res.status}` }
    const data = (await res.json()) as CrtShEntry[]
    const set = new Set<string>()
    for (const entry of data) {
      for (const name of namesFromCrtEntry(entry, domain)) set.add(name)
    }
    return { names: [...set] }
  } catch (err) {
    const msg = err instanceof Error && err.name === 'AbortError' ? 'crt.sh: таймаут' : 'crt.sh: недоступен'
    return { names: [], error: msg }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Резолвит и A, и AAAA — поддомен может существовать только как AAAA/CNAME
 * на IPv6-хост, и тогда resolve4-only ошибочно посчитал бы его несуществующим.
 */
async function resolveIps(host: string, timeoutMs: number): Promise<string[]> {
  const withTimeout = <T>(p: Promise<T[]>): Promise<T[]> =>
    Promise.race([
      p,
      new Promise<T[]>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
    ]).catch(() => [] as T[])

  const [v4, v6] = await Promise.all([withTimeout(dns.resolve4(host)), withTimeout(dns.resolve6(host))])
  return [...v4, ...v6]
}

export async function findSubdomains(
  sessionId: string,
  domain: string,
  opts: {
    useCrtSh: boolean
    useBruteforce: boolean
    concurrency: number
    timeoutMs: number
    /** Дополнительные метки для DNS-перебора — конкретные известные поддомены,
     * которых может не быть в стандартном словаре. */
    extraWords?: string[]
  },
  cb: SubdomainCallbacks
): Promise<void> {
  const target = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (!target) throw new Error('Пустой домен')

  const state: ActiveSearch = { cancelled: false }
  activeSearches.set(sessionId, state)
  const seen = new Set<string>()
  const limit = pLimit(Math.max(1, opts.concurrency))

  try {
    // ── Фаза 1: Certificate Transparency (crt.sh) ──
    if (opts.useCrtSh && !state.cancelled) {
      cb.onProgress({ phase: 'crtsh', scanned: 0, total: 0, found: 0, done: false })
      const { names, error } = await queryCrtSh(target)
      if (error) cb.onProgress({ phase: 'crtsh', scanned: 0, total: 0, found: 0, done: false, error })
      let scanned = 0
      await Promise.all(
        names.map((name) =>
          limit(async () => {
            if (state.cancelled) return
            scanned++
            if (!seen.has(name)) {
              seen.add(name)
              const ips = await resolveIps(name, opts.timeoutMs)
              cb.onHost({ sessionId, subdomain: name, ips, source: 'crtsh' })
            }
            if (scanned % 5 === 0 || scanned === names.length) {
              cb.onProgress({ phase: 'crtsh', scanned, total: names.length, found: seen.size, done: false })
            }
          })
        )
      )
    }

    // ── Фаза 2: DNS-перебор по словарю (+ слова пользователя) ──
    if (opts.useBruteforce && !state.cancelled) {
      const words = new Set([...SUBDOMAIN_WORDLIST, ...(opts.extraWords ?? [])])
      const candidates = [...words].map((w) => `${w}.${target}`)
      let scanned = 0
      cb.onProgress({ phase: 'dns', scanned: 0, total: candidates.length, found: seen.size, done: false })
      await Promise.all(
        candidates.map((name) =>
          limit(async () => {
            if (state.cancelled) return
            const ips = await resolveIps(name, opts.timeoutMs)
            scanned++
            if (ips.length > 0 && !seen.has(name)) {
              seen.add(name)
              cb.onHost({ sessionId, subdomain: name, ips, source: 'dns' })
            }
            if (scanned % 5 === 0 || scanned === candidates.length) {
              cb.onProgress({ phase: 'dns', scanned, total: candidates.length, found: seen.size, done: false })
            }
          })
        )
      )
    }
  } finally {
    cb.onProgress({ phase: 'done', scanned: seen.size, total: seen.size, found: seen.size, done: true })
    activeSearches.delete(sessionId)
  }
}

export function cancelSubdomainSearch(sessionId: string): void {
  const s = activeSearches.get(sessionId)
  if (s) s.cancelled = true
}
