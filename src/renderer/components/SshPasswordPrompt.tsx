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
import { Modal, Input, Button, Banner } from '@/components/ui'
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

  const handleSaveToggle = (): void => {
    if (!save) {
      setShowWarning(true)
    } else {
      setSave(false)
      setShowWarning(false)
    }
  }

  const handleConfirmSave = (): void => {
    setSave(true)
    setShowWarning(false)
  }

  return (
    <Modal open onClose={onCancel} widthClassName="max-w-sm">
      <div className="flex items-center gap-2 -mt-1 mb-1">
        <Terminal size={16} className="text-accent" />
        <span className="font-semibold text-fg text-sm">{profile.label}</span>
      </div>
      <p className="text-xs text-muted mb-4">
        {profile.username}@{profile.host}:{profile.port}
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-muted font-medium mb-1.5">{t('ssh.password')}</label>
          <div className="relative">
            <Input
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              mono={false}
              type={show ? 'text' : 'password'}
              className="pr-9"
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

        <label className="flex items-center gap-2.5 cursor-pointer select-none group">
          <div
            onClick={handleSaveToggle}
            className={[
              'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
              save ? 'bg-accent border-accent' : 'border-border group-hover:border-accent/60'
            ].join(' ')}
          >
            {save && (
              <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 text-accent-fg fill-current">
                <path
                  d="M1 4l2.5 2.5L9 1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          <span onClick={handleSaveToggle} className="text-sm text-fg">
            {t('ssh.savePassword')}
          </span>
        </label>

        {showWarning && (
          <Banner
            tone="warn"
            icon={ShieldAlert}
            footer={
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => setShowWarning(false)}>
                  {t('ssh.savePasswordDecline')}
                </Button>
                <Button size="sm" variant="secondary" className="flex-1 !text-warn !border-warn/40" onClick={handleConfirmSave}>
                  {t('ssh.savePasswordConfirm')}
                </Button>
              </div>
            }
          >
            {t('ssh.savePasswordWarning')}
          </Banner>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-5 -mb-1">
        <Button variant="secondary" onClick={onCancel}>
          {t('ssh.cancel')}
        </Button>
        <Button variant="primary" onClick={submit} disabled={!password}>
          {t('ssh.connect')}
        </Button>
      </div>
    </Modal>
  )
}
