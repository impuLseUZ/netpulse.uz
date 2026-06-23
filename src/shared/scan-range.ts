/**
 * Разбор ввода диапазона сканирования в список IP-адресов.
 * Поддержка: CIDR "192.168.1.0/24", диапазон "192.168.1.1-192.168.1.254"
 * или "192.168.1.1-254", одиночный IP, и несколько через запятую.
 */
import { intToIPv4, ipv4ToInt, isValidIPv4, prefixToMask } from './ipv4'

const MAX_HOSTS = 65536 // защита от /8 и подобного

/** Разбирает одну часть (без запятых) в диапазон [start, end] чисел. */
function parsePart(part: string): [number, number] {
  const p = part.trim()

  if (p.includes('/')) {
    const [addr, prefStr] = p.split('/')
    if (!isValidIPv4(addr)) throw new Error(`Некорректный IP: ${addr}`)
    const prefix = Number(prefStr)
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
      throw new Error(`Некорректный префикс: /${prefStr}`)
    }
    const mask = prefixToMask(prefix)
    const base = ipv4ToInt(addr)
    const network = (base & mask) >>> 0
    const broadcast = (network | (~mask >>> 0)) >>> 0
    // Для /31 и /32 берём как есть, иначе исключаем сеть и broadcast.
    if (prefix >= 31) return [network, broadcast]
    return [(network + 1) >>> 0, (broadcast - 1) >>> 0]
  }

  if (p.includes('-')) {
    const [a, b] = p.split('-').map((x) => x.trim())
    if (!isValidIPv4(a)) throw new Error(`Некорректный IP: ${a}`)
    const startInt = ipv4ToInt(a)
    let endInt: number
    if (isValidIPv4(b)) {
      endInt = ipv4ToInt(b)
    } else if (/^\d{1,3}$/.test(b)) {
      // "192.168.1.1-254" — заменяем последний октет
      const last = Number(b)
      if (last < 0 || last > 255) throw new Error(`Некорректный конец диапазона: ${b}`)
      endInt = ((startInt & 0xffffff00) | last) >>> 0
    } else {
      throw new Error(`Некорректный диапазон: ${p}`)
    }
    if (startInt > endInt) throw new Error(`Начало диапазона больше конца: ${p}`)
    return [startInt, endInt]
  }

  if (isValidIPv4(p)) {
    const n = ipv4ToInt(p)
    return [n, n]
  }

  throw new Error(`Не удалось разобрать: ${p}`)
}

/** Разбирает полный ввод (с запятыми) в отсортированный уникальный список IP. */
export function parseRange(input: string): string[] {
  const parts = input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length === 0) throw new Error('Пустой диапазон')

  const ints = new Set<number>()
  for (const part of parts) {
    const [start, end] = parsePart(part)
    if (end - start + 1 > MAX_HOSTS) {
      throw new Error(`Слишком большой диапазон (>${MAX_HOSTS} адресов)`)
    }
    for (let n = start; n <= end; n++) ints.add(n >>> 0)
    if (ints.size > MAX_HOSTS) throw new Error(`Слишком много адресов (>${MAX_HOSTS})`)
  }

  return [...ints].sort((a, b) => a - b).map(intToIPv4)
}
