/**
 * Платформозависимый адаптер.
 * Любой вызов системных утилит (ping, arp, tracert/traceroute) собирает
 * аргументы ЗДЕСЬ, чтобы бизнес-логика не хардкодила флаги под одну ОС.
 *
 * Важно: команды запускаются через child_process.spawn с аргументами-массивом
 * (см. services/proc.ts) — без shell и без конкатенации строк.
 */
import { platform } from 'node:os'

export type OSFamily = 'win' | 'mac' | 'linux'

export function osFamily(): OSFamily {
  switch (platform()) {
    case 'win32':
      return 'win'
    case 'darwin':
      return 'mac'
    default:
      return 'linux'
  }
}

/** Аргументы для одиночного ICMP-пинга (1 пакет) с таймаутом. */
export function pingArgs(host: string, timeoutMs: number): { cmd: string; args: string[] } {
  const os = osFamily()
  if (os === 'win') {
    // -n кол-во, -w таймаут в мс
    return { cmd: 'ping', args: ['-n', '1', '-w', String(timeoutMs), host] }
  }
  if (os === 'mac') {
    // -c кол-во, -W таймаут в мс (macOS)
    return { cmd: 'ping', args: ['-c', '1', '-W', String(timeoutMs), host] }
  }
  // linux: -c кол-во, -W таймаут в секундах (округляем вверх)
  const sec = Math.max(1, Math.ceil(timeoutMs / 1000))
  return { cmd: 'ping', args: ['-c', '1', '-W', String(sec), host] }
}

/** Аргументы для traceroute/tracert. */
export function tracerouteArgs(
  host: string,
  opts: { maxHops: number; timeoutMs: number }
): { cmd: string; args: string[] } {
  const os = osFamily()
  if (os === 'win') {
    // -h макс. хопов, -w таймаут мс, -d без резолва (резолвим сами)
    return {
      cmd: 'tracert',
      args: ['-d', '-h', String(opts.maxHops), '-w', String(opts.timeoutMs), host]
    }
  }
  // unix traceroute: -m макс. хопов, -w таймаут (сек), -n без резолва
  const sec = Math.max(1, Math.ceil(opts.timeoutMs / 1000))
  return {
    cmd: 'traceroute',
    args: ['-n', '-m', String(opts.maxHops), '-w', String(sec), host]
  }
}

/** Аргументы для чтения ARP-таблицы. */
export function arpArgs(): { cmd: string; args: string[] } {
  // 'arp -a' работает на Win/mac/linux, формат вывода различается —
  // парсер должен учитывать osFamily().
  return { cmd: 'arp', args: ['-a'] }
}
