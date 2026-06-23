/**
 * Единая точка запуска внешних процессов.
 * Правила: только spawn с массивом аргументов, shell: false, обязательный таймаут.
 * Никакой конкатенации строк и интерполяции пользовательского ввода в команду.
 */
import { spawn } from 'node:child_process'

export interface RunResult {
  code: number | null
  stdout: string
  stderr: string
  timedOut: boolean
}

export interface RunOptions {
  timeoutMs?: number
  /** Кодировка вывода; для tracert/arp на Windows иногда нужна 'latin1'. */
  encoding?: BufferEncoding
}

export function run(cmd: string, args: string[], opts: RunOptions = {}): Promise<RunResult> {
  const { timeoutMs = 10_000, encoding = 'utf8' } = opts

  return new Promise((resolve) => {
    const child = spawn(cmd, args, { shell: false, windowsHide: true })
    let stdout = ''
    let stderr = ''
    let timedOut = false

    const timer = setTimeout(() => {
      timedOut = true
      child.kill()
    }, timeoutMs)

    child.stdout?.setEncoding(encoding)
    child.stderr?.setEncoding(encoding)
    child.stdout?.on('data', (d: string) => (stdout += d))
    child.stderr?.on('data', (d: string) => (stderr += d))

    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ code: null, stdout, stderr: stderr + String(err), timedOut })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code, stdout, stderr, timedOut })
    })
  })
}

/**
 * Запуск «открывающих» внешних клиентов (mstsc, ssh, проводник).
 * detached + unref — не блокируем приложение. Аргументы только массивом.
 */
export function launchDetached(cmd: string, args: string[]): void {
  const child = spawn(cmd, args, { shell: false, detached: true, stdio: 'ignore' })
  child.unref()
}
