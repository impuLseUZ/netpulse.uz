/**
 * SshPasswordPrompt — диалог запроса пароля при подключении,
 * когда профиль сохранён без пароля.
 *
 * Содержит чекбокс «Сохранить пароль» с предупреждением о локальном хранении.
 * При подтверждении возвращает { password, save } через onConnect.
 */
import { useState } from 'react'
import { Eye, EyeOff, Terminal, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SshProfilePublic } from '@shared/ssh-types'

export interface PasswordConnectResult {
  password: string
  save: boolean
}

interface Props {
  profile: SshProfilePublic
  onConnect: (result: PasswordConnectResult) => void
  onCancel: () => void
}

export function SshPasswordPrompt({ profile, onConnect, onCancel }: Props): JSX.Element {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [save, setSave] = useState(false)
  const [showWarning, setShowWarning] = useState(false)

  const submit = (): void => {
    if (!password) return
    onConnect({ password, save })
  }

  // При попытке поставить галочку — сначала показать предупреждение.
  const handleSaveToggle = (): void => {
    if (!save) {
      // Пользователь хочет включить сохранение — показываем предупреждение.
      setShowWarning(true)
    } else {
      // Уже включено — выключаем без предупреждения.
      setSave(false)
      setShowWarning(false)
    }
  }

  // Пользователь принял предупреждение.
  const handleConfirmSave = (): void => {
    setSave(true)
    setShowWarning(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4">

        {/* Заголовок */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-accent" />
            <span className="font-semibold text-fg text-sm">{profile.label}</span>
          </div>
          <p className="text-xs text-muted mt-1">
            {profile.username}@{profile.host}:{profile.port}
          </p>
        </div>

        {/* Тело */}
        <div className="px-5 py-4 space-y-4">
          {/* Поле пароля */}
          <div>
            <label className="block text-xs text-muted font-medium mb-1.5">
              {t('ssh.password')}
            </label>
            <div className="relative">
              <input
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                type={show ? 'text' : 'password'}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-fg pr-9 focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder={t('ssh.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
              >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Чекбокс «Сохранить пароль» */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none group">
            <div
              onClick={handleSaveToggle}
              className={[
                'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                save
                  ? 'bg-accent border-accent'
                  : 'border-border group-hover:border-accent/60',
              ].join(' ')}
            >
              {save && (
                <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 text-accent-fg fill-current">
                  <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span
              onClick={handleSaveToggle}
              className="text-sm text-fg"
            >
              {t('ssh.savePassword')}
            </span>
          </label>

          {/* Предупреждение — появляется при нажатии на чекбокс */}
          {showWarning && (
            <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <ShieldAlert size={15} className="text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-200 leading-relaxed">
                  {t('ssh.savePasswordWarning')}
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowWarning(false)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border text-muted hover:text-fg transition-colors"
                >
                  {t('ssh.savePasswordDecline')}
                </button>
                <button
                  onClick={handleConfirmSave}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/30 transition-colors"
                >
                  {t('ssh.savePasswordConfirm')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-border text-muted hover:text-fg transition-colors"
          >
            {t('ssh.cancel')}
          </button>
          <button
            onClick={submit}
            disabled={!password}
            className="px-4 py-2 text-sm rounded-lg bg-accent text-accent-fg hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {t('ssh.connect')}
          </button>
        </div>
      </div>
    </div>
  )
}