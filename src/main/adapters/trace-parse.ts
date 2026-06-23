/**
 * Парсинг вывода системного tracert (Windows) / traceroute (unix).
 * Возвращает упорядоченный список { hop, ip } (ip undefined если '*').
 * Используется как fallback, когда raw-трассировка недоступна.
 */
import { osFamily } from './platform'

export interface ParsedHop {
  hop: number
  ip?: string
  /** Первое измеренное время, мс (если было). */
  ms?: number
}

const IPV4 = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/

export function parseTraceOutput(output: string): ParsedHop[] {
  const os = osFamily()
  const lines = output.split(/\r?\n/)
  const hops: ParsedHop[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Строка хопа начинается с номера.
    const hopMatch = trimmed.match(/^(\d+)\s/)
    if (!hopMatch) continue
    const hop = Number(hopMatch[1])

    // IP узла (первый IPv4 в строке).
    const ipMatch = trimmed.match(IPV4)
    const ip = ipMatch ? ipMatch[1] : undefined

    // Время: на Windows "12 ms", на unix "12.345 ms".
    const msMatch = trimmed.match(/([\d.]+)\s*ms/i)
    const ms = msMatch ? Number(msMatch[1]) : undefined

    // Если в строке только звёздочки — узел не ответил.
    const allStars = !ip && /\*/.test(trimmed)

    hops.push({ hop, ip: allStars ? undefined : ip, ms })
    void os
  }

  return hops
}
