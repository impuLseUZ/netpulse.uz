/**
 * SshProfileForm — диалог создания / редактирования SSH-профиля.
 *
 * Намеренно НЕ содержит поля пароля — пароль запрашивается отдельно
 * при каждом подключении через SshPasswordPrompt, где пользователь
 * сам решает сохранить его или нет.
 *
 * Приватный ключ (key auth) вставляется здесь, т.к. это не секрет
 * в обычном смысле — он хранится зашифрованным через safeStorage.
 */
import { useState } from 'react'
import { Key, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Modal, Input, Button, Pill } from '@/components/ui'
import type { SshProfile, SshAuthType } from '@shared/ssh-types'

interface Props {
  profile?: Partial<SshProfile> | null
  onSave: (profile: SshProfile) => void
  onCancel: () => void
}

function generateId(): string {
  return `ssh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function SshProfileForm({ profile, onSave, onCancel }: Props): JSX.Element {
  const { t } = useTranslation()

  const [label, setLabel] = useState(profile?.label ?? '')
  const [host, setHost] = useState(profile?.host ?? '')
  const [port, setPort] = useState(String(profile?.port ?? 22))
  const [username, setUsername] = useState(profile?.username ?? '')
  const [authType, setAuthType] = useState<SshAuthType>(profile?.authType ?? 'password')
  const [privateKey, setPrivateKey] = useState('')
  const [note, setNote] = useState(profile?.note ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!host.trim()) e.host = t('ssh.errorRequired')
    if (!username.trim()) e.username = t('ssh.errorRequired')
    const portNum = parseInt(port, 10)
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) e.port = t('ssh.errorPort')
    if (authType === 'key' && !privateKey.trim()) e.privateKey = t('ssh.errorRequired')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = (): void => {
    if (!validate()) return
    onSave({
      id: profile?.id ?? generateId(),
      label: label.trim() || `${username}@${host}`,
      host: host.trim(),
      port: parseInt(port, 10),
      username: username.trim(),
      authType,
      // Пароль НЕ сохраняем здесь — он запрашивается при подключении.
      // Приватный ключ сохраняем только для key-auth.
      privateKey: authType === 'key' ? privateKey.trim() || undefined : undefined,
      note: note.trim() || undefined,
      lastConnectedAt: profile?.lastConnectedAt
    })
  }

  const labelCls = 'block text-xs text-muted mb-1 font-medium'
  const errorCls = 'text-xs text-danger mt-1'

  return (
    <Modal
      open
      onClose={onCancel}
      title={profile?.id ? t('ssh.editProfile') : t('ssh.newProfile')}
      widthClassName="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {t('ssh.cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {t('ssh.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={labelCls}>{t('ssh.profileLabel')}</label>
          <Input
            mono={false}
            placeholder={t('ssh.profileLabelPlaceholder')}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className={labelCls}>{t('ssh.host')}</label>
            <Input
              className={errors.host ? 'border-danger' : undefined}
              placeholder="192.168.1.1"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
            {errors.host && <p className={errorCls}>{errors.host}</p>}
          </div>
          <div className="w-24">
            <label className={labelCls}>{t('ssh.port')}</label>
            <Input
              className={errors.port ? 'border-danger' : undefined}
              placeholder="22"
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
            {errors.port && <p className={errorCls}>{errors.port}</p>}
          </div>
        </div>

        <div>
          <label className={labelCls}>{t('ssh.username')}</label>
          <Input
            mono={false}
            className={errors.username ? 'border-danger' : undefined}
            placeholder="root"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          {errors.username && <p className={errorCls}>{errors.username}</p>}
        </div>

        <div>
          <label className={labelCls}>{t('ssh.authType')}</label>
          <div className="flex gap-2">
            <Pill active={authType === 'password'} onClick={() => setAuthType('password')} size="md">
              <span className="inline-flex items-center gap-1.5">
                <Lock size={13} />
                {t('ssh.authPassword')}
              </span>
            </Pill>
            <Pill active={authType === 'key'} onClick={() => setAuthType('key')} size="md">
              <span className="inline-flex items-center gap-1.5">
                <Key size={13} />
                {t('ssh.authKey')}
              </span>
            </Pill>
          </div>
        </div>

        {authType === 'password' && (
          <div className="rounded-control bg-surface-2 border border-border px-4 py-3">
            <p className="text-xs text-muted leading-relaxed">{t('ssh.passwordWillBeAsked')}</p>
          </div>
        )}

        {authType === 'key' && (
          <div>
            <label className={labelCls}>{t('ssh.privateKey')}</label>
            <textarea
              className={[
                'w-full bg-surface-2 border rounded-control px-3 py-2 text-xs font-mono text-fg placeholder:text-muted resize-none h-32 outline-none focus:border-accent focus:shadow-focus-ring',
                errors.privateKey ? 'border-danger' : 'border-border'
              ].join(' ')}
              placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
            />
            {errors.privateKey && <p className={errorCls}>{errors.privateKey}</p>}
            <p className="text-xs text-muted mt-1">{t('ssh.privateKeyHint')}</p>
          </div>
        )}

        <div>
          <label className={labelCls}>{t('ssh.note')}</label>
          <Input mono={false} placeholder={t('ssh.notePlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
