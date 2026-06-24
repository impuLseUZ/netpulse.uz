/**
 * SshProfileForm — модальный диалог создания / редактирования SSH-профиля.
 * Также используется как диалог ввода пароля при подключении
 * (когда профиль сохранён без пароля / с ключевой авторизацией).
 */
import { useState } from 'react'
import { X, Eye, EyeOff, Key, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SshProfile, SshAuthType } from '@shared/ssh-types'

interface Props {
  /** Профиль для редактирования. Если null — создание нового. */
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
  const [password, setPassword] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [note, setNote] = useState(profile?.note ?? '')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!host.trim()) e.host = t('ssh.errorRequired')
    if (!username.trim()) e.username = t('ssh.errorRequired')
    const portNum = parseInt(port, 10)
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) e.port = t('ssh.errorPort')
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
      password: password || undefined,
      privateKey: privateKey || undefined,
      note: note.trim() || undefined,
      lastConnectedAt: profile?.lastConnectedAt,
    })
  }

  const inputCls =
    'w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent'
  const labelCls = 'block text-xs text-muted mb-1 font-medium'
  const errorCls = 'text-xs text-error mt-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        {/* Заголовок */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-semibold text-fg">
            {profile?.id ? t('ssh.editProfile') : t('ssh.newProfile')}
          </h2>
          <button
            onClick={onCancel}
            className="text-muted hover:text-fg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Тело */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {/* Название */}
          <div>
            <label className={labelCls}>{t('ssh.profileLabel')}</label>
            <input
              className={inputCls}
              placeholder={t('ssh.profileLabelPlaceholder')}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          {/* Хост + Порт */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelCls}>{t('ssh.host')}</label>
              <input
                className={`${inputCls} ${errors.host ? 'border-error' : ''}`}
                placeholder="192.168.1.1"
                value={host}
                onChange={(e) => setHost(e.target.value)}
              />
              {errors.host && <p className={errorCls}>{errors.host}</p>}
            </div>
            <div className="w-24">
              <label className={labelCls}>{t('ssh.port')}</label>
              <input
                className={`${inputCls} ${errors.port ? 'border-error' : ''}`}
                placeholder="22"
                value={port}
                onChange={(e) => setPort(e.target.value)}
              />
              {errors.port && <p className={errorCls}>{errors.port}</p>}
            </div>
          </div>

          {/* Пользователь */}
          <div>
            <label className={labelCls}>{t('ssh.username')}</label>
            <input
              className={`${inputCls} ${errors.username ? 'border-error' : ''}`}
              placeholder="root"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            {errors.username && <p className={errorCls}>{errors.username}</p>}
          </div>

          {/* Тип авторизации */}
          <div>
            <label className={labelCls}>{t('ssh.authType')}</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAuthType('password')}
                className={[
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors',
                  authType === 'password'
                    ? 'bg-accent text-accent-fg border-accent'
                    : 'border-border text-muted hover:text-fg',
                ].join(' ')}
              >
                <Lock size={14} />
                {t('ssh.authPassword')}
              </button>
              <button
                onClick={() => setAuthType('key')}
                className={[
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors',
                  authType === 'key'
                    ? 'bg-accent text-accent-fg border-accent'
                    : 'border-border text-muted hover:text-fg',
                ].join(' ')}
              >
                <Key size={14} />
                {t('ssh.authKey')}
              </button>
            </div>
          </div>

          {/* Пароль */}
          {authType === 'password' && (
            <div>
              <label className={labelCls}>{t('ssh.password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`${inputCls} pr-9`}
                  placeholder={t('ssh.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-xs text-muted mt-1">{t('ssh.passwordHint')}</p>
            </div>
          )}

          {/* Приватный ключ */}
          {authType === 'key' && (
            <div>
              <label className={labelCls}>{t('ssh.privateKey')}</label>
              <textarea
                className={`${inputCls} font-mono text-xs resize-none h-28`}
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
              />
              {/* Passphrase для ключа */}
              <label className={`${labelCls} mt-3`}>{t('ssh.passphrase')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`${inputCls} pr-9`}
                  placeholder={t('ssh.passphrasePlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {/* Заметка */}
          <div>
            <label className={labelCls}>{t('ssh.note')}</label>
            <input
              className={inputCls}
              placeholder={t('ssh.notePlaceholder')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-border text-muted hover:text-fg transition-colors"
          >
            {t('ssh.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-lg bg-accent text-accent-fg hover:opacity-90 transition-opacity"
          >
            {t('ssh.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
