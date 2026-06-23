import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'
import { useAppStore } from '@/store/app'
import { useUpdaterStore } from '@/store/updater'
import type { ThemeMode, Locale } from '@shared/types'

export function SettingsPage(): JSX.Element {
  const { t } = useTranslation()
  const settings = useAppStore((s) => s.settings)
  const platform = useAppStore((s) => s.platform)
  const update = useAppStore((s) => s.updateSettings)
  const updater = useUpdaterStore()

  const themes: ThemeMode[] = ['light', 'dark', 'system']
  const locales: Locale[] = ['ru', 'en']

  const updateStatusText = (): string => {
    switch (updater.state.status) {
      case 'checking':
        return t('update.checking')
      case 'available':
        return t('update.available', { version: updater.state.info?.version ?? '' })
      case 'not-available':
        return t('update.notAvailable')
      case 'downloading':
        return t('update.downloading', {
          percent: Math.round(updater.state.progress?.percent ?? 0)
        })
      case 'downloaded':
        return t('update.downloaded')
      case 'error':
        return t('update.error')
      default:
        return ''
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto w-full">
      <h2 className="text-xl font-semibold mb-6">{t('settings.title')}</h2>

      <div className="space-y-6">
        <Field label={t('common.theme')}>
          <div className="flex gap-2">
            {themes.map((th) => (
              <Choice
                key={th}
                active={settings.theme === th}
                onClick={() => void update({ theme: th })}
              >
                {t(`common.${th}`)}
              </Choice>
            ))}
          </div>
        </Field>

        <Field label={t('common.language')}>
          <div className="flex gap-2">
            {locales.map((lc) => (
              <Choice
                key={lc}
                active={settings.locale === lc}
                onClick={() => void update({ locale: lc })}
              >
                {lc.toUpperCase()}
              </Choice>
            ))}
          </div>
        </Field>

        <Field label={t('common.concurrency')}>
          <input
            type="number"
            min={1}
            max={1024}
            value={settings.concurrencyLimit}
            onChange={(e) =>
              void update({ concurrencyLimit: Number(e.target.value) || 1 })
            }
            className="w-32 px-3 py-1.5 rounded-md bg-surface-2 border border-border text-sm outline-none focus:border-accent"
          />
        </Field>

        <Field label={t('common.timeout')}>
          <input
            type="number"
            min={100}
            max={60000}
            step={100}
            value={settings.defaultTimeoutMs}
            onChange={(e) =>
              void update({ defaultTimeoutMs: Number(e.target.value) || 100 })
            }
            className="w-32 px-3 py-1.5 rounded-md bg-surface-2 border border-border text-sm outline-none focus:border-accent"
          />
        </Field>

        {/* ── Секция обновлений (Модуль 7) ── */}
        <div className="pt-4 border-t border-border">
          <h3 className="text-sm font-semibold mb-4">{t('settings.updatesSection')}</h3>
          <div className="space-y-4">
            <Field label={t('settings.checkOnStart')}>
              <Toggle
                value={settings.updateCheckOnStart}
                onChange={(v) => void update({ updateCheckOnStart: v })}
              />
            </Field>
            <Field label={t('settings.autoDownload')}>
              <Toggle
                value={settings.updateAutoDownload}
                onChange={(v) => void update({ updateAutoDownload: v })}
              />
            </Field>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted">{updateStatusText()}</span>
              <button
                onClick={() => void updater.check()}
                disabled={updater.state.status === 'checking'}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-2 border border-border text-sm hover:text-fg disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={updater.state.status === 'checking' ? 'animate-spin' : ''}
                />
                {t('update.check')}
              </button>
            </div>
          </div>
        </div>

        {platform && (
          <div className="pt-4 border-t border-border text-sm text-muted space-y-1">
            <p>
              {t('settings.platform')}: <span className="text-fg">{platform.platform}</span>
            </p>
            <p>
              {t('settings.rawSockets')}:{' '}
              <span className={platform.rawSocketsAvailable ? 'text-ok' : 'text-warn'}>
                {platform.rawSocketsAvailable
                  ? t('settings.available')
                  : t('settings.unavailable')}
              </span>
            </p>
            <p>
              {t('settings.version')}:{' '}
              <span className="text-fg font-mono">
                {platform.appVersion} · Electron {platform.electronVersion}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  )
}

function Choice({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-1.5 rounded-md text-sm transition-colors border',
        active
          ? 'bg-accent text-accent-fg border-accent'
          : 'bg-surface-2 text-muted border-border hover:text-fg'
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function Toggle({
  value,
  onChange
}: {
  value: boolean
  onChange: (v: boolean) => void
}): JSX.Element {
  return (
    <button
      onClick={() => onChange(!value)}
      className={[
        'relative w-11 h-6 rounded-full transition-colors',
        value ? 'bg-accent' : 'bg-surface-2 border border-border'
      ].join(' ')}
      role="switch"
      aria-checked={value}
    >
      <span
        className={[
          'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform',
          value ? 'translate-x-5' : 'translate-x-0.5'
        ].join(' ')}
      />
    </button>
  )
}
