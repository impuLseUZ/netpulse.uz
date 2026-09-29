import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Waypoints } from 'lucide-react'
import { PingTab } from './PingTab'
import { PortTab } from './PortTab'
import { PageContainer, PageHeader, Pill, PillGroup } from '@/components/ui'

type Tab = 'ping' | 'port'

export function PingPortPage(): JSX.Element {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('ping')

  return (
    <PageContainer maxWidth="max-w-3xl">
      <PageHeader icon={Waypoints} title={t('nav.pingport')} />

      <PillGroup>
        <Pill active={tab === 'ping'} onClick={() => setTab('ping')}>
          {t('pingport.tabPing')}
        </Pill>
        <Pill active={tab === 'port'} onClick={() => setTab('port')}>
          {t('pingport.tabPort')}
        </Pill>
      </PillGroup>

      <div className="mt-6">{tab === 'ping' ? <PingTab /> : <PortTab />}</div>
    </PageContainer>
  )
}
