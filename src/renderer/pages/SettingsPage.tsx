import { useTranslation } from 'react-i18next'
import { RefreshCw, Settings } from 'lucide-react'
import { useAppStore } from '@/store/app'
import { useUpdaterStore } from '@/store/updater'
import { Button, Input, Pill, PageContainer, PageHeader, Toggle } from '@/components/ui'
import type { ThemeMode, Locale } from '@shared/types'

export function SettingsPage(): JSX.Element {
  const { t } = useTranslation()
  const settings = useAppStore((s) => s.settings)
  const platform = useAppStore((s) => s.platform)
  const update = useAppStore((s) => s.updateSettings)
  const updater = useUpdaterStore()

  const themes: ThemeMode[] = ['light', 'dark', 'system']
  const locales: Locale[] = ['ru', 'en', 'uz']

  const updateStatusText = (): string => {
    switch (updater.state.status) {
      case 'checking':
        return t('update.checking')
      case 'available':
        return t('update.available', { version: updater.state.info?.version ?? '' })
      case 'not-available':
        return t('update.notAvailable')
      case 'downloading':
        return t('update.downloading', { percent: Math.round(updater.state.progress?.percent ?? 0) })
      case 'downloaded':
        return t('update.downloaded')
      case 'error':
        return t('update.error')
      default:
        return ''
    }
  }

  return (
    <PageContainer maxWidth="max-w-2xl">
      <PageHeader icon={Settings} title={t('settings.title')} />

      <div className="space-y-6">
        <Field label={t('common.theme')}>
          <div className="flex gap-2">
            {themes.map((th) => (
              <Pill key={th} active={settings.theme === th} onClick={() => void update({ theme: th })} size="md">
                {t(`common.${th}`)}
              </Pill>
            ))}
          </div>
        </Field>

        <Field label={t('common.language')}>
          <div className="flex gap-2">
            {locales.map((lc) => (
              <Pill key={lc} active={settings.locale === lc} onClick={() => void update({ locale: lc })} size="md">
                {{ ru: 'Русский', en: 'English', uz: "O'zbekcha" }[lc]}
              </Pill>
            ))}
          </div>
        </Field>

        <Field label={t('common.concurrency')}>
          <Input
            type="number"
            min={1}
            max={1024}
            value={settings.concurrencyLimit}
            onChange={(e) => void update({ concurrencyLimit: Number(e.target.value) || 1 })}
            className="w-32 h-9"
          />
        </Field>

        <Field label={t('common.timeout')}>
          <Input
            type="number"
            min={100}
            max={60000}
            step={100}
            value={settings.defaultTimeoutMs}
            onChange={(e) => void update({ defaultTimeoutMs: Number(e.target.value) || 100 })}
            className="w-32 h-9"
          />
        </Field>

        {/* ── Секция обновлений (Модуль 7) ── */}
        <div className="pt-4 border-t border-border">
          <h3 className="text-sm font-semibold mb-4">{t('settings.updatesSection')}</h3>
          <div className="space-y-4">
            <Field label={t('settings.checkOnStart')}>
              <Toggle checked={settings.updateCheckOnStart} onChange={(v) => void update({ updateCheckOnStart: v })} />
            </Field>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted">{updateStatusText()}</span>
              <Button size="sm" variant="secondary" onClick={() => void updater.check()} disabled={updater.state.status === 'checking'}>
                <RefreshCw size={14} className={updater.state.status === 'checking' ? 'animate-spin' : ''} />
                {t('update.check')}
              </Button>
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
                {platform.rawSocketsAvailable ? t('settings.available') : t('settings.unavailable')}
              </span>
            </p>
            <p>
              {t('settings.version')}:{' '}
              <span className="text-fg font-mono tabular-nums">
                {platform.appVersion} · Electron {platform.electronVersion}
              </span>
            </p>
          </div>
        )}
      </div>
    </PageContainer>
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
