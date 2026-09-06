import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from '@/components/Icon';
import { usePreferences } from '@/features/profiles/useProfiles';
import { getCountryConfig } from '@/countries';
import type { CountryCode } from '@/types/profile';

/**
 * The bottom tab bar, ported from the Expo Router `Tabs` navigator.
 *
 * Expo gave each tab filled artwork when focused and outline artwork
 * otherwise, so both variants are kept here. The card details screen sat
 * inside the same navigator with `href: null`, meaning it showed the bar but
 * lit no tab — `NavLink`'s `end` matching reproduces that for free.
 */
interface Tab {
  to: string;
  labelKey: string;
  icon: IconName;
  iconFocused: IconName;
}

const TABS: Tab[] = [
  { to: '/', labelKey: 'tab.identity', icon: 'card', iconFocused: 'cardFilled' },
  { to: '/qr', labelKey: 'tab.qr', icon: 'qrCode', iconFocused: 'qrCodeFilled' },
  { to: '/settings', labelKey: 'tab.settings', icon: 'cog', iconFocused: 'cogFilled' },
];

export function TabBar() {
  const preferencesQuery = usePreferences();
  const country = (preferencesQuery.data?.active_country ?? 'TH') as CountryCode;
  const lang = preferencesQuery.data?.language ?? 'en';
  const config = getCountryConfig(country);

  const t = (key: string) => {
    const entry = config.translations[key];
    if (!entry) return key;
    return entry[lang] ?? entry.en ?? key;
  };

  return (
    <nav
      aria-label="Main"
      className="relative z-30 flex shrink-0 border-t border-b1 bg-tab-bar pt-1.5"
      style={{
        height: 'calc(78px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className="flex flex-1 flex-col items-center justify-start gap-px text-tab-inactive aria-[current=page]:text-gold-light"
        >
          {({ isActive }) => (
            <>
              <Icon name={isActive ? tab.iconFocused : tab.icon} size={20} className="-mb-0.5" />
              <span className="text-[10px] font-semibold">{t(tab.labelKey)}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
