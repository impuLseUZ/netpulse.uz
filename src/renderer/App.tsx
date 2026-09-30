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
import { PasswordPage } from '@/pages/PasswordPage'
import { SshPage } from '@/pages/SshPage'
import { SubdomainsPage } from '@/pages/SubdomainsPage'
import { PortScannerPage } from '@/pages/PortScannerPage'
import { LocalPortsPage } from '@/pages/LocalPortsPage'
import { SshKeysPage } from '@/pages/SshKeysPage'
import { HttpInspectorPage } from '@/pages/HttpInspectorPage'

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
    if (active === 'subdomains') return <SubdomainsPage />
    if (active === 'portscan') return <PortScannerPage />
    if (active === 'localports') return <LocalPortsPage />
    if (active === 'sshkeys') return <SshKeysPage />
    if (active === 'httpinspect') return <HttpInspectorPage />
    if (active === 'pingport') return <PingPortPage />
    if (active === 'scanner') return <ScannerPage />
    if (active === 'tracer') return <TracerPage />
    if (active === 'speedtest') return <SpeedtestPage />
    if (active === 'password') return <PasswordPage />
    if (active === 'ssh') return <SshPage />
    // Пока все функциональные модули — заглушки. Будут заменяться по очереди.
    return <ModulePlaceholder titleKey={item.labelKey} icon={item.icon} />
  }

  return (
    <div className="h-full flex">
      <Sidebar />
      <div className="flex-1 h-full flex flex-col">
        <UpdateBanner />
        {/* SSH-клиент сам управляет прокруткой внутри своих панелей (h-full,
            overflow-hidden на корне) — если дать ещё и overflow-y-auto тут,
            любой субпиксельный оверфлоу создаёт лишний скроллбар поверх всего окна. */}
        <main className={`flex-1 bg-bg ${active === 'ssh' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {renderContent()}
        </main>
      </div>
    </div>
  )
}