/**
 * FirewallWarning — баннер с объяснением ограничений фаервола.
 *
 * Показывается в SpeedtestPage когда preflight выявил блокировку.
 * Даёт пользователю конкретное объяснение (Kerio / MikroTik / FortiGate)
 * и сообщает какой метод замера будет использован.
 */

import { AlertTriangle, ShieldX, WifiOff, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { FirewallHint } from '@/lib/speedtest-preflight'

interface FirewallWarningProps {
  hint: FirewallHint
  usedFallback: boolean
}

interface HintConfig {
  Icon: typeof AlertTriangle
  colorClass: string
  bgClass: string
  borderClass: string
}

const HINT_CONFIG: Record<FirewallHint, HintConfig> = {
  ok: {
    Icon: Info,
    colorClass:  'text-blue-400',
    bgClass:     'bg-blue-950/30',
    borderClass: 'border-blue-800/50',
  },
  timing_blocked: {
    Icon: AlertTriangle,
    colorClass:  'text-yellow-400',
    bgClass:     'bg-yellow-950/30',
    borderClass: 'border-yellow-800/50',
  },
  cf_blocked: {
    Icon: AlertTriangle,
    colorClass:  'text-orange-400',
    bgClass:     'bg-orange-950/30',
    borderClass: 'border-orange-800/50',
  },
  ssl_error: {
    Icon: ShieldX,
    colorClass:  'text-red-400',
    bgClass:     'bg-red-950/30',
    borderClass: 'border-red-800/50',
  },
  no_internet: {
    Icon: WifiOff,
    colorClass:  'text-red-400',
    bgClass:     'bg-red-950/30',
    borderClass: 'border-red-800/50',
  },
  unknown: {
    Icon: Info,
    colorClass:  'text-blue-400',
    bgClass:     'bg-blue-950/30',
    borderClass: 'border-blue-800/50',
  },
}

export function FirewallWarning({ hint, usedFallback }: FirewallWarningProps): JSX.Element | null {
  const { t } = useTranslation()

  // Не показываем если всё ок и fallback не использовался
  if (hint === 'ok' && !usedFallback) return null

  const cfg = HINT_CONFIG[hint]
  const { Icon } = cfg

  const title = t(`speedtest.firewall.${hint}.title`)
  const body  = t(`speedtest.firewall.${hint}.body`)

  if (!title && !body) return null

  return (
    <div
      className={`rounded-lg border ${cfg.borderClass} ${cfg.bgClass} px-4 py-3 mb-4 flex gap-3 items-start`}
    >
      <Icon size={15} className={`${cfg.colorClass} mt-0.5 shrink-0`} />
      <div className="text-sm leading-relaxed min-w-0">
        <div className={`font-medium mb-0.5 ${cfg.colorClass}`}>{title}</div>
        <div className="text-muted text-xs">{body}</div>
        {usedFallback && (
          <div className="mt-1.5 text-xs text-muted opacity-60">
            {t('speedtest.firewall.fallback_note')}
          </div>
        )}
      </div>
    </div>
  )
}