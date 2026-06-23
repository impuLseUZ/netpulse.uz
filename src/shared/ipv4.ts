/**
 * Переиспользуемые утилиты валидации и парсинга IPv4.
 * Чистые функции без зависимостей от Electron/Node — годятся и в renderer, и в main.
 * Используются IP-калькулятором, а позже — сканером и Ping+Port.
 */

/** Проверка корректности dotted-IPv4 ("192.168.1.1"). */
export function isValidIPv4(ip: string): boolean {
  const parts = ip.trim().split('.')
  if (parts.length !== 4) return false
  return parts.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false
    const n = Number(p)
    return n >= 0 && n <= 255 && String(n) === String(Number(p))
  })
}

/** IPv4-строка → беззнаковое 32-битное число. Бросает при некорректном вводе. */
export function ipv4ToInt(ip: string): number {
  if (!isValidIPv4(ip)) throw new Error(`Некорректный IPv4: ${ip}`)
  return (
    ip
      .trim()
      .split('.')
      .reduce((acc, p) => (acc << 8) + Number(p), 0) >>> 0
  )
}

/** 32-битное число → IPv4-строка. */
export function intToIPv4(n: number): string {
  const u = n >>> 0
  return [(u >>> 24) & 255, (u >>> 16) & 255, (u >>> 8) & 255, u & 255].join('.')
}

/** Префикс CIDR (0..32) → маска как 32-битное число. */
export function prefixToMask(prefix: number): number {
  if (prefix < 0 || prefix > 32) throw new Error(`Некорректный префикс: /${prefix}`)
  if (prefix === 0) return 0
  return (0xffffffff << (32 - prefix)) >>> 0
}

/** Маска (число) → длина префикса. Бросает, если маска несплошная. */
export function maskToPrefix(mask: number): number {
  const u = mask >>> 0
  // Маска должна быть видом 1...10...0. Инвертируем и проверяем, что (~m + 1) — степень двойки.
  const inv = (~u >>> 0) + 1
  if ((inv & (inv - 1)) !== 0 && u !== 0xffffffff && u !== 0) {
    throw new Error('Маска не является непрерывной')
  }
  let count = 0
  let m = u
  while (m & 0x80000000) {
    count++
    m = (m << 1) >>> 0
  }
  return count
}

/** Проверка, что строка — корректная dotted-маска (255.255.255.0). */
export function isValidMask(mask: string): boolean {
  if (!isValidIPv4(mask)) return false
  try {
    maskToPrefix(ipv4ToInt(mask))
    return true
  } catch {
    return false
  }
}

/** Двоичное представление 32-битного адреса с точками между октетами. */
export function toBinaryDotted(n: number): string {
  const u = n >>> 0
  return [(u >>> 24) & 255, (u >>> 16) & 255, (u >>> 8) & 255, u & 255]
    .map((o) => o.toString(2).padStart(8, '0'))
    .join('.')
}
