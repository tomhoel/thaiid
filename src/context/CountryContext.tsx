import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type ImageSourcePropType } from 'react-native';

export type CountryCode = 'TH' | 'SG' | 'BR' | 'US';

export interface CountryConfig {
  code: CountryCode;
  name: { english: string; primary: string };
  issuer: { english: string; primary: string };
  ministry: string;
  splashFooter: string;
  qrType: string;
  systemReference: string;
  chipSerial: string;
  cardDescription: string;

  emblemAsset: ImageSourcePropType;
  cardImages: { front: ImageSourcePropType; back: ImageSourcePropType };

  flagLabel: string;

  secondaryLanguage: { code: string; label: string; langName: string };

  dateFormat: { toLocal: (enDate: string) => string };

  addressFormatter: (data: any, lang: string) => string;

  translations: Record<string, Record<string, string>>;

  holoStripSide: 'left' | 'right';
  holoStripOffset?: number; // percentage from edge, default 6%

  defaultCardData: Record<string, any>;

  // Accent color overrides — applied on top of theme colors
  accent?: {
    dark: { gold: string; goldLight: string; goldBg: string; goldBorder: string; navy?: string };
    light: { gold: string; goldLight: string; goldBg: string; goldBorder: string; navy?: string };
  };
}

interface CountryCtx {
  country: CountryCode;
  config: CountryConfig;
  setCountry: (c: CountryCode) => void;
  countryLoaded: boolean;
}

// Lazy imports to avoid circular — configs are loaded at runtime
const CONFIGS: Record<CountryCode, () => CountryConfig> = {
  TH: () => require('../countries/thailand').THAILAND_CONFIG,
  SG: () => require('../countries/singapore').SINGAPORE_CONFIG,
  BR: () => require('../countries/brazil').BRAZIL_CONFIG,
  US: () => require('../countries/usa').USA_CONFIG,
};

function getConfig(code: CountryCode): CountryConfig {
  return CONFIGS[code]();
}

const KEY = 'app_country';

const CountryContext = createContext<CountryCtx>({
  country: 'TH',
  config: getConfig('TH'),
  setCountry: () => {},
  countryLoaded: false,
});

export function CountryProvider({ children }: { children: React.ReactNode }) {
  const [country, setCountryState] = useState<CountryCode>('TH');
  const [countryLoaded, setCountryLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(v => {
      if (v === 'TH' || v === 'SG' || v === 'BR' || v === 'US') setCountryState(v);
      setCountryLoaded(true);
    });
  }, []);

  const setCountry = useCallback((c: CountryCode) => {
    setCountryState(c);
    AsyncStorage.setItem(KEY, c);
  }, []);

  const config = getConfig(country);

  return (
    <CountryContext.Provider value={{ country, config, setCountry, countryLoaded }}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  return useContext(CountryContext);
}
