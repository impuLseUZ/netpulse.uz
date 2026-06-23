/**
 * Чтение ARP-таблицы и парсинг по формату ОС.
 * Возвращает карту IP -> MAC (нормализованный, нижний регистр, разделитель ':').
 */
import { osFamily } from './platform'
import { arpArgs } from './platform'
import { run } from '../services/proc'

/** Нормализует MAC к виду aa:bb:cc:dd:ee:ff. */
export function normalizeMac(raw: string): string | undefined {
  const hex = raw.replace(/[^0-9a-fA-F]/g, '')
  if (hex.length !== 12) return undefined
  return (hex.match(/.{2}/g) as string[]).join(':').toLowerCase()
}

/** Парсит вывод arp -a. На Windows и Unix форматы разные. */
export function parseArpTable(output: string): Map<string, string> {
  const map = new Map<string, string>()
  const os = osFamily()
  const lines = output.split(/\r?\n/)

  for (const line of lines) {
    if (os === 'win') {
      // Windows: "  192.168.1.1     aa-bb-cc-dd-ee-ff   dynamic"
      const m = line.match(
        /(\d{1,3}(?:\.\d{1,3}){3})\s+([0-9a-fA-F]{2}(?:[-:][0-9a-fA-F]{2}){5})/
      )
      if (m) {
        const mac = normalizeMac(m[2])
        if (mac) map.set(m[1], mac)
      }
    } else {
      // Unix: "host (192.168.1.1) at aa:bb:cc:dd:ee:ff [ether] on en0"
      const m = line.match(
        /\((\d{1,3}(?:\.\d{1,3}){3})\)\s+at\s+([0-9a-fA-F:]{17}|[0-9a-fA-F:]{1,17})/
      )
      if (m) {
        const mac = normalizeMac(m[2])
        if (mac) map.set(m[1], mac)
      }
    }
  }
  return map
}

/** Читает ARP-таблицу системы. */
export async function readArpTable(): Promise<Map<string, string>> {
  const { cmd, args } = arpArgs()
  const res = await run(cmd, args, { timeoutMs: 5000, encoding: 'latin1' })
  return parseArpTable(res.stdout)
}
