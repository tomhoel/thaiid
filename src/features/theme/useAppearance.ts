import { useEffect } from 'react';
import { usePreferences } from '@/features/profiles/useProfiles';
import { getCountryConfig } from '@/countries';
import type { CountryCode } from '@/types/profile';

/**
 * Applies the active theme and the issuing country's accent to the document.
 *
 * This is the DOM counterpart of the native `ThemeProvider` +
 * `ThemeAccentBridge` pair. There, a country's accent object was merged over
 * the base palette so every consumer of `useTheme()` saw recoloured gold and
 * navy tokens; here the same override is written as custom properties on
 * <html>, which the Tailwind colour utilities already read through.
 *
 * It runs once, from the tab shell, rather than per screen — the QR and details
 * screens were previously left on whatever the last screen had set.
 *
 * Light is the default, matching the native app, and `index.html` ships the
 * class so a cold load never flashes the dark palette.
 */
const ACCENT_VARS = {
  gold: '--color-gold',
  goldLight: '--color-gold-light',
  goldBg: '--color-gold-bg',
  goldBorder: '--color-gold-border',
  navy: '--color-navy',
} as const;

export interface Appearance {
  theme: 'dark' | 'light';
  country: CountryCode;
  language: string;
}

export function useAppearance(): Appearance {
  const preferencesQuery = usePreferences();
  const theme = preferencesQuery.data?.theme ?? 'light';
  const country = (preferencesQuery.data?.active_country ?? 'TH') as CountryCode;
  const language = preferencesQuery.data?.language ?? 'en';

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-light', theme === 'light');

    const accent = getCountryConfig(country).accent?.[theme];
    for (const [key, cssVar] of Object.entries(ACCENT_VARS)) {
      const value = accent?.[key as keyof typeof ACCENT_VARS];
      if (value) root.style.setProperty(cssVar, value);
      else root.style.removeProperty(cssVar);
    }

    // The native tab bar took its surface from the (accented) navy on dark and
    // from the card surface on light, so it has to follow the override too.
    if (theme === 'dark' && accent?.navy) {
      root.style.setProperty('--color-tab-bar', accent.navy);
    } else {
      root.style.removeProperty('--color-tab-bar');
    }

    // Keeps the mobile browser chrome in step with the header behind it.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', accent?.navy ?? (theme === 'light' ? '#ffffff' : '#0c1526'));
  }, [theme, country]);

  return { theme, country, language };
}
