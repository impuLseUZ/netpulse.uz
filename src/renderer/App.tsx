import { useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { UpdateBanner } from '@/components/UpdateBanner'
import { SettingsPage } from '@/pages/SettingsPage'
import { ModulePlaceholder } from '@/pages/ModulePlaceholder'
import { useNavStore } from '@/store/nav'
import { useAppStore } from '@/store/app'
import { useUpdaterStore } from '@/store/updater'
import { NAV_ITEMS } from '@/lib/nav'
import { IpCalcPage } from '@/pages/IpCalcPage'
import { DnsPage } from '@/pages/DnsPage'
import { PingPortPage } from '@/pages/PingPortPage'
import { ScannerPage } from '@/pages/ScannerPage'
import { TracerPage } from '@/pages/TracerPage'
import { SpeedtestPage } from '@/pages/SpeedtestPage'

export function App(): JSX.Element {
  const initApp = useAppStore((s) => s.init)
  const loaded = useAppStore((s) => s.loaded)
  const initUpdater = useUpdaterStore((s) => s.init)
  const active = useNavStore((s) => s.active)

  useEffect(() => {
    void initApp()
    void initUpdater()
  }, [initApp, initUpdater])

  if (!loaded) {
    return (
      <div className="h-full flex items-center justify-center text-muted text-sm">
        NetPulse…
      </div>
    )
  }

  const renderContent = (): JSX.Element => {
    if (active === 'settings') return <SettingsPage />
    const item = NAV_ITEMS.find((i) => i.id === active)
    if (!item) return <SettingsPage />
    if (active === 'ipcalc') return <IpCalcPage />
    if (active === 'dns') return <DnsPage />
    if (active === 'pingport') return <PingPortPage />
    if (active === 'scanner') return <ScannerPage />
    if (active === 'tracer') return <TracerPage />
    if (active === 'speedtest') return <SpeedtestPage />
    // Пока все функциональные модули — заглушки. Будут заменяться по очереди.
    return <ModulePlaceholder titleKey={item.labelKey} icon={item.icon} />
  }

  return (
    <div className="h-full flex">
      <Sidebar />
      <div className="flex-1 h-full flex flex-col">
        <UpdateBanner />
        <main className="flex-1 overflow-y-auto bg-bg">{renderContent()}</main>
      </div>
    </div>
  )
}
