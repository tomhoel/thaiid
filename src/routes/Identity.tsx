import { useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { useProfile, usePreferences, useUpdatePreferences } from '@/features/profiles/useProfiles';
import { useCardImage } from '@/features/profiles/useCardImage';
import { COUNTRY_CODES, getCountryConfig } from '@/countries';
import { FlippableCard } from '@/components/card/FlippableCard';
import { Flag } from '@/components/card/Flag';
import { NationalEmblem } from '@/components/card/NationalEmblem';
import { reportError } from '@/lib/reportError';
import type { CountryCode, ProfileType } from '@/types/profile';
import type { CountryConfig } from '@/countries';

/** Reads a label from the country's translation table, falling back to English. */
function useTranslator(config: CountryConfig, language: string) {
  return useMemo(
    () => (key: string) => {
      const entry = config.translations[key];
      if (!entry) return key;
      return entry[language] ?? entry.en ?? key;
    },
    [config, language],
  );
}

/** Dates are stored as '26 Dec. 2031'; the periods stop Date parsing them. */
function parseCardDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value.replace(/\./g, ''));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

type Validity = 'statusActive' | 'statusExpiring' | 'statusExpired';

function validityOf(expiry: string | undefined): Validity {
  const date = parseCardDate(expiry);
  if (!date) return 'statusActive';
  const daysLeft = (date.getTime() - Date.now()) / 86_400_000;
  if (daysLeft < 0) return 'statusExpired';
  if (daysLeft < 90) return 'statusExpiring';
  return 'statusActive';
}

const VALIDITY_STYLES: Record<Validity, string> = {
  statusActive: 'border-green-border bg-green-bg text-green',
  statusExpiring: 'border-gold-border bg-gold-bg text-gold-light',
  statusExpired: 'border-b2 bg-bg-surface text-t3',
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="font-mono text-[10px] tracking-[0.14em] text-t3 uppercase">{label}</span>
      <span className="min-w-0 truncate text-right text-sm text-t1">{value}</span>
    </div>
  );
}

export function Identity() {
  const { email, displayName, signOut } = useAuth();
  const preferencesQuery = usePreferences();
  const updatePreferences = useUpdatePreferences();

  const country = preferencesQuery.data?.active_country ?? 'TH';
  const language = preferencesQuery.data?.language ?? 'en';
  const theme = preferencesQuery.data?.theme ?? 'dark';
  const config = getCountryConfig(country);
  const t = useTranslator(config, language);

  const profileQuery = useProfile(country);
  const cardFront = useCardImage(profileQuery.data?.card_front_path);

  // The palette lives in CSS; preferences only decide which block applies.
  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light');
  }, [theme]);

  const card = useMemo(() => {
    const stored = profileQuery.data?.data as Partial<ProfileType> | undefined;
    return { ...config.defaultCardData, ...(stored ?? {}) };
  }, [config, profileQuery.data]);

  const validity = validityOf(card.dateOfExpiry);
  const isPlaceholder = !profileQuery.isLoading && !profileQuery.data;

  const handleCountryChange = (next: CountryCode) => {
    if (next === country) return;
    updatePreferences.mutate(
      { activeCountry: next },
      { onError: (error) => reportError('Identity.setCountry', error) },
    );
  };

  const handleSignOut = () => {
    signOut().catch((error) => reportError('Identity.signOut', error));
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <NationalEmblem code={country} size={38} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-t1">{config.name.primary}</span>
            <span className="truncate font-mono text-[10px] tracking-[0.16em] text-t3 uppercase">
              {config.issuer.english}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="shrink-0 rounded-lg border border-b2 px-3 py-2 text-xs text-t2 transition hover:text-t1"
        >
          Sign out
        </button>
      </header>

      <nav aria-label="Country" className="flex items-center gap-2">
        {COUNTRY_CODES.map((code) => {
          const active = code === country;
          return (
            <button
              key={code}
              type="button"
              onClick={() => handleCountryChange(code)}
              aria-current={active ? 'true' : undefined}
              disabled={updatePreferences.isPending}
              className={`rounded-md border p-1.5 transition disabled:opacity-50 ${
                active ? 'border-gold-border bg-gold-bg' : 'border-b1 hover:border-b2'
              }`}
            >
              <Flag code={code} width={28} height={19} />
            </button>
          );
        })}
      </nav>

      <FlippableCard
        frontSrc={cardFront ?? config.cardImages.front}
        backSrc={config.cardImages.back}
        updatedLabel={t('card.updated')}
      />

      <p className="text-center font-mono text-[10px] tracking-[0.16em] text-t3 uppercase">
        {t('card.flipHint')}
      </p>

      <section className="rounded-2xl border border-b1 bg-bg-card p-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-t1">{t('section.cardholder')}</h2>
          <span
            className={`rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-[0.12em] uppercase ${VALIDITY_STYLES[validity]}`}
          >
            {t(`details.${validity}`)}
          </span>
        </div>

        <div className="divide-y divide-divider">
          <DetailRow label={t('details.name')} value={card.fullNameEnglish} />
          <DetailRow label={t('details.idNumber')} value={card.idNumber} />
          <DetailRow label={t('details.dob')} value={card.dateOfBirth} />
          <DetailRow label={t('details.issued')} value={card.dateOfIssue} />
          <DetailRow label={t('details.expires')} value={card.dateOfExpiry} />
        </div>

        {isPlaceholder && (
          <p className="mt-4 border-t border-divider pt-3 text-xs text-t3">
            Showing the {config.cardDescription} sample. Generating a card will replace it with
            your own.
          </p>
        )}
      </section>

      <footer className="mt-auto pt-2 text-center">
        <span className="font-mono text-[10px] tracking-[0.14em] text-t4 uppercase">
          {displayName ?? email}
        </span>
      </footer>
    </main>
  );
}
