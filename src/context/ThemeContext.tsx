import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  theme: 'dark',
  colors: DarkColors,
  toggleTheme: () => {},
  setTheme: () => {},
  themeLoaded: false,
});

const KEY = 'app_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
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

  const colors = theme === 'dark' ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme, themeLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
