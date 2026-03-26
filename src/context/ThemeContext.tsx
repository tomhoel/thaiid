import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkColors, LightColors, type ColorPalette } from '../constants/colors';

type Theme = 'dark' | 'light';

interface ThemeCtx {
  theme: Theme;
  colors: ColorPalette;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  themeLoaded: boolean;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'light',
  colors: LightColors,
  toggleTheme: () => {},
  setTheme: () => {},
  themeLoaded: false,
});

// Accent overrides stored here by ThemeAccentBridge
const AccentContext = createContext<Partial<ColorPalette>>({});

const KEY = 'app_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(v => {
      if (v === 'light' || v === 'dark') setThemeState(v);
      setThemeLoaded(true);
    });
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    AsyncStorage.setItem(KEY, t);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const baseColors = theme === 'dark' ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ theme, colors: baseColors, toggleTheme, setTheme, themeLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Bridges country accent into theme — placed inside CountryProvider in _layout.tsx
export function ThemeAccentBridge({ children }: { children: React.ReactNode }) {
  // Lazy require to avoid circular dependency
  const { useCountry } = require('./CountryContext');
  const { config } = useCountry();
  const { theme } = useContext(ThemeContext);

  const accent = useMemo(() => {
    if (!config?.accent) return {};
    return theme === 'dark' ? config.accent.dark : config.accent.light;
  }, [config?.accent, theme]);

  return (
    <AccentContext.Provider value={accent}>
      {children}
    </AccentContext.Provider>
  );
}

export function useTheme() {
  const base = useContext(ThemeContext);
  const accent = useContext(AccentContext);

  const colors = useMemo(() => {
    if (Object.keys(accent).length === 0) return base.colors;
    return { ...base.colors, ...accent } as ColorPalette;
  }, [base.colors, accent]);

  return { ...base, colors };
}
