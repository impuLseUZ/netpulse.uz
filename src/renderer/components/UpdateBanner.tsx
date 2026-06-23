import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, RefreshCw, X, RotateCw, Sparkles } from 'lucide-react'
import { useUpdaterStore } from '@/store/updater'

/**
 * Баннер автообновления (Модуль 7).
 * Показывается, когда есть что показать: доступна версия / идёт загрузка /
 * загружено. Ошибки и 'checking'/'not-available' здесь не навязываем —
 * их место в Настройках.
 */
export function UpdateBanner(): JSX.Element | null {
  const { t } = useTranslation()
  const { state, dismissed, download, install, dismiss } = useUpdaterStore()
  const [showNotes, setShowNotes] = useState(false)

  const { status, info, progress } = state
  const isRelevant =
    status === 'available' || status === 'downloading' || status === 'downloaded'
  if (!isRelevant || dismissed) return null

  const version = info?.version ?? ''

  return (
    <div className="border-b border-border bg-surface-2">
      <div className="flex items-center gap-3 px-4 py-2.5 text-sm">
        <Sparkles size={16} className="text-accent shrink-0" />

        <div className="flex-1 min-w-0">
          {status === 'available' && (
            <span>{t('update.available', { version })}</span>
          )}
          {status === 'downloading' && (
            <span>
              {t('update.downloading', { percent: Math.round(progress?.percent ?? 0) })}
            </span>
          )}
          {status === 'downloaded' && <span>{t('update.downloaded')}</span>}
        </div>

        {info?.releaseNotes && (
          <button
            onClick={() => setShowNotes((v) => !v)}
            className="text-accent hover:underline shrink-0"
          >
            {t('update.whatsNew')}
          </button>
        )}

        {status === 'available' && (
          <button
            onClick={() => void download()}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-accent text-accent-fg shrink-0"
          >
            <Download size={14} />
            {t('update.download')}
          </button>
        )}

        {status === 'downloading' && (
          <RefreshCw size={16} className="text-muted animate-spin shrink-0" />
        )}

        {status === 'downloaded' && (
          <button
            onClick={() => void install()}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-ok text-white shrink-0"
          >
            <RotateCw size={14} />
            {t('update.install')}
          </button>
        )}

        <button
          onClick={dismiss}
          className="text-muted hover:text-fg shrink-0"
          aria-label={t('update.dismiss')}
        >
          <X size={16} />
        </button>
      </div>

      {showNotes && info?.releaseNotes && (
        <div className="px-4 pb-3">
          <div className="rounded-md bg-surface border border-border p-3 max-h-48 overflow-y-auto">
            <p className="text-xs font-semibold mb-2 text-muted">
              {t('update.notesTitle', { version })}
            </p>
            <pre className="text-xs whitespace-pre-wrap font-sans text-fg">
              {info.releaseNotes}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
