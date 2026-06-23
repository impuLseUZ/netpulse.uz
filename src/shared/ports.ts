/**
 * Парсинг строки портов в массив чисел.
 * Поддержка: "80", "22,80,443", "1000-1010", смешанно "22,80,8000-8010".
 * Переиспользуется Ping+Port и (позже) сканером.
 */
export function parsePorts(input: string): number[] {
  const result = new Set<number>()
  const parts = input
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

  for (const part of parts) {
    if (part.includes('-')) {
      const [a, b] = part.split('-').map((x) => Number(x.trim()))
      if (!isValidPort(a) || !isValidPort(b) || a > b) {
        throw new Error(`Некорректный диапазон портов: ${part}`)
      }
      for (let p = a; p <= b; p++) result.add(p)
    } else {
      const p = Number(part)
      if (!isValidPort(p)) throw new Error(`Некорректный порт: ${part}`)
      result.add(p)
    }
  }

  return [...result].sort((a, b) => a - b)
}

export function isValidPort(p: number): boolean {
  return Number.isInteger(p) && p >= 1 && p <= 65535
}
