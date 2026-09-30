/**
 * Типы для менеджера SSH-ключей.
 * Приватный ключ никогда не хранится в renderer-состоянии дольше одного
 * явного запроса на экспорт — во всём остальном renderer видит только
 * публичные метаданные (как и профили SSH).
 */
export type SshKeyType = 'ed25519' | 'rsa'

export interface SshKeyMeta {
  id: string
  label: string
  type: SshKeyType
  bits?: number
  /** "ssh-ed25519 AAAA... comment" — можно сразу класть в authorized_keys. */
  publicKey: string
  /** "SHA256:xxxx" — как в выводе ssh-keygen -lf. */
  fingerprint: string
  createdAt: number
  hasPassphrase: boolean
}

export interface SshKeyGenerateQuery {
  label: string
  type: SshKeyType
  /** Только для RSA: 2048 | 3072 | 4096. */
  bits?: number
  passphrase?: string
  comment?: string
}

export interface SshKeyImportQuery {
  label: string
  privateKey: string
  passphrase?: string
}

export interface SshKeyExportResult {
  privateKey: string
  hasPassphrase: boolean
}
