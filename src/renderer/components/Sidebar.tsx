import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Network } from 'lucide-react'
import { NAV_ITEMS, SETTINGS_ITEM, type NavItem } from '@/lib/nav'
import { useNavStore } from '@/store/nav'
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
    void window.netpulse.netinfo.getAddresses().then((res: IpcResult<NetAddresses>) => {
      if (alive && res.ok) setAddr(res.data)
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
          'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors',
          isActive
            ? 'bg-accent text-accent-fg'
            : 'text-muted hover:bg-surface-2 hover:text-fg'
        ].join(' ')}
      >
        <Icon size={18} strokeWidth={2} />
        <span>{t(`nav.${item.labelKey}`)}</span>
      </button>
    )
  }

  return (
    <aside className="w-60 shrink-0 h-full bg-surface border-r border-border flex flex-col">
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-ok animate-pulse" />
          <span className="font-semibold text-lg tracking-tight">NetPulse</span>
        </div>
        <p className="text-xs text-muted mt-1">{tagline}</p>

        {addr && (addr.external || addr.local) && (
          <div className="mt-3 space-y-1">
            {addr.external && (
              <div
                className="flex items-center gap-1.5 text-[11px] text-muted"
                title={t('app.externalIp')}
              >
                <Globe size={12} className="shrink-0" />
                <span className="font-mono truncate">{addr.external}</span>
              </div>
            )}
            {addr.local && (
              <div
                className="flex items-center gap-1.5 text-[11px] text-muted"
                title={
                  addr.ifaceName
                    ? `${t('app.localIp')} · ${addr.ifaceName}`
                    : t('app.localIp')
                }
              >
                <Network size={12} className="shrink-0" />
                <span className="font-mono truncate">{addr.local}</span>
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
