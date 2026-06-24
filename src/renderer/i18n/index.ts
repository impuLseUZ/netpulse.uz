import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ru from './ru'
import en from './en'
import uz from './uz'
import type { Locale } from '@shared/types'

void i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
    uz: { translation: uz },
  },
  lng: 'ru',
  fallbackLng: 'ru',
  interpolation: { escapeValue: false }
})

export function setLocale(locale: Locale): void {
  void i18n.changeLanguage(locale)
}

export default i18n