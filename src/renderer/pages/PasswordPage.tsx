import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check, RefreshCw, KeyRound } from 'lucide-react'
import { Button, ProgressBar, PageContainer, PageHeader } from '@/components/ui'
import {
  generatePassword,
  estimateStrength,
  PASSWORD_LIMITS,
  type PasswordOptions,
  type StrengthLevel
} from '@shared/password'

const STRENGTH_TONE: Record<StrengthLevel, 'danger' | 'warn' | 'accent' | 'ok'> = {
  weak: 'danger',
  fair: 'warn',
  good: 'accent',
  strong: 'ok'
}

export function PasswordPage(): JSX.Element {
  const { t } = useTranslation()
  const [opts, setOpts] = useState<PasswordOptions>({
    length: 16,
    digits: true,
    lowercase: true,
    uppercase: true,
    symbols: true,
    excludeSimilar: false
  })
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const noSetSelected =
    !opts.digits && !opts.lowercase && !opts.uppercase && !opts.symbols

  const regenerate = useCallback((): void => {
    try {
      setPassword(generatePassword(opts))
      setError(null)
    } catch (e) {
      setPassword('')
      setError((e as Error).message)
    }
  }, [opts])

  // Перегенерация при любом изменении опций.
  useEffect(() => {
    regenerate()
  }, [regenerate])

  const strength = useMemo(
    () => (password ? estimateStrength(password, opts) : null),
    [password, opts]
  )

  const copy = async (): Promise<void> => {
    if (!password) return
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* буфер недоступен */
    }
  }

  const toggle = (key: keyof PasswordOptions) => (): void =>
    setOpts((o) => ({ ...o, [key]: !o[key] }))

  const checks: { key: keyof PasswordOptions; label: string }[] = [
    { key: 'digits', label: t('password.digits') },
    { key: 'lowercase', label: t('password.lowercase') },
    { key: 'uppercase', label: t('password.uppercase') },
    { key: 'symbols', label: t('password.symbols') }
  ]

  return (
    <PageContainer maxWidth="max-w-2xl">
      <PageHeader icon={KeyRound} title={t('nav.password')} />

      {/* Поле пароля */}
      <div className="flex gap-2 mb-2">
        <div className="flex-1 px-4 py-3 rounded-control bg-surface-2 border border-border font-mono tabular-nums text-lg break-all min-h-[3.25rem] flex items-center">
          {password || <span className="text-muted text-sm">—</span>}
        </div>
        <Button variant="secondary" onClick={copy} disabled={!password} title={t('password.copy')} className="px-3">
          {copied ? <Check size={18} className="text-ok" /> : <Copy size={18} />}
        </Button>
        <Button variant="primary" onClick={regenerate} title={t('password.regenerate')} className="px-3">
          <RefreshCw size={18} />
        </Button>
      </div>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {/* Индикатор стойкости */}
      {strength && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted">{t('password.strength')}</span>
            <span className="text-muted font-mono tabular-nums">
              {t(`password.level.${strength.level}`)} · {strength.bits} {t('password.bits')}
            </span>
          </div>
          <ProgressBar fraction={strength.fraction} tone={STRENGTH_TONE[strength.level]} />
        </div>
      )}

      {/* Длина */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-muted">{t('password.length')}</label>
          <span className="text-sm font-mono tabular-nums">{opts.length}</span>
        </div>
        <input
          type="range"
          min={PASSWORD_LIMITS.min}
          max={PASSWORD_LIMITS.max}
          value={opts.length}
          onChange={(e) => setOpts((o) => ({ ...o, length: Number(e.target.value) }))}
          className="w-full accent-[rgb(var(--accent))]"
        />
      </div>

      {/* Наборы символов */}
      <div className="space-y-2">
        {checks.map((c) => (
          <label
            key={c.key}
            className="flex items-center gap-3 px-4 py-2.5 rounded-control bg-surface border border-border cursor-pointer hover:border-border-strong transition-colors"
          >
            <input
              type="checkbox"
              checked={Boolean(opts[c.key])}
              onChange={toggle(c.key)}
              className="accent-[rgb(var(--accent))] w-4 h-4"
            />
            <span className="text-sm">{c.label}</span>
          </label>
        ))}

        <label className="flex items-center gap-3 px-4 py-2.5 rounded-control bg-surface border border-border cursor-pointer hover:border-border-strong transition-colors">
          <input
            type="checkbox"
            checked={Boolean(opts.excludeSimilar)}
            onChange={toggle('excludeSimilar')}
            className="accent-[rgb(var(--accent))] w-4 h-4"
          />
          <span className="text-sm">{t('password.excludeSimilar')}</span>
        </label>
      </div>

      {noSetSelected && <p className="text-warn text-xs mt-3">{t('password.noSet')}</p>}
    </PageContainer>
  )
}
