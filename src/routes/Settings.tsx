import { useState } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { useProfile, usePreferences, useUpdatePreferences } from '@/features/profiles/useProfiles';
import { useCardImage } from '@/features/profiles/useCardImage';
import { getCountryConfig, COUNTRY_CODES } from '@/countries';
import { ScreenHeader } from '@/components/ScreenHeader';
import { BackgroundAtmosphere } from '@/components/BackgroundAtmosphere';
import { NationalEmblem } from '@/components/card/NationalEmblem';
import { OptionSheet, type Option } from '@/components/OptionSheet';
import { Icon, type IconName } from '@/components/Icon';
import { useLocalFlag } from '@/lib/useLocalFlag';
import { reportError } from '@/lib/reportError';
import type { CountryCode, ProfileType } from '@/types/profile';

/** Display names for the country picker, as the native list spelled them. */
const COUNTRY_LABELS: Record<CountryCode, string> = {
  TH: 'Thailand',
  SG: 'Singapore',
  BR: 'Brazil',
  US: 'New York City',
  VN: 'Vietnam',
};

interface ItemProps {
  icon: IconName;
  label: string;
  value?: string;
  toggle?: boolean;
  onToggle?: (next: boolean) => void;
  onPress?: () => void;
  last?: boolean;
  danger?: boolean;
  note?: string;
}

function Item({ icon, label, value, toggle, onToggle, onPress, last, danger, note }: ItemProps) {
  const interactive = toggle !== undefined ? () => onToggle?.(!toggle) : onPress;

  const body = (
    <>
      <span className="flex flex-1 items-center gap-3">
        <Icon name={icon} size={17} className={danger ? 'text-danger' : 'text-t3'} />
        <span className="flex min-w-0 flex-col">
          <span className={`text-sm font-medium ${danger ? 'text-danger' : 'text-t1'}`}>
            {label}
          </span>
          {note && <span className="mt-0.5 text-[10px] text-t4">{note}</span>}
        </span>
      </span>

      {toggle !== undefined ? (
        <span
          role="switch"
          aria-checked={toggle}
          className={`relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors ${
            toggle ? 'bg-gold-light' : 'bg-b2'
          }`}
        >
          <span
            className="absolute top-[3px] left-[3px] h-6 w-6 rounded-full bg-white transition-transform"
            style={{ transform: toggle ? 'translateX(20px)' : 'none' }}
          />
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-1.5">
          {value && <span className="text-[13px] text-t3">{value}</span>}
          <Icon name="chevronRight" size={14} className="text-t4" />
        </span>
      )}
    </>
  );

  const className = `flex w-full items-center px-5 py-3.5 text-left ${
    last ? '' : 'border-b border-b1'
  }`;

  if (!interactive) {
    return <div className={className}>{body}</div>;
  }

  return (
    <button type="button" onClick={interactive} className={`${className} active:bg-bg-surface`}>
      {body}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-5 pt-5 pb-1.5 text-[10px] font-bold tracking-[1.2px] text-t4 uppercase">
      {children}
    </h2>
  );
}

type Sheet =
  | { kind: 'language' }
  | { kind: 'country' }
  | { kind: 'theme' }
  | { kind: 'soon'; label: string };

export function Settings() {
  const { email, displayName, signOut } = useAuth();
  const preferencesQuery = usePreferences();
  const updatePreferences = useUpdatePreferences();

  const country = (preferencesQuery.data?.active_country ?? 'TH') as CountryCode;
  const lang = preferencesQuery.data?.language ?? 'en';
  const theme = preferencesQuery.data?.theme ?? 'light';
  const config = getCountryConfig(country);

  const t = (key: string) => {
    const entry = config.translations[key];
    if (!entry) return key;
    return entry[lang] ?? entry.en ?? key;
  };

  const profileQuery = useProfile(country);
  const portrait = useCardImage(profileQuery.data?.portrait_path);
  const stored = profileQuery.data?.data as Partial<ProfileType> | undefined;
  const cardData = { ...config.defaultCardData, ...(stored ?? {}) };

  // AsyncStorage held these natively; localStorage is the direct equivalent.
  const [biometric, setBiometric] = useLocalFlag('biometric', false);
  const [notifications, setNotifications] = useLocalFlag('notifications', true);

  const [sheet, setSheet] = useState<Sheet | null>(null);

  const patch = (input: Parameters<typeof updatePreferences.mutate>[0]) => {
    updatePreferences.mutate(input, {
      onError: (error) => reportError('Settings.updatePreferences', error),
    });
    setSheet(null);
  };

  const handleSignOut = () => {
    signOut().catch((error) => reportError('Settings.signOut', error));
  };

  const initials = `${cardData.firstName.charAt(0)}${cardData.lastName.charAt(0)}`;
  const languageLabel = lang === 'en' ? 'English' : config.secondaryLanguage.langName;

  const sheetProps = (): { title: string; options: Option[]; selected: string; onSelect: (key: string) => void } | null => {
    if (!sheet) return null;
    switch (sheet.kind) {
      case 'language':
        return {
          title: 'Language',
          options: [
            { key: 'en', label: 'English' },
            { key: config.secondaryLanguage.code, label: config.secondaryLanguage.langName },
          ],
          selected: lang,
          onSelect: (key) => patch({ language: key }),
        };
      case 'country':
        return {
          title: 'Country',
          options: COUNTRY_CODES.map((code) => ({ key: code, label: COUNTRY_LABELS[code] })),
          selected: country,
          onSelect: (key) => patch({ activeCountry: key as CountryCode }),
        };
      case 'theme':
        return {
          title: 'Theme',
          options: [
            { key: 'light', label: 'Light' },
            { key: 'dark', label: 'Dark' },
          ],
          selected: theme,
          onSelect: (key) => patch({ theme: key as 'dark' | 'light' }),
        };
      case 'soon':
        return {
          title: sheet.label,
          options: [{ key: 'soon', label: 'Not yet available', disabled: true }],
          selected: '',
          onSelect: () => setSheet(null),
        };
    }
  };

  const active = sheetProps();

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-bg-card">
      <BackgroundAtmosphere tintCenter={0.3} />

      <ScreenHeader
        code={country}
        title={t('settings.title')}
        sub={lang === 'en' ? t('settings.subNative') : 'Application Settings'}
        language={lang}
        onToggleLanguage={() =>
          patch({ language: lang === 'en' ? config.secondaryLanguage.code : 'en' })
        }
        busy={updatePreferences.isPending}
      />

      {/* Profile — static, does not scroll */}
      <div className="relative z-10 flex items-center gap-3.5 px-5 py-[18px]">
        <div className="h-[46px] w-[46px] shrink-0 overflow-hidden rounded-full border-[1.5px] border-gold-border">
          {portrait ? (
            <img
              src={portrait}
              alt="Cardholder portrait"
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-bg-elevated text-sm font-bold text-gold-light">
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-t1">
            {lang === 'en' ? cardData.fullNameEnglish : (cardData.nameThai ?? cardData.fullNameEnglish)}
          </div>
          <div className="mt-px truncate text-[10px] text-t3">
            {lang === 'en' ? (cardData.nameThai ?? '') : cardData.fullNameEnglish}
          </div>
          <div className="mt-[3px] truncate text-[9px] tracking-[0.5px] text-t4">
            {cardData.idNumber}
          </div>
        </div>
      </div>

      <div className="relative z-10 h-px bg-b1" />

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto pb-6">
        <SectionLabel>{t('settings.security')}</SectionLabel>
        <Item
          icon="fingerprint"
          label={t('settings.biometric')}
          toggle={biometric}
          onToggle={setBiometric}
          note="Stored locally; the lock screen is not ported yet."
        />
        <Item
          icon="lock"
          label={t('settings.pin')}
          onPress={() => setSheet({ kind: 'soon', label: t('settings.pin') })}
        />
        <Item
          icon="eyeOff"
          label={t('settings.privacy')}
          last
          onPress={() => setSheet({ kind: 'soon', label: t('settings.privacy') })}
        />

        <div className="h-6" />

        <SectionLabel>{t('settings.preferences')}</SectionLabel>
        <Item
          icon="bell"
          label={t('settings.notifications')}
          toggle={notifications}
          onToggle={setNotifications}
        />
        <Item
          icon="language"
          label={t('settings.language')}
          value={languageLabel}
          onPress={() => setSheet({ kind: 'language' })}
        />
        <Item
          icon="globe"
          label={t('settings.country')}
          value={config.name.english}
          onPress={() => setSheet({ kind: 'country' })}
        />
        <Item
          icon={theme === 'dark' ? 'moon' : 'sun'}
          label={t('settings.theme')}
          value={theme === 'dark' ? 'Dark' : 'Light'}
          onPress={() => setSheet({ kind: 'theme' })}
        />
        <Item
          icon="tools"
          label="Demo Profile"
          last
          onPress={() => setSheet({ kind: 'soon', label: 'Demo Profile' })}
        />

        <div className="h-6" />

        {/* Accounts did not exist in the native app; Clerk sign-in makes one necessary. */}
        <SectionLabel>Account</SectionLabel>
        <Item icon="person" label="Signed in as" value={displayName ?? email ?? '—'} />
        <Item icon="logout" label="Sign out" danger last onPress={handleSignOut} />

        <div className="h-6" />

        <SectionLabel>System</SectionLabel>
        <Item icon="info" label="Application Version" value={__APP_VERSION__} />
        <Item icon="document" label="Official Reference" value={config.systemReference} />
        <Item icon="shield" label="Certification Status" value="Active" last />

        <div className="h-6" />

        <div className="flex flex-col items-center gap-[3px] px-6 pb-4 text-center">
          <NationalEmblem code={country} size={20} opacity={0.15} />
          <div className="mt-2 text-[11px] font-bold tracking-[0.5px] text-t4">
            {config.issuer.primary}
          </div>
          <div className="mt-px text-[8.5px] font-bold tracking-[1.2px] text-t4 uppercase">
            {t('attribution.dept')}
          </div>
          <div className="text-[8px] tracking-[0.8px] text-t4 uppercase">{config.ministry}</div>
          <div className="my-2 h-px w-12 bg-b1" />
          <p className="text-[9px] leading-[14px] tracking-[0.3px] whitespace-pre-line text-t4">
            {t('attribution.note')}
          </p>
        </div>
      </div>

      {active && (
        <OptionSheet
          title={active.title}
          options={active.options}
          selected={active.selected}
          onSelect={active.onSelect}
          onDismiss={() => setSheet(null)}
        />
      )}
    </div>
  );
}
