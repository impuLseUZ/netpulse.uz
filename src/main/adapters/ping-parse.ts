/**
 * Парсинг вывода системного ping. Формат различается по ОС,
 * поэтому разбор живёт в адаптере рядом с pingArgs.
 */
import { osFamily } from './platform'

export interface ParsedPing {
  alive: boolean
  timeMs?: number
  min?: number
  avg?: number
  max?: number
  lossPercent: number
}

/** Извлекает время одного отклика "time=12.3 ms" / "время=12мс" / "time<1ms". */
function parseSingleTime(output: string): number | undefined {
  // Устойчиво к кодировке и языку: ищем "=NN" или "<NN" непосредственно
  // перед "ms"/"мс" (или искажённой кодировкой — тогда просто перед границей).
  // Сначала пробуем точный вариант с единицей измерения.
  let m = output.match(/[=<]\s*([\d.]+)\s*(?:ms|мс|mc)/i)
  if (m) return Number(m[1])
  // Вариант "<1ms" / "<1мс" — округляем до 0.5.
  if (/[<]\s*1\s*(?:ms|мс|mc)/i.test(output)) return 0.5
  // Запасной вариант: любое "=NN" в строке с ответом (TTL присутствует).
  if (/ttl[=\s]/i.test(output)) {
    m = output.match(/[=<]\s*([\d.]+)\b/)
    if (m) return Number(m[1])
  }
  return undefined
}

/** Извлекает процент потерь. */
function parseLoss(output: string): number {
  // en: "0% loss" / "0% packet loss" ; ru: "(0% потерь)" / "0% потерь"
  const m = output.match(/([\d.]+)%\s*(?:packet\s*)?(?:loss|потерь)/i)
  return m ? Number(m[1]) : 0
}

/** Извлекает min/avg/max, если присутствуют. */
function parseStats(output: string): { min?: number; avg?: number; max?: number } {
  // en linux/mac: rtt min/avg/max/mdev = 1.1/2.2/3.3/0.5 ms
  const unix = output.match(
    /=\s*([\d.]+)\/([\d.]+)\/([\d.]+)(?:\/[\d.]+)?\s*ms/i
  )
  if (unix) return { min: Number(unix[1]), avg: Number(unix[2]), max: Number(unix[3]) }

  // win en: Minimum = 1ms, Maximum = 3ms, Average = 2ms
  // win ru: Минимальное = 1мсек, Максимальное = 3мсек, Среднее = 2мсек
  const min = output.match(/(?:Minimum|Минимальное)\s*=\s*([\d.]+)\s*(?:ms|мсек)/i)
  const max = output.match(/(?:Maximum|Максимальное)\s*=\s*([\d.]+)\s*(?:ms|мсек)/i)
  const avg = output.match(/(?:Average|Среднее)\s*=\s*([\d.]+)\s*(?:ms|мсек)/i)
  if (min || max || avg) {
    return {
      min: min ? Number(min[1]) : undefined,
      avg: avg ? Number(avg[1]) : undefined,
      max: max ? Number(max[1]) : undefined
    }
  }
  return {}
}

export function parsePingOutput(
  stdout: string,
  exitCode: number | null,
  timedOut: boolean
): ParsedPing {
  const out = stdout || ''
  const timeMs = parseSingleTime(out)
  const loss = parseLoss(out)
  const stats = parseStats(out)

  // Хост жив, если есть отклик или явно 0% потерь, и не было таймаута.
  let alive = false
  if (!timedOut) {
    if (loss < 100 && (timeMs !== undefined || exitCode === 0)) alive = true
    // На Windows ping возвращает 0 даже при "destination unreachable" —
    // подстрахуемся проверкой ключевых слов.
    if (osFamily() === 'win' && /(unreachable|недостижим|истекло|timed out)/i.test(out)) {
      alive = false
    }
  }

  return {
    alive,
    timeMs,
    min: stats.min,
    avg: stats.avg,
    max: stats.max,
    lossPercent: alive ? loss : 100
  }
}
