/**
 * Пресеты диапазонов для полного сканера портов.
 * TOP_PORTS — самые часто встречающиеся TCP-порты (аналог nmap --top-ports),
 * достаточно для быстрого разведывательного скана без ожидания всех 65535.
 */
export const TOP_PORTS: readonly number[] = [
  21, 22, 23, 25, 53, 80, 81, 110, 111, 113, 119, 123, 135, 137, 138, 139, 143,
  161, 179, 199, 389, 443, 444, 445, 465, 513, 514, 515, 543, 544, 548, 554,
  587, 631, 636, 646, 873, 990, 993, 995, 1025, 1026, 1027, 1028, 1029, 1080,
  1110, 1433, 1521, 1720, 1723, 1755, 1900, 2000, 2001, 2049, 2121, 2181, 2375,
  2376, 2483, 2484, 3000, 3128, 3268, 3306, 3389, 3690, 3986, 4000, 4444, 4445,
  4567, 4899, 5000, 5001, 5060, 5061, 5432, 5601, 5631, 5666, 5672, 5800, 5900,
  5901, 5985, 5986, 6000, 6001, 6379, 6667, 7000, 7001, 7070, 7077, 7199, 7777,
  8000, 8008, 8009, 8080, 8081, 8088, 8089, 8090, 8091, 8140, 8443, 8500, 8888,
  8889, 9000, 9001, 9042, 9090, 9092, 9100, 9200, 9300, 9418, 9999, 10000,
  11211, 15672, 15672, 20000, 25565, 27017, 27018, 28017, 32768, 49152, 50000,
]

export type PortScanPreset = 'top' | 'wellKnown' | 'full' | 'custom'

export function portsForPreset(preset: PortScanPreset, customRange?: string): number[] {
  switch (preset) {
    case 'top':
      return [...new Set(TOP_PORTS)].sort((a, b) => a - b)
    case 'wellKnown':
      return range(1, 1024)
    case 'full':
      return range(1, 65535)
    case 'custom':
      return parseCustomRange(customRange ?? '')
  }
}

function range(from: number, to: number): number[] {
  const out: number[] = []
  for (let p = from; p <= to; p++) out.push(p)
  return out
}

/** Парсит "22,80,443,8000-8010" в отсортированный список без дублей. */
export function parseCustomRange(input: string): number[] {
  const set = new Set<number>()
  for (const chunk of input.split(',')) {
    const part = chunk.trim()
    if (!part) continue
    const m = /^(\d+)\s*-\s*(\d+)$/.exec(part)
    if (m) {
      const from = Math.max(1, parseInt(m[1], 10))
      const to = Math.min(65535, parseInt(m[2], 10))
      for (let p = from; p <= to; p++) set.add(p)
    } else {
      const n = parseInt(part, 10)
      if (n >= 1 && n <= 65535) set.add(n)
    }
  }
  return [...set].sort((a, b) => a - b)
}
