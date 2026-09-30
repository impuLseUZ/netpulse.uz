/**
 * Менеджер SSH-ключей. Работает в main process.
 *
 * Генерация и парсинг — через ssh2.utils (genKeyPairSync/parseKey), тот же
 * пакет, что используется для самих SSH-соединений: формат приватного ключа
 * гарантированно совместим (OpenSSH), а публичный ключ и fingerprint
 * выводятся из него же, без ручной ASN.1/base64-магии.
 *
 * Хранение — как у SSH-профилей (ssh.ts): electron-store + safeStorage.
 * Приватный ключ уходит в renderer только по явному запросу exportKey().
 */
import crypto from 'node:crypto'
import { safeStorage } from 'electron'
import { utils as ssh2Utils } from 'ssh2'
import type {
  SshKeyMeta,
  SshKeyType,
  SshKeyGenerateQuery,
  SshKeyImportQuery,
  SshKeyExportResult
} from '@shared/sshkeys-types'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Store = require('electron-store')

const store = new Store({
  name: 'ssh-keys',
  defaults: { keys: [] }
})

interface StoredKey extends SshKeyMeta {
  /** base64(safeStorage.encryptString(privateKeyPEM)). */
  privateKeyEnc: string
}

function encrypt(plain: string): string {
  if (!safeStorage.isEncryptionAvailable()) return plain
  return safeStorage.encryptString(plain).toString('base64')
}

function decrypt(cipher: string): string {
  if (!safeStorage.isEncryptionAvailable()) return cipher
  try {
    return safeStorage.decryptString(Buffer.from(cipher, 'base64'))
  } catch {
    return ''
  }
}

function fingerprint(publicKeyLine: string): string {
  const parts = publicKeyLine.trim().split(/\s+/)
  const blob = Buffer.from(parts[1] ?? '', 'base64')
  const hash = crypto.createHash('sha256').update(blob).digest('base64').replace(/=+$/, '')
  return `SHA256:${hash}`
}

function readAll(): StoredKey[] {
  return store.get('keys') as StoredKey[]
}

function writeAll(keys: StoredKey[]): void {
  store.set('keys', keys)
}

function stripPrivate(k: StoredKey): SshKeyMeta {
  const { privateKeyEnc: _privateKeyEnc, ...meta } = k
  return meta
}

export function listKeys(): SshKeyMeta[] {
  return readAll()
    .map(stripPrivate)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function generateKey(q: SshKeyGenerateQuery): SshKeyMeta {
  const label = q.label.trim()
  if (!label) throw new Error('Пустое название ключа')
  if (q.type !== 'ed25519' && q.type !== 'rsa') throw new Error('Неизвестный тип ключа')
  if (q.type === 'rsa' && ![2048, 3072, 4096].includes(q.bits ?? 4096)) {
    throw new Error('RSA: допустимая длина — 2048, 3072 или 4096 бит')
  }

  const comment = q.comment?.trim() || label
  const passphraseOpts = q.passphrase
    ? { passphrase: q.passphrase, cipher: 'aes256-ctr', rounds: 16 }
    : {}

  const kp =
    q.type === 'rsa'
      ? ssh2Utils.generateKeyPairSync('rsa', { bits: q.bits ?? 4096, comment, ...passphraseOpts })
      : ssh2Utils.generateKeyPairSync('ed25519', { comment, ...passphraseOpts })

  const meta: SshKeyMeta = {
    id: crypto.randomUUID(),
    label,
    type: q.type,
    bits: q.type === 'rsa' ? (q.bits ?? 4096) : undefined,
    publicKey: kp.public,
    fingerprint: fingerprint(kp.public),
    createdAt: Date.now(),
    hasPassphrase: !!q.passphrase
  }

  const keys = readAll()
  keys.push({ ...meta, privateKeyEnc: encrypt(kp.private) })
  writeAll(keys)
  return meta
}

export function importKey(q: SshKeyImportQuery): SshKeyMeta {
  const label = q.label.trim()
  if (!label) throw new Error('Пустое название ключа')
  const raw = q.privateKey.trim()
  if (!raw) throw new Error('Пустой приватный ключ')

  const key = ssh2Utils.parseKey(raw, q.passphrase)
  if (key instanceof Error) throw key

  const publicSsh = key.getPublicSSH()
  const type = key.type.includes('rsa') ? 'rsa' as SshKeyType : 'ed25519' as SshKeyType
  const publicKey = `${key.type} ${publicSsh.toString('base64')}${key.comment ? ` ${key.comment}` : ''}`

  const meta: SshKeyMeta = {
    id: crypto.randomUUID(),
    label,
    type,
    // RSA-размер для импортированного ключа не вычисляем — не критично для отображения.
    bits: undefined,
    publicKey,
    fingerprint: fingerprint(publicKey),
    createdAt: Date.now(),
    hasPassphrase: !!q.passphrase
  }

  const keys = readAll()
  // Импортируем как есть (с исходным шифрованием ключа, если оно было) —
  // проверка passphrase выше нужна только чтобы вывести публичный ключ/fingerprint.
  keys.push({ ...meta, privateKeyEnc: encrypt(raw) })
  writeAll(keys)
  return meta
}

export function deleteKey(id: string): void {
  writeAll(readAll().filter((k) => k.id !== id))
}

export function exportKey(id: string): SshKeyExportResult {
  const key = readAll().find((k) => k.id === id)
  if (!key) throw new Error('Ключ не найден')
  return { privateKey: decrypt(key.privateKeyEnc), hasPassphrase: key.hasPassphrase }
}
