/**
 * WHOIS-сервис (Модуль 5, опц.). Работает в main process.
 * Пакет 'whois' (MIT) — WHOIS-протокол по TCP/43. Требует интернет.
 * Лицензия: MIT. Не требует API-ключей и нативной сборки.
 */
import * as whois from 'whois'
import { WhoisQuery, WhoisResult } from '@shared/dns-types'

/** Промисифицированный вызов whois.lookup с таймаутом сокета. */
function lookupAsync(query: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    whois.lookup(query, { timeout: timeoutMs, follow: 2 }, (err, data) => {
      if (err) reject(err)
      else resolve(typeof data === 'string' ? data : String(data))
    })
  })
}

export async function whoisLookup(query: WhoisQuery, timeoutMs = 8000): Promise<WhoisResult> {
  const q = query.query.trim()
  if (!q) throw new Error('Пустой запрос WHOIS')
  const start = Date.now()
  const raw = await lookupAsync(q, timeoutMs)
  return { query: q, raw, elapsedMs: Date.now() - start }
}
