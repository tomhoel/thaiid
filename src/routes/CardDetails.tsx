import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile, usePreferences } from '@/features/profiles/useProfiles';
import { getCountryConfig } from '@/countries';
import { Icon, type IconName } from '@/components/Icon';
import { reportError } from '@/lib/reportError';
import type { CountryCode, ProfileType } from '@/types/profile';

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseDateEn(value: string): Date {
  const parts = value.replace(/\./g, '').split(' ');
  return new Date(Number(parts[2]), MONTHS[parts[1]] ?? 0, Number(parts[0]));
}

function validityStatus(isValid: boolean, expiryEn: string) {
  if (!isValid) return 'expired' as const;
  const parsed = parseDateEn(expiryEn);
  if (Number.isNaN(parsed.getTime())) return 'valid' as const;
  const days = (parsed.getTime() - Date.now()) / 86_400_000;
  if (days < 0) return 'expired' as const;
  if (days < 180) return 'expiring' as const;
  return 'valid' as const;
}

function Row({
  label,
  value,
  sub,
  copy,
  last,
}: {
  label: string;
  value: string;
  sub?: string;
  copy?: boolean;
  last?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!copy) return;
    navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopied(true);
        navigator.vibrate?.(12);
        window.setTimeout(() => setCopied(false), 1200);
      })
      .catch((error) => reportError('CardDetails.copy', error));
  };

  const content = (
    <>
      <span className="w-[90px] shrink-0 text-xs text-t3">{label}</span>
      <span className="flex min-w-0 flex-1 flex-col items-end">
        <span className="w-full text-right text-[13px] font-medium break-words text-t1">
          {value}
        </span>
        {sub && <span className="mt-px text-right text-[10px] text-t3">{sub}</span>}
      </span>
      {copy && (
        <Icon
          name="copy"
          size={12}
          className={`ml-1 shrink-0 ${copied ? 'text-green' : 'text-t4'}`}
        />
      )}
    </>
  );

  const className = `flex min-h-11 w-full items-center px-4 py-3 text-left ${
    last ? '' : 'border-b border-divider'
  }`;

  if (!copy) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
      className={`${className} active:bg-bg-surface`}
    >
      {content}
    </button>
  );
}

function Section({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: IconName;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-3.5">
      <div className="mb-[7px] ml-1 flex items-center gap-[7px]">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-lg"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`, color }}
        >
          <Icon name={icon} size={14} />
        </span>
        <h2 className="text-xs font-bold tracking-[0.3px] text-t2">{title}</h2>
      </div>
      <div
        className="overflow-hidden rounded-[18px] bg-bg-card"
        style={{ boxShadow: '0 2px 8px var(--color-shadow)' }}
      >
        {children}
      </div>
    </section>
  );
}

export function CardDetails() {
  const navigate = useNavigate();
  const preferencesQuery = usePreferences();

  const country = (preferencesQuery.data?.active_country ?? 'TH') as CountryCode;
  const lang = preferencesQuery.data?.language ?? 'en';
  const config = getCountryConfig(country);

  const t = (key: string) => {
    const entry = config.translations[key];
    if (!entry) return key;
    return entry[lang] ?? entry.en ?? key;
  };

  const profileQuery = useProfile(country);
  const cardData = useMemo(() => {
    const stored = profileQuery.data?.data as Partial<ProfileType> | undefined;
    return { ...config.defaultCardData, ...(stored ?? {}) };
  }, [config, profileQuery.data]);

  const status = validityStatus(cardData.isValid, cardData.dateOfExpiry);
  const statusLabel =
    status === 'valid'
      ? t('details.statusActive')
      : status === 'expiring'
        ? t('details.statusExpiring')
        : t('details.statusExpired');

  const title = lang === 'en' ? 'Card Details' : t('details.cardDetails');
  const subtitle = lang === 'en' ? t('details.cardDetails') : 'Card Details';
  const localName = `${t('details.name')} (${config.secondaryLanguage.label})`;
  const secondaryName = cardData.nameThai ?? cardData.fullNameEnglish;

  return (
    <div
      className="flex h-dvh flex-col bg-bg"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.375rem)' }}
    >
      <div className="mb-2.5 flex items-center gap-2 px-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="-ml-2 flex h-9 w-9 items-center justify-center rounded-lg text-t2"
        >
          <Icon name="chevronLeft" size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold tracking-[-0.5px] text-t1">{title}</h1>
          <p className="mt-0.5 truncate text-[10px] text-t3">{subtitle}</p>
        </div>
      </div>

      <div
        className="mx-4 mb-4 flex items-center gap-[7px] rounded-2xl bg-bg-card px-3 py-2.5"
        style={{ boxShadow: '0 2px 6px var(--color-shadow)' }}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-gold-bg text-gold-light">
          <Icon name="card" size={14} />
        </span>
        <span className="truncate text-xs font-semibold text-t1">{cardData.titleEnglish}</span>
        <span className="text-xs text-t4">·</span>
        <span className="truncate text-[11px] text-t3">{cardData.titleThai}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        <Section title={t('details.personal')} icon="person" color="var(--color-blue)">
          <Row label={localName} value={secondaryName} copy />
          <Row label={`${t('details.name')} (EN)`} value={cardData.fullNameEnglish} copy />
          <Row
            label={t('details.dob')}
            value={cardData.dateOfBirth}
            sub={cardData.dateOfBirthThai}
            last
          />
        </Section>

        <Section title={t('details.identification')} icon="fingerprint" color="var(--color-gold)">
          <Row label={t('details.idNumber')} value={cardData.idNumber} copy />
          <Row label={t('info.laser')} value={cardData.laserCode ?? '—'} copy />
          <Row label={t('details.reference')} value={cardData.reference ?? '—'} copy last />
        </Section>

        <Section title={t('info.address')} icon="location" color="var(--color-flag-red)">
          <Row
            label={t('info.address')}
            value={config.addressFormatter(cardData, lang)}
            copy
          />
          <Row label={t('info.province')} value={cardData.province ?? '—'} />
          <Row label={t('info.district')} value={cardData.district ?? '—'} />
          <Row label={t('details.subDistrict')} value={cardData.subDistrict ?? '—'} last />
        </Section>

        <Section title={t('details.validity')} icon="calendar" color="var(--color-green)">
          <Row label={t('details.issued')} value={cardData.dateOfIssue} />
          <Row label={t('details.expires')} value={cardData.dateOfExpiry} />
          <Row label={t('details.status')} value={statusLabel} last />
        </Section>
      </div>
    </div>
  );
}
