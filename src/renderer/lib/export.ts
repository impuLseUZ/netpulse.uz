/**
 * Экспорт результатов сканера в CSV/JSON и скачивание через Blob.
 * Работает в renderer (браузерный контекст), без обращения к main.
 */
import type { ScanHost } from '@shared/scanner-types'

function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function ts(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
}

export function exportJson(hosts: ScanHost[]): void {
  download(`netpulse-scan-${ts()}.json`, JSON.stringify(hosts, null, 2), 'application/json')
}

export function exportCsv(hosts: ScanHost[]): void {
  const header = ['IP', 'Status', 'Hostname', 'MAC', 'Vendor', 'Time(ms)']
  const escape = (v: string): string =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
  const rows = hosts.map((h) =>
    [
      h.ip,
      h.alive ? 'online' : 'offline',
      h.hostname ?? '',
      h.mac ?? '',
      h.vendor ?? '',
      h.timeMs?.toString() ?? ''
    ]
      .map((c) => escape(String(c)))
      .join(',')
  )
  download(`netpulse-scan-${ts()}.csv`, [header.join(','), ...rows].join('\n'), 'text/csv')
}
