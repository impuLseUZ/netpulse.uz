/**
 * FirewallWarning — баннер с объяснением ограничений фаервола.
 *
 * Показывается в SpeedtestPage когда preflight выявил блокировку.
 * Даёт пользователю конкретное объяснение (Kerio / MikroTik / FortiGate)
 * и сообщает какой метод замера будет использован.
 */

import { AlertTriangle, ShieldX, WifiOff, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Banner } from '@/components/ui'
import type { FirewallHint } from '@/lib/speedtest-preflight'

interface FirewallWarningProps {
  hint: FirewallHint
  usedFallback: boolean
}

const HINT_CONFIG: Record<FirewallHint, { icon: typeof AlertTriangle; tone: 'info' | 'warn' | 'danger' }> = {
  ok: { icon: Info, tone: 'info' },
  timing_blocked: { icon: AlertTriangle, tone: 'warn' },
  cf_blocked: { icon: AlertTriangle, tone: 'warn' },
  ssl_error: { icon: ShieldX, tone: 'danger' },
  no_internet: { icon: WifiOff, tone: 'danger' },
  unknown: { icon: Info, tone: 'info' }
}

export function FirewallWarning({ hint, usedFallback }: FirewallWarningProps): JSX.Element | null {
  const { t } = useTranslation()

  // Не показываем если всё ок и fallback не использовался
  if (hint === 'ok' && !usedFallback) return null

  const cfg = HINT_CONFIG[hint]
  const title = t(`speedtest.firewall.${hint}.title`)
  const body = t(`speedtest.firewall.${hint}.body`)

  if (!title && !body) return null

  return (
    <Banner
      tone={cfg.tone}
      icon={cfg.icon}
      title={title}
      className="mb-4"
      footer={
        usedFallback && (
          <div className="mt-1.5 text-[11px] text-muted opacity-70">
            {t('speedtest.firewall.fallback_note')}
          </div>
        )
      }
    >
      {body}
    </Banner>
  )
}
