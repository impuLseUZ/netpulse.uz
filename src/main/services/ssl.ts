/**
 * SSL/TLS-сервис (расширение Модуля 5, DNS Lookup).
 * Подключается к host:port по TLS и извлекает данные сертификата.
 *
 * Использует встроенный node:tls (без сторонних пакетов, без shell).
 * Проверка доверия не блокирует получение данных: подключаемся с
 * rejectUnauthorized: false, а статус доверия читаем отдельно
 * (socket.authorized / authorizationError), чтобы показать сертификат
 * даже у самоподписанных/просроченных доменов.
 *
 * Требует интернет — как и WHOIS. Все ошибки оборачиваются понятно.
 */
import tls from 'node:tls'
import { SslQuery, SslResult } from '@shared/dns-types'

const DEFAULT_PORT = 443
const TIMEOUT_MS = 8000

/** Приводит значение поля сертификата (может быть string | string[]) к строке. */
function asStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0] || undefined
  return v || undefined
}

/** Извлекает имя из строки issuer/subject (предпочитает O, затем CN). */
function pickName(obj: tls.PeerCertificate['issuer'] | undefined): string | undefined {
  if (!obj) return undefined
  return asStr(obj.O) || asStr(obj.CN) || undefined
}

/** Парсит поле altNames вида "DNS:a.com, DNS:b.com" в массив имён. */
function parseAltNames(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim().replace(/^DNS:/i, ''))
    .filter(Boolean)
}

export async function sslLookup(query: SslQuery): Promise<SslResult> {
  const host = query.host.trim()
  if (!host) throw new Error('Пустой хост')
  // Убираем схему и путь, если пользователь вставил URL.
  const cleanHost = host.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').split(':')[0]
  const port = query.port && query.port > 0 ? query.port : DEFAULT_PORT
  const start = Date.now()

  return new Promise<SslResult>((resolve, reject) => {
    const socket = tls.connect(
      {
        host: cleanHost,
        port,
        servername: cleanHost, // SNI — обязательно для виртуального хостинга
        rejectUnauthorized: false, // не падать на самоподписанных/просроченных
        timeout: TIMEOUT_MS
      },
      () => {
        try {
          const cert = socket.getPeerCertificate(true)
          if (!cert || Object.keys(cert).length === 0) {
            socket.destroy()
            reject(new Error('Сертификат не получен (возможно, сервер не использует TLS)'))
            return
          }

          const validToMs = cert.valid_to ? Date.parse(cert.valid_to) : NaN
          const validFromMs = cert.valid_from ? Date.parse(cert.valid_from) : NaN
          const now = Date.now()
          const daysRemaining = Number.isNaN(validToMs)
            ? undefined
            : Math.floor((validToMs - now) / 86400000)
          const expired = !Number.isNaN(validToMs) ? validToMs < now : false

          const cipher = socket.getCipher()
          const result: SslResult = {
            host: cleanHost,
            port,
            subjectCN: asStr(cert.subject?.CN),
            altNames: parseAltNames(cert.subjectaltname),
            issuer: pickName(cert.issuer),
            validFrom: Number.isNaN(validFromMs) ? undefined : new Date(validFromMs).toISOString(),
            validTo: Number.isNaN(validToMs) ? undefined : new Date(validToMs).toISOString(),
            daysRemaining,
            expired,
            serialNumber: cert.serialNumber || undefined,
            fingerprint256: cert.fingerprint256 || undefined,
            protocol: socket.getProtocol() || undefined,
            cipher: cipher?.name || undefined,
            authorized: socket.authorized,
            authorizationError: socket.authorized
              ? undefined
              : String(socket.authorizationError ?? '') || undefined,
            elapsedMs: Date.now() - start
          }
          socket.end()
          resolve(result)
        } catch (err) {
          socket.destroy()
          reject(err instanceof Error ? err : new Error(String(err)))
        }
      }
    )

    socket.on('timeout', () => {
      socket.destroy()
      reject(new Error('Таймаут TLS-подключения'))
    })

    socket.on('error', (err: NodeJS.ErrnoException) => {
      // Понятные сообщения для частых случаев.
      let msg = err.message
      if (err.code === 'ENOTFOUND') msg = 'Хост не найден'
      else if (err.code === 'ECONNREFUSED') msg = 'Соединение отклонено (порт закрыт?)'
      else if (err.code === 'ETIMEDOUT') msg = 'Таймаут подключения'
      reject(new Error(msg))
    })
  })
}
