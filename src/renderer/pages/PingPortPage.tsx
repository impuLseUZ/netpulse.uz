import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PingTab } from './PingTab'
import { PortTab } from './PortTab'

type Tab = 'ping' | 'port'

export function PingPortPage(): JSX.Element {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('ping')

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <h2 className="text-xl font-semibold mb-5">{t('nav.pingport')}</h2>

      <div className="flex gap-1 mb-6 p-1 rounded-lg bg-surface-2 w-fit">
        <TabButton active={tab === 'ping'} onClick={() => setTab('ping')}>
          {t('pingport.tabPing')}
        </TabButton>
        <TabButton active={tab === 'port'} onClick={() => setTab('port')}>
          {t('pingport.tabPort')}
        </TabButton>
      </div>

      {tab === 'ping' ? <PingTab /> : <PortTab />}
    </div>
  )
}

function TabButton({
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
        'px-4 py-1.5 rounded-md text-sm transition-colors',
        active ? 'bg-accent text-accent-fg' : 'text-muted hover:text-fg'
      ].join(' ')}
    >
      {children}
    </button>
  )
}
