import { useTranslation } from 'react-i18next'
import type { LucideIcon } from 'lucide-react'

interface Props {
  titleKey: string
  icon: LucideIcon
}

export function ModulePlaceholder({ titleKey, icon: Icon }: Props): JSX.Element {
  const { t } = useTranslation()
  const name = t(`nav.${titleKey}`)
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-5">
        <Icon size={30} className="text-accent" />
      </div>
      <h2 className="text-xl font-semibold mb-2">{name}</h2>
      <span className="text-xs uppercase tracking-wider text-warn mb-3">
        {t('common.soon')}
      </span>
      <p className="text-sm text-muted max-w-md">
        {t('placeholder.description', { name })}
      </p>
    </div>
  )
}
