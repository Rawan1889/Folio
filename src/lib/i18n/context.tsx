'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { translations, type Locale, type TranslationKey } from './translations'

type Ctx = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: TranslationKey) => string
  dir: 'ltr' | 'rtl'
}

const LanguageContext = createContext<Ctx | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const stored = (typeof window !== 'undefined' ? localStorage.getItem('folio_locale') : null) as Locale | null
    if (stored === 'ar' || stored === 'en') {
      setLocaleState(stored)
    }
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = locale
    }
  }, [locale])

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    if (typeof window !== 'undefined') localStorage.setItem('folio_locale', l)
  }

  const t = (key: TranslationKey) => {
    const entry = translations[key]
    return entry ? entry[locale] : key
  }

  const dir: 'ltr' | 'rtl' = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useT() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useT must be used inside LanguageProvider')
  return ctx
}
