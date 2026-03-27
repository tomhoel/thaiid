import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const langKeyFor = (countryCode: string) => `@lang_${countryCode}`;

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { country, config } = useCountry();
  const { translations, secondaryLanguage } = config;
  const [lang, setLangState] = useState<Lang>('en');
  const prevCountryRef = useRef(country);

  // When country changes, save current language for the old country, then load language for the new country
  useEffect(() => {
    const prevCountry = prevCountryRef.current;
    prevCountryRef.current = country;

    (async () => {
      // Save current language for the previous country (skip on initial mount)
      if (prevCountry !== country) {
        await AsyncStorage.setItem(langKeyFor(prevCountry), lang).catch(console.warn);
      }

      // Load saved language for the new country
      try {
        const saved = await AsyncStorage.getItem(langKeyFor(country));
        setLangState(saved ?? 'en');
      } catch {
        setLangState('en');
      }
    })();
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  const setLang = useCallback((l: string) => {
    setLangState(l);
    AsyncStorage.setItem(langKeyFor(country), l).catch(console.warn);
  }, [country]);

  const toggle = useCallback(() => {
    setLangState(prev => {
      const next = prev === 'en' ? secondaryLanguage.code : 'en';
      AsyncStorage.setItem(langKeyFor(country), next).catch(console.warn);
      return next;
    });
  }, [secondaryLanguage.code, country]);

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
