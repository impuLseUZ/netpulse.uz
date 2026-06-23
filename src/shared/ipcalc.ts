/**
 * Логика IP-калькулятора (Модуль 3). Чистые функции, IPv4.
 * Всё локально, без сети. Разбор ввода в форматах CIDR и dotted-маски.
 */
import {
  intToIPv4,
  ipv4ToInt,
  isValidIPv4,
  isValidMask,
  maskToPrefix,
  prefixToMask,
  toBinaryDotted
} from './ipv4'

export interface SubnetCalc {
  /** Введённый адрес. */
  address: string
  prefix: number
  netmask: string
  wildcard: string
  network: string
  broadcast: string
  /** Первый используемый хост (или '—', если /31, /32). */
  firstHost: string
  lastHost: string
  /** Кол-во используемых хостов. */
  usableHosts: number
  /** Общее число адресов в блоке (2^(32-prefix)). */
  totalAddresses: number
  /** Класс сети по первому октету (A/B/C/D/E). */
  netClass: string
  isPrivate: boolean
  binaryAddress: string
  binaryMask: string
}

/**
 * Разбирает ввод вида "192.168.1.10/24" или "192.168.1.10 255.255.255.0"
 * либо отдельные адрес и маску. Возвращает { address, prefix }.
 */
export function parseInput(input: string): { address: string; prefix: number } {
  const trimmed = input.trim()

  // Формат CIDR: ip/prefix
  if (trimmed.includes('/')) {
    const [addr, pref] = trimmed.split('/')
    if (!isValidIPv4(addr)) throw new Error(`Некорректный IPv4: ${addr}`)
    const prefix = Number(pref)
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
      throw new Error(`Некорректный префикс: /${pref}`)
    }
    return { address: addr.trim(), prefix }
  }

  // Формат "ip mask" через пробел
  const bySpace = trimmed.split(/\s+/)
  if (bySpace.length === 2) {
    const [addr, mask] = bySpace
    if (!isValidIPv4(addr)) throw new Error(`Некорректный IPv4: ${addr}`)
    if (!isValidMask(mask)) throw new Error(`Некорректная маска: ${mask}`)
    return { address: addr, prefix: maskToPrefix(ipv4ToInt(mask)) }
  }

  // Только адрес — без маски, считаем по классу (классовая маска)
  if (isValidIPv4(trimmed)) {
    return { address: trimmed, prefix: classfulPrefix(trimmed) }
  }

  throw new Error('Не удалось разобрать ввод')
}

/** Классовый префикс по первому октету (для адреса без маски). */
function classfulPrefix(ip: string): number {
  const first = Number(ip.split('.')[0])
  if (first < 128) return 8 // A
  if (first < 192) return 16 // B
  return 24 // C и далее
}

/** Класс сети по первому октету. */
export function netClassOf(ip: string): string {
  const first = Number(ip.split('.')[0])
  if (first < 128) return 'A'
  if (first < 192) return 'B'
  if (first < 224) return 'C'
  if (first < 240) return 'D (multicast)'
  return 'E (reserved)'
}

/** Приватный диапазон по RFC 1918 + loopback + link-local. */
export function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip)
  const inRange = (cidr: string): boolean => {
    const [base, p] = cidr.split('/')
    const mask = prefixToMask(Number(p))
    return (n & mask) >>> 0 === (ipv4ToInt(base) & mask) >>> 0
  }
  return (
    inRange('10.0.0.0/8') ||
    inRange('172.16.0.0/12') ||
    inRange('192.168.0.0/16') ||
    inRange('127.0.0.0/8') ||
    inRange('169.254.0.0/16')
  )
}

/** Полный расчёт параметров подсети для адреса с префиксом. */
export function calculate(input: string): SubnetCalc {
  const { address, prefix } = parseInput(input)
  const addrInt = ipv4ToInt(address)
  const maskInt = prefixToMask(prefix)
  const wildcardInt = (~maskInt >>> 0) >>> 0
  const networkInt = (addrInt & maskInt) >>> 0
  const broadcastInt = (networkInt | wildcardInt) >>> 0
  const total = prefix >= 32 ? 1 : 2 ** (32 - prefix)

  let firstHost = '—'
  let lastHost = '—'
  let usable = 0
  if (prefix <= 30) {
    firstHost = intToIPv4((networkInt + 1) >>> 0)
    lastHost = intToIPv4((broadcastInt - 1) >>> 0)
    usable = total - 2
  } else if (prefix === 31) {
    // RFC 3021 — point-to-point, оба адреса используемы
    firstHost = intToIPv4(networkInt)
    lastHost = intToIPv4(broadcastInt)
    usable = 2
  } else {
    // /32 — единственный хост
    firstHost = address
    lastHost = address
    usable = 1
  }

  return {
    address,
    prefix,
    netmask: intToIPv4(maskInt),
    wildcard: intToIPv4(wildcardInt),
    network: intToIPv4(networkInt),
    broadcast: intToIPv4(broadcastInt),
    firstHost,
    lastHost,
    usableHosts: usable,
    totalAddresses: total,
    netClass: netClassOf(address),
    isPrivate: isPrivateIPv4(address),
    binaryAddress: toBinaryDotted(addrInt),
    binaryMask: toBinaryDotted(maskInt)
  }
}

export interface SubnetRow {
  index: number
  network: string
  prefix: number
  firstHost: string
  lastHost: string
  broadcast: string
  usableHosts: number
}

/**
 * Разбиение сети на подсети.
 * mode 'count' — задано число подсетей; mode 'hosts' — нужное число хостов в каждой.
 */
export function subnet(
  input: string,
  mode: 'count' | 'hosts',
  value: number
): SubnetRow[] {
  const { address, prefix } = parseInput(input)
  const baseNetwork = (ipv4ToInt(address) & prefixToMask(prefix)) >>> 0

  let newPrefix: number
  if (mode === 'count') {
    if (value < 1) throw new Error('Число подсетей должно быть ≥ 1')
    const bits = Math.ceil(Math.log2(value))
    newPrefix = prefix + bits
  } else {
    if (value < 1) throw new Error('Число хостов должно быть ≥ 1')
    // нужно value+2 адреса (сеть + broadcast), кроме мелких блоков
    const needed = value + 2
    const hostBits = Math.ceil(Math.log2(needed))
    newPrefix = 32 - hostBits
  }

  if (newPrefix > 32) throw new Error('Недостаточно адресного пространства для разбиения')
  if (newPrefix < prefix) newPrefix = prefix

  const subnetCount = 2 ** (newPrefix - prefix)
  const blockSize = 2 ** (32 - newPrefix)
  const rows: SubnetRow[] = []

  // Ограничим вывод, чтобы не повесить UI на гигантских разбиениях.
  const MAX_ROWS = 1024
  const limit = Math.min(subnetCount, MAX_ROWS)

  for (let i = 0; i < limit; i++) {
    const net = (baseNetwork + i * blockSize) >>> 0
    const bcast = (net + blockSize - 1) >>> 0
    let first = '—'
    let last = '—'
    let usable = 0
    if (newPrefix <= 30) {
      first = intToIPv4((net + 1) >>> 0)
      last = intToIPv4((bcast - 1) >>> 0)
      usable = blockSize - 2
    } else if (newPrefix === 31) {
      first = intToIPv4(net)
      last = intToIPv4(bcast)
      usable = 2
    } else {
      first = intToIPv4(net)
      last = intToIPv4(net)
      usable = 1
    }
    rows.push({
      index: i + 1,
      network: intToIPv4(net),
      prefix: newPrefix,
      firstHost: first,
      lastHost: last,
      broadcast: intToIPv4(bcast),
      usableHosts: usable
    })
  }

  return rows
}
