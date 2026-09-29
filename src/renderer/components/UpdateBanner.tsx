/**
 * UpdateBanner — баннер уведомления о новой версии (Модуль 7).
 *
 * Логика упрощена: electron-updater убран, вместо него — запрос к GitHub API.
 * Пользователь скачивает новую версию сам по ссылке на GitHub Releases.
 *
 * Показывается только при status === 'available'.
 * Статусы 'downloading' / 'downloaded' больше не используются.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, X, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { useUpdaterStore } from '@/store/updater'
import { Button } from '@/components/ui'

export function UpdateBanner(): JSX.Element | null {
  const { t } = useTranslation()
  const { state, dismissed, dismiss } = useUpdaterStore()
  const [showNotes, setShowNotes] = useState(false)

  if (state.status !== 'available' || dismissed) return null

  const { info } = state
  const version = info?.version ?? ''
  const handleDownload = (): void => {
    // Открываем страницу релизов в браузере — пользователь скачивает сам.
    void window.netpulse.updater.download()
  }

  return (
    <div className="border-b border-accent/30 bg-accent/10 shrink-0">
      <div className="flex items-center gap-3 px-4 py-2.5 text-sm">
        {/* Иконка */}
        <Sparkles size={15} className="text-accent shrink-0" />

        {/* Текст */}
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="text-fg font-medium">
            {t('update.available', { version })}
          </span>
          {info?.releaseName && (
            <span className="text-muted text-xs">· {info.releaseName}</span>
          )}
        </div>

        {/* Кнопка «Что нового» */}
        {info?.releaseNotes && (
          <button
            onClick={() => setShowNotes((v) => !v)}
            className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors shrink-0"
          >
            {t('update.whatsNew')}
            {showNotes ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}

        {/* Кнопка скачивания → открывает GitHub */}
        <Button variant="primary" size="sm" onClick={handleDownload} className="shrink-0">
          <ExternalLink size={13} />
          {t('update.downloadFromGithub')}
        </Button>

        {/* Закрыть баннер */}
        <button
          onClick={dismiss}
          className="text-muted hover:text-fg transition-colors shrink-0"
          title={t('update.dismiss')}
        >
          <X size={15} />
        </button>
      </div>

      {/* Release notes */}
      {showNotes && info?.releaseNotes && (
        <div className="px-4 pb-3">
          <div className="rounded-control bg-surface border border-border p-3 max-h-48 overflow-y-auto">
            <p className="text-xs font-semibold mb-2 text-muted">
              {t('update.notesTitle', { version })}
            </p>
            <pre className="text-xs whitespace-pre-wrap font-sans text-fg leading-relaxed">
              {info.releaseNotes}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}