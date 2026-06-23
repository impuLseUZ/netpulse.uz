/**
 * Проверка TCP-портов (Модуль 4). Работает в main process.
 * Встроенный net (попытка connect с таймаутом). Concurrency через p-limit.
 */
import net from 'node:net'
import pLimit from 'p-limit'
import { PortResult, PortStatus, serviceForPort } from '@shared/pingport-types'

/** TCP-проверка одного порта. */
function checkTcp(host: string, port: number, timeoutMs: number): Promise<PortResult> {
  return new Promise((resolve) => {
    const start = Date.now()
    const socket = new net.Socket()
    let done = false
    const finish = (status: PortStatus, timeMs?: number): void => {
      if (done) return
      done = true
      socket.destroy()
      resolve({ port, status, timeMs, service: serviceForPort(port) })
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish('open', Date.now() - start))
    socket.once('timeout', () => finish('filtered'))
    socket.once('error', (err: NodeJS.ErrnoException) => {
      // ECONNREFUSED => порт закрыт (хост ответил RST); прочее => filtered
      finish(err.code === 'ECONNREFUSED' ? 'closed' : 'filtered')
    })
    socket.connect(port, host)
  })
}

export async function checkPorts(
  host: string,
  ports: number[],
  timeoutMs: number,
  concurrency: number
): Promise<PortResult[]> {
  const limit = pLimit(Math.max(1, concurrency))
  const tasks = ports.map((p) => limit(() => checkTcp(host, p, timeoutMs)))
  const results = await Promise.all(tasks)
  return results.sort((a, b) => a.port - b.port)
}
