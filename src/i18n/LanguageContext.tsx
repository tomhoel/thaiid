import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useCountry } from '../context/CountryContext';

type Lang = string;

interface LangContextType {
  lang: Lang;
  setLang: (l: string) => void;
  toggle: () => void;
  t: (key: string) => string;
  secondaryLangLabel: string;
}

const LangContext = createContext<LangContextType>({
  lang: 'en',
  setLang: () => {},
  toggle: () => {},
  t: (key: string) => key,
  secondaryLangLabel: '',
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { config } = useCountry();
  const { translations, secondaryLanguage } = config;

  const [lang, setLang] = useState<Lang>('en');

  // Reset to English whenever the country (and thus secondary language) changes
  useEffect(() => {
    setLang('en');
  }, [secondaryLanguage.code]);

  const toggle = useCallback(() => {
    setLang(prev => prev === 'en' ? secondaryLanguage.code : 'en');
  }, [secondaryLanguage.code]);

  const t = useCallback((key: string) => {
    return translations[key]?.[lang] ?? key;
  }, [lang, translations]);

  return (
    <LangContext.Provider value={{ lang, setLang, toggle, t, secondaryLangLabel: secondaryLanguage.label }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
