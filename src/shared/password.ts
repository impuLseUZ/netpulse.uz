/**
 * Генератор паролей — чистая локальная логика (без IPC, офлайн).
 * Криптостойкая случайность через crypto.getRandomValues.
 */

/** Опции генерации. */
export interface PasswordOptions {
  length: number
  digits: boolean
  lowercase: boolean
  uppercase: boolean
  symbols: boolean
  /** Исключать похожие символы (0/O, 1/l/I и т.п.). */
  excludeSimilar?: boolean
}

/** Наборы символов. */
const SETS = {
  digits: '0123456789',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?/'
}

/** Похожие символы, которые легко спутать. */
const SIMILAR = new Set('0Oo1lI|`')

export const PASSWORD_LIMITS = { min: 4, max: 128 } as const

/** Собирает алфавит из выбранных наборов с учётом исключений. */
function buildAlphabet(opts: PasswordOptions): string {
  let chars = ''
  if (opts.digits) chars += SETS.digits
  if (opts.lowercase) chars += SETS.lowercase
  if (opts.uppercase) chars += SETS.uppercase
  if (opts.symbols) chars += SETS.symbols
  if (opts.excludeSimilar) {
    chars = [...chars].filter((c) => !SIMILAR.has(c)).join('')
  }
  return chars
}

/** Криптостойкое случайное целое в диапазоне [0, max) без смещения по модулю. */
function randomInt(max: number): number {
  // Отбраковка значений, выходящих за кратный max диапазон (rejection sampling),
  // чтобы распределение было равномерным.
  const limit = Math.floor(0xffffffff / max) * max
  const buf = new Uint32Array(1)
  let v = 0
  do {
    crypto.getRandomValues(buf)
    v = buf[0]
  } while (v >= limit)
  return v % max
}

/**
 * Генерирует пароль. Гарантирует присутствие хотя бы одного символа
 * из каждого выбранного набора (если длина это позволяет).
 * Бросает, если не выбран ни один набор.
 */
export function generatePassword(opts: PasswordOptions): string {
  const length = Math.max(PASSWORD_LIMITS.min, Math.min(PASSWORD_LIMITS.max, opts.length))
  const alphabet = buildAlphabet(opts)
  if (!alphabet) throw new Error('Выберите хотя бы один набор символов')

  // Обязательные наборы — чтобы пароль точно содержал каждый выбранный тип.
  const required: string[] = []
  if (opts.digits) required.push(opts.excludeSimilar ? stripSimilar(SETS.digits) : SETS.digits)
  if (opts.lowercase)
    required.push(opts.excludeSimilar ? stripSimilar(SETS.lowercase) : SETS.lowercase)
  if (opts.uppercase)
    required.push(opts.excludeSimilar ? stripSimilar(SETS.uppercase) : SETS.uppercase)
  if (opts.symbols) required.push(opts.excludeSimilar ? stripSimilar(SETS.symbols) : SETS.symbols)

  const chars: string[] = []

  // По одному символу из каждого обязательного набора (если влезает).
  for (const set of required) {
    if (chars.length >= length) break
    if (set.length > 0) chars.push(set[randomInt(set.length)])
  }

  // Добиваем до нужной длины из общего алфавита.
  while (chars.length < length) {
    chars.push(alphabet[randomInt(alphabet.length)])
  }

  // Перемешиваем (Фишер–Йейтс), чтобы обязательные символы не были в начале.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}

function stripSimilar(set: string): string {
  return [...set].filter((c) => !SIMILAR.has(c)).join('')
}

/** Уровни стойкости. */
export type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong'

export interface StrengthResult {
  level: StrengthLevel
  /** Оценка энтропии в битах. */
  bits: number
  /** Доля заполнения шкалы 0..1 (для прогресс-бара). */
  fraction: number
}

/**
 * Оценка стойкости по энтропии: log2(размер_алфавита) * длина.
 * Грубая, но практичная метрика для UI.
 */
export function estimateStrength(password: string, opts: PasswordOptions): StrengthResult {
  const alphabet = buildAlphabet(opts)
  const poolSize = alphabet.length || 1
  const bits = password.length > 0 ? Math.log2(poolSize) * password.length : 0

  let level: StrengthLevel
  if (bits < 40) level = 'weak'
  else if (bits < 60) level = 'fair'
  else if (bits < 80) level = 'good'
  else level = 'strong'

  // Шкала: 0 бит → 0, 100+ бит → 1.
  const fraction = Math.max(0, Math.min(1, bits / 100))
  return { level, bits: Math.round(bits), fraction }
}
