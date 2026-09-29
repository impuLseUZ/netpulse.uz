import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Network } from 'lucide-react'
import { NAV_ITEMS, SETTINGS_ITEM, type NavItem } from '@/lib/nav'
import { useNavStore } from '@/store/nav'
import { PulseTrace } from '@/components/ui'
import type { NetAddresses } from '@shared/netinfo-types'
import type { IpcResult } from '@shared/types'

export function Sidebar(): JSX.Element {
  const { t } = useTranslation()
  const active = useNavStore((s) => s.active)
  const setActive = useNavStore((s) => s.setActive)
  const tagline = t('app.tagline')

  const [addr, setAddr] = useState<NetAddresses | null>(null)

  useEffect(() => {
    let alive = true
    // Защита: если bridge без netinfo (несовпадение версий preload),
    // не роняем весь UI — просто не показываем адреса.
    const api = window.netpulse?.netinfo
    if (!api?.getAddresses) return
    void api
      .getAddresses()
      .then((res: IpcResult<NetAddresses>) => {
        if (alive && res.ok) setAddr(res.data)
      })
      .catch(() => {
        /* недоступно — оставляем шапку без IP */
      })
    return () => {
      alive = false
    }
  }, [])

  const renderItem = (item: NavItem): JSX.Element => {
    const Icon = item.icon
    const isActive = active === item.id
    return (
      <button
        key={item.id}
        onClick={() => setActive(item.id)}
        className={[
          'group relative flex items-center gap-3 w-full px-3 py-2 rounded-control text-sm font-medium transition-colors duration-150 ease-out',
          isActive
            ? 'bg-accent/12 text-accent'
            : 'text-muted hover:bg-surface-2 hover:text-fg'
        ].join(' ')}
      >
        {isActive && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent" />
        )}
        <Icon size={17} strokeWidth={2} className="shrink-0" />
        <span>{t(`nav.${item.labelKey}`)}</span>
      </button>
    )
  }

  return (
    <aside className="w-60 shrink-0 h-full bg-surface border-r border-border flex flex-col">
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <PulseTrace width={30} height={13} />
          <span className="font-semibold text-[15px] tracking-tight">NetPulse</span>
        </div>
        <p className="text-[11px] text-muted mt-1">{tagline}</p>

        {addr && (addr.external || addr.local) && (
          <div className="mt-3 space-y-1.5">
            {addr.external && (
              <div className="flex items-center gap-1.5 text-[11px]" title={t('app.externalIp')}>
                <Globe size={12} className="shrink-0 text-muted" />
                <span className="text-muted/70 shrink-0">{t('app.externalIp')}</span>
                <span className="font-mono tabular-nums truncate text-fg/80">{addr.external}</span>
              </div>
            )}
            {addr.local && (
              <div
                className="flex items-center gap-1.5 text-[11px]"
                title={addr.ifaceName ? `${t('app.localIp')} · ${addr.ifaceName}` : t('app.localIp')}
              >
                <Network size={12} className="shrink-0 text-muted" />
                <span className="text-muted/70 shrink-0">{t('app.localIp')}</span>
                <span className="font-mono tabular-nums truncate text-fg/80">{addr.local}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(renderItem)}
      </nav>

      <div className="p-3 border-t border-border">{renderItem(SETTINGS_ITEM)}</div>
    </aside>
  )
}