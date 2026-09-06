import { useEffect, useMemo, useState } from 'react';
import { useProfile, usePreferences, useUpdatePreferences } from '@/features/profiles/useProfiles';
import { useCardImage } from '@/features/profiles/useCardImage';
import { getCountryConfig } from '@/countries';
import { QRCodeDisplay } from '@/components/card/QRCodeDisplay';
import { NationalEmblem } from '@/components/card/NationalEmblem';
import { Flag } from '@/components/card/Flag';
import { ScreenHeader } from '@/components/ScreenHeader';
import { BackgroundAtmosphere } from '@/components/BackgroundAtmosphere';
import { Icon } from '@/components/Icon';
import { reportError } from '@/lib/reportError';
import type { CountryCode, ProfileType } from '@/types/profile';

/** The code carries a nonce and is reissued on this cadence. */
const REGEN_SECS = 15;

/**
 * The tiled emblem printed faintly behind the code.
 *
 * The native version positioned one `<Image>` per 50px cell, which meant
 * hundreds of nodes. A repeating CSS background draws the same thing in one,
 * and the tint still comes from a mask so the single greyscale asset works in
 * both themes.
 */
function EmblemWatermark({ code }: { code: CountryCode }) {
  const config = getCountryConfig(code);
  const tile = `url(${JSON.stringify(config.emblemAsset)}) repeat top left / 50px 50px`;

  if (config.emblemTinted === false) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ background: tile }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.04]"
      style={{
        backgroundColor: 'var(--color-gold-light)',
        mask: tile,
        WebkitMask: tile,
      }}
    />
  );
}

/** The viewfinder corner brackets around the code. */
function ScanBrackets() {
  const colour = 'color-mix(in srgb, var(--color-gold-light) 40%, transparent)';
  const common = 'pointer-events-none absolute h-[18px] w-[18px]';
  return (
    <>
      <span
        className={`${common} -top-2.5 -left-2.5 rounded-tl border-t-[2.5px] border-l-[2.5px]`}
        style={{ borderColor: colour }}
      />
      <span
        className={`${common} -top-2.5 -right-2.5 rounded-tr border-t-[2.5px] border-r-[2.5px]`}
        style={{ borderColor: colour }}
      />
      <span
        className={`${common} -bottom-2.5 -left-2.5 rounded-bl border-b-[2.5px] border-l-[2.5px]`}
        style={{ borderColor: colour }}
      />
      <span
        className={`${common} -right-2.5 -bottom-2.5 rounded-br border-b-[2.5px] border-r-[2.5px]`}
        style={{ borderColor: colour }}
      />
    </>
  );
}

export function DigitalId() {
  const preferencesQuery = usePreferences();
  const updatePreferences = useUpdatePreferences();

  const country = (preferencesQuery.data?.active_country ?? 'TH') as CountryCode;
  const lang = preferencesQuery.data?.language ?? 'en';
  const config = getCountryConfig(country);

  const t = (key: string) => {
    const entry = config.translations[key];
    if (!entry) return key;
    return entry[lang] ?? entry.en ?? key;
  };

  const profileQuery = useProfile(country);
  const portrait = useCardImage(profileQuery.data?.portrait_path);

  const cardData = useMemo(() => {
    const stored = profileQuery.data?.data as Partial<ProfileType> | undefined;
    return { ...config.defaultCardData, ...(stored ?? {}) };
  }, [config, profileQuery.data]);

  const [timer, setTimer] = useState({ epoch: 0, remaining: REGEN_SECS });

  useEffect(() => {
    const tick = window.setInterval(() => {
      setTimer((prev) =>
        prev.remaining - 1 <= 0
          ? { epoch: prev.epoch + 1, remaining: REGEN_SECS }
          : { ...prev, remaining: prev.remaining - 1 },
      );
    }, 1000);
    return () => window.clearInterval(tick);
  }, []);

  // Restarting a CSS animation needs the element replaced or the animation
  // re-added; keying the bar on the epoch is the cheapest way to do it.

  const secs = timer.remaining.toString().padStart(2, '0');
  const critical = timer.remaining <= 3;
  const warning = timer.remaining <= 7 && timer.remaining > 3;
  const segColour = critical
    ? 'var(--color-danger)'
    : warning
      ? 'var(--color-warn)'
      : 'var(--color-green)';

  const qr = useMemo(
    () =>
      JSON.stringify({
        type: config.qrType,
        id: cardData.idNumberCompact,
        name: cardData.fullNameEnglish,
        expiry: cardData.dateOfExpiry,
        nonce: timer.epoch,
      }),
    [config.qrType, cardData, timer.epoch],
  );

  const toggleLanguage = () => {
    updatePreferences.mutate(
      { language: lang === 'en' ? config.secondaryLanguage.code : 'en' },
      { onError: (error) => reportError('DigitalId.toggleLanguage', error) },
    );
  };

  const initials = `${cardData.firstName.charAt(0)}${cardData.lastName.charAt(0)}`;
  const primaryName =
    lang === 'en'
      ? cardData.fullNameEnglish.toUpperCase()
      : (cardData.nameThai ?? cardData.fullNameEnglish);
  const secondaryName =
    lang === 'en' ? (cardData.nameThai ?? '') : cardData.fullNameEnglish.toUpperCase();

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-bg">
      <BackgroundAtmosphere tintCenter={0.45} />

      <ScreenHeader
        code={country}
        title={t('digital.title')}
        sub={t('digital.sub')}
        language={lang}
        onToggleLanguage={toggleLanguage}
        busy={updatePreferences.isPending}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pt-[18px] [animation:enter-qr_500ms_ease-out_backwards]">
        <div
          className="mb-2.5 min-h-0 flex-1 rounded-2xl p-[1.5px]"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--color-gold-light) 25%, transparent), color-mix(in srgb, var(--color-gold-light) 5%, transparent), color-mix(in srgb, var(--color-gold-light) 15%, transparent))',
            boxShadow: '0 12px 24px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div className="flex h-full flex-col overflow-hidden rounded-[15px] bg-bg-card">
            {/* Navy document header, matching the identity panel */}
            <div className="flex items-center justify-between bg-navy px-3.5 py-3">
              <span className="text-[7.5px] font-extrabold tracking-[1.6px] text-white/70">
                {config.name.english}
              </span>
              <NationalEmblem code={country} size={16} opacity={0.85} />
              <span className="text-[7.5px] font-extrabold tracking-[1.6px] text-white/70">
                {config.name.primary}
              </span>
            </div>

            {/* Cardholder */}
            <div className="flex items-center gap-2.5 px-3.5 py-2.5">
              <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold-border bg-gold-bg">
                {portrait ? (
                  <img
                    src={portrait}
                    alt="Cardholder portrait"
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <span className="text-[11px] font-bold text-gold-light">{initials}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-extrabold tracking-[0.2px] text-t1">
                  {primaryName}
                </div>
                <div className="mt-px truncate text-[9px] text-t4">{secondaryName}</div>
              </div>
              <div className="shrink-0 overflow-hidden rounded-[3px] border-[0.5px] border-black/10">
                <Flag code={country} width={28} height={18} />
              </div>
            </div>

            <div className="bg-b1" style={{ height: 'var(--hairline)' }} />

            {/* QR zone */}
            <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center py-4">
              <EmblemWatermark code={country} />
              <div
                className="pointer-events-none absolute aspect-square w-[min(48vw+100px,320px)] rounded-full border border-gold-border bg-gold-bg"
                aria-hidden="true"
              />

              <div
                key={timer.epoch}
                className="relative [animation:qr-reissue_600ms_ease-out]"
              >
                <ScanBrackets />
                <div className="rounded-[14px] bg-white p-3.5">
                  <QRCodeDisplay
                    value={qr}
                    size={220}
                    color="var(--color-navy)"
                    className="h-auto w-[min(48vw,220px)]"
                    label={`${config.name.english} verification code`}
                  />
                </div>
              </div>

              <p className="relative mt-3.5 text-[11px] font-medium tracking-[0.3px] text-t3">
                {t('digital.scanHint')}
              </p>
            </div>

            <div className="bg-b1" style={{ height: 'var(--hairline)' }} />

            {/* ID + expiry */}
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <div>
                <div className="mb-0.5 text-[7.5px] font-bold tracking-[0.8px] text-t4 uppercase">
                  {t('id.label')}
                </div>
                <div className="text-[13px] font-extrabold tracking-[1px] text-gold-light">
                  {cardData.idNumber}
                </div>
              </div>
              <div className="text-right">
                <div className="mb-0.5 text-[7.5px] font-bold tracking-[0.8px] text-t4 uppercase">
                  {t('digital.expires')}
                </div>
                <div className="text-[11px] font-bold tracking-[0.5px] text-t2">
                  {lang === 'en'
                    ? cardData.dateOfExpiry
                    : (cardData.dateOfExpiryThai ?? cardData.dateOfExpiry)}
                </div>
              </div>
            </div>

            <div className="bg-b1" style={{ height: 'var(--hairline)' }} />

            {/* Reissue timer */}
            <div className="flex items-center gap-2 bg-bg-surface px-3.5 py-2.5">
              <span
                key={`spin-${timer.epoch}`}
                className="shrink-0 [animation:spin-once_600ms_linear]"
                style={{ color: segColour }}
              >
                <Icon name="sync" size={14} />
              </span>
              <div className="h-1 flex-1 overflow-hidden rounded-sm bg-b1">
                <div
                  key={`bar-${timer.epoch}`}
                  className="h-1 rounded-sm [animation:drain_15s_linear_forwards]"
                  style={{ backgroundColor: segColour }}
                />
              </div>
              <span className="shrink-0 text-[7.5px] font-bold tracking-[0.8px] text-t4">
                {t('digital.regen')}
              </span>
              <span
                className="min-w-[34px] text-right text-base font-extrabold tracking-[-0.3px] tabular-nums"
                style={{ color: segColour }}
              >
                0:{secs}
              </span>
            </div>
          </div>
        </div>

        {/* Issuer */}
        <div className="flex items-center justify-center gap-[5px] pb-1 text-t4">
          <Icon name="ribbon" size={10} />
          <span className="text-[9px] font-medium">
            {lang === 'en' ? config.issuer.english : config.issuer.primary}
          </span>
          <span className="text-[9px]">·</span>
          <span className="text-[9px] font-medium">
            {lang === 'en' ? config.name.english : config.name.primary}
          </span>
        </div>
      </div>
    </div>
  );
}
