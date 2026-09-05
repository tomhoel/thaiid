import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile, usePreferences, useUpdatePreferences } from '@/features/profiles/useProfiles';
import { useCardImage } from '@/features/profiles/useCardImage';
import { getCountryConfig } from '@/countries';
import { FlippableCard } from '@/components/card/FlippableCard';
import { Flag } from '@/components/card/Flag';
import { ScreenHeader } from '@/components/ScreenHeader';
import { BackgroundAtmosphere } from '@/components/BackgroundAtmosphere';
import { LivenessWatermark } from '@/components/LivenessWatermark';
import { NationalEmblem } from '@/components/card/NationalEmblem';
import { Icon } from '@/components/Icon';
import { Spring, clamp } from '@/lib/spring';
import { reportError } from '@/lib/reportError';
import type { CountryCode, ProfileType } from '@/types/profile';

/* ── Helpers ──────────────────────────────────────────────────── */

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/** Dates are stored as '26 Dec. 2031', which `Date` cannot parse directly. */
function parseDateEn(value: string): Date {
  const parts = value.replace(/\./g, '').split(' ');
  return new Date(Number(parts[2]), MONTHS[parts[1]] ?? 0, Number(parts[0]));
}

type Status = 'valid' | 'expiring' | 'expired';

function validityStatus(isValid: boolean, expiryEn: string): Status {
  if (!isValid) return 'expired';
  const parsed = parseDateEn(expiryEn);
  if (Number.isNaN(parsed.getTime())) return 'valid';
  const days = (parsed.getTime() - Date.now()) / 86_400_000;
  if (days < 0) return 'expired';
  if (days < 180) return 'expiring';
  return 'valid';
}

function computeAge(dobEn: string): number | string {
  const dob = parseDateEn(dobEn);
  if (Number.isNaN(dob.getTime())) return '--';
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const months = now.getMonth() - dob.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

const HAIRLINE = { height: 'var(--hairline)' };
const VRULE = { width: 'var(--hairline)' };

const PHOTO_SIZE = 52;

/** The cardholder photo, desaturated the way the printed card prints it. */
function GrayPhoto({ src, initials }: { src: string | null; initials: string }) {
  if (src) {
    return (
      <div
        className="relative shrink-0 overflow-hidden rounded-full border-[1.5px] border-white/20"
        style={{ width: PHOTO_SIZE, height: PHOTO_SIZE }}
      >
        <img
          src={src}
          alt="Cardholder portrait"
          className="h-full w-full object-cover grayscale"
          draggable={false}
        />
      </div>
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-b2 bg-bg-elevated text-[17px] font-bold text-t3"
      style={{ width: PHOTO_SIZE, height: PHOTO_SIZE }}
    >
      {initials}
    </div>
  );
}

const STATUS_DOT: Record<Status, string> = {
  valid: 'bg-green',
  expiring: 'bg-warn',
  expired: 'bg-danger',
};

function CountryFlagBadge({ code, status }: { code: CountryCode; status: Status }) {
  const config = getCountryConfig(code);
  return (
    <div className="flex shrink-0 flex-col items-center gap-[5px]">
      <div className="overflow-hidden rounded-[3px] border-[0.5px] border-black/10">
        <Flag code={code} width={36} height={24} />
      </div>
      <div className="flex items-center gap-[3px]">
        {status !== 'valid' && (
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
        )}
        <span className="text-[7px] font-bold tracking-[0.3px] text-gold-light">
          {config.flagLabel}
        </span>
      </div>
    </div>
  );
}

const FIELD_LABEL =
  'text-[8.5px] font-bold uppercase tracking-[1px] text-t4';

function FieldCell({
  icon,
  label,
  children,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 px-4 py-3">
      <div className="mb-1 flex items-center gap-1">
        <Icon name={icon} size={11} className="text-t3" />
        <span className={FIELD_LABEL}>{label}</span>
      </div>
      <div className="text-xs font-semibold text-t1">{children}</div>
    </div>
  );
}

function SpecItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="w-1/2 py-1.5">
      <div className="mb-0.5 text-[7.5px] font-bold tracking-[0.8px] text-t4">{label}</div>
      <div
        className={
          mono
            ? 'font-mono text-[10px] font-semibold tracking-[0.4px] text-t2'
            : 'text-[11px] font-semibold text-t2'
        }
      >
        {value}
      </div>
    </div>
  );
}

function BioRow({
  icon,
  label,
  value,
  tag,
  muted,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  value: string;
  tag: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2">
      <Icon name={icon} size={14} className={muted ? 'text-t4' : 'text-green'} />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 text-[7.5px] font-bold tracking-[0.8px] text-t4">{label}</div>
        <div
          className={`font-mono text-[10px] font-semibold tracking-[0.4px] ${muted ? 'text-t4' : 'text-t2'}`}
        >
          {value}
        </div>
      </div>
      <span
        className={`rounded-[3px] border px-1.5 py-0.5 text-[7px] font-extrabold tracking-[0.6px] ${
          muted ? 'border-b2 text-t4' : 'border-green-border text-green'
        }`}
      >
        {tag}
      </span>
    </div>
  );
}

/* ── Panel drag ────────────────────────────────────────────────── */

const PANEL_SPRING = { damping: 28, stiffness: 340, mass: 1 };
/** Vertical slop before a drag wins over a tap, matching the native gesture. */
const DRAG_SLOP = 3;
const FLING_VELOCITY = 400;
const VELOCITY_WINDOW_MS = 80;

/* ── Component ────────────────────────────────────────────────── */

export function Identity() {
  const navigate = useNavigate();
  const preferencesQuery = usePreferences();
  const updatePreferences = useUpdatePreferences();

  const country = (preferencesQuery.data?.active_country ?? 'TH') as CountryCode;
  const lang = preferencesQuery.data?.language ?? 'en';
  const theme = preferencesQuery.data?.theme ?? 'dark';
  const config = getCountryConfig(country);

  const t = useCallback(
    (key: string) => {
      const entry = config.translations[key];
      if (!entry) return key;
      return entry[lang] ?? entry.en ?? key;
    },
    [config, lang],
  );

  const profileQuery = useProfile(country);
  const cardFront = useCardImage(profileQuery.data?.card_front_path);
  const portrait = useCardImage(profileQuery.data?.portrait_path);

  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light');
  }, [theme]);

  const cardData = useMemo(() => {
    const stored = profileQuery.data?.data as Partial<ProfileType> | undefined;
    return { ...config.defaultCardData, ...(stored ?? {}) };
  }, [config, profileQuery.data]);

  const status = useMemo(
    () => validityStatus(cardData.isValid, cardData.dateOfExpiry),
    [cardData.isValid, cardData.dateOfExpiry],
  );
  const age = useMemo(() => computeAge(cardData.dateOfBirth), [cardData.dateOfBirth]);

  const toggleLanguage = () => {
    updatePreferences.mutate(
      { language: lang === 'en' ? config.secondaryLanguage.code : 'en' },
      { onError: (error) => reportError('Identity.toggleLanguage', error) },
    );
  };

  const copyId = () => {
    navigator.clipboard?.writeText(cardData.idNumber).catch((error) => {
      reportError('Identity.copyId', error);
    });
    navigator.vibrate?.(12);
  };

  /* ── Panel geometry ── */
  const headerRef = useRef<HTMLDivElement>(null);
  const cardZoneRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  const [geometry, setGeometry] = useState({ top: 0, range: 0 });

  useEffect(() => {
    const header = headerRef.current;
    const cardZone = cardZoneRef.current;
    if (!header || !cardZone) return;

    const measure = () => {
      const h = header.offsetHeight;
      const cz = cardZone.offsetHeight;
      if (h <= 0 || cz <= 0) return;
      // Expanded, the panel's top lands on the top of the card itself.
      const cardTop = h + 16;
      const cardBottom = h + cz;
      setGeometry({ top: cardBottom, range: Math.max(0, cardBottom - cardTop) });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    observer.observe(cardZone);
    return () => observer.disconnect();
  }, []);

  /* ── Panel motion ── */
  const spring = useRef(new Spring(0, PANEL_SPRING)).current;
  const frame = useRef<number | null>(null);
  const lastFrameTime = useRef(0);
  const rangeRef = useRef(0);
  rangeRef.current = geometry.range;

  const paint = useCallback(() => {
    const expansion = clamp(spring.value, 0, 1);
    if (panelRef.current) {
      panelRef.current.style.transform = `translateY(${-expansion * rangeRef.current}px)`;
    }
    // Only the pill fades; the emblem divider stays as a separator.
    if (pillRef.current) pillRef.current.style.opacity = `${1 - expansion}`;
    if (detailsRef.current) {
      detailsRef.current.style.opacity = `${expansion}`;
      detailsRef.current.style.transform = `translateY(${-expansion * 24}px)`;
      detailsRef.current.style.pointerEvents = expansion > 0.5 ? 'auto' : 'none';
    }
  }, [spring]);

  const runFrames = useCallback(() => {
    if (frame.current !== null) return;
    lastFrameTime.current = performance.now();
    const tick = (now: number) => {
      const delta = now - lastFrameTime.current;
      lastFrameTime.current = now;
      const moving = spring.step(delta);
      paint();
      frame.current = moving ? requestAnimationFrame(tick) : null;
    };
    frame.current = requestAnimationFrame(tick);
  }, [paint, spring]);

  useEffect(() => {
    paint();
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [paint, geometry.range]);

  const drag = useRef({
    pointerId: -1,
    startY: 0,
    startExpansion: 0,
    active: false,
    moved: false,
    samples: [] as { t: number; y: number }[],
  });

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const state = drag.current;
    state.pointerId = event.pointerId;
    state.startY = event.clientY;
    state.startExpansion = clamp(spring.value, 0, 1);
    state.active = true;
    state.moved = false;
    state.samples = [{ t: performance.now(), y: event.clientY }];
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const state = drag.current;
    if (!state.active || event.pointerId !== state.pointerId) return;

    const range = rangeRef.current;
    if (range <= 0) return;

    const dy = event.clientY - state.startY;
    if (!state.moved) {
      if (Math.abs(dy) < DRAG_SLOP) return;
      state.moved = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }

    const now = performance.now();
    state.samples.push({ t: now, y: event.clientY });
    while (state.samples.length > 2 && now - state.samples[0].t > VELOCITY_WINDOW_MS) {
      state.samples.shift();
    }

    spring.jumpTo(clamp(state.startExpansion - dy / range, 0, 1));
    paint();
  };

  const endDrag = (event: React.PointerEvent) => {
    const state = drag.current;
    if (!state.active || event.pointerId !== state.pointerId) return;
    state.active = false;

    if (!state.moved) return;

    const samples = state.samples;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const elapsed = last.t - first.t;
    // Negative is upward, matching the native gesture's sign convention.
    const velocity = elapsed > 0 ? ((last.y - first.y) / elapsed) * 1000 : 0;

    const expansion = clamp(spring.value, 0, 1);
    const snap = expansion > 0.4 || velocity < -FLING_VELOCITY ? 1 : 0;
    spring.animateTo(snap);
    runFrames();
  };

  /** A completed drag must not also fire the button underneath it. */
  const onClickCapture = (event: React.MouseEvent) => {
    if (drag.current.moved) {
      event.stopPropagation();
      event.preventDefault();
      drag.current.moved = false;
    }
  };

  const initials = `${cardData.firstName.charAt(0)}${cardData.lastName.charAt(0)}`;
  const localDate = (en: string, local?: string) => (lang === 'en' ? en : (local ?? en));

  return (
    <div className="relative h-dvh overflow-hidden bg-bg">
      <BackgroundAtmosphere />
      <LivenessWatermark code={country} />

      <div ref={headerRef} className="[animation:enter-header_500ms_ease-out_50ms_backwards]">
        <ScreenHeader
          code={country}
          title={t('header.title')}
          sub={t('header.sub')}
          language={lang}
          onToggleLanguage={toggleLanguage}
          busy={updatePreferences.isPending}
        />
      </div>

      <div ref={cardZoneRef} className="relative z-10 flex flex-col items-center px-4 pt-4 pb-3">
        <div className="w-full [animation:enter-card_450ms_ease-out_200ms_backwards]">
          <FlippableCard
            frontSrc={cardFront ?? config.cardImages.front}
            backSrc={config.cardImages.back}
            updatedLabel={t('card.updated')}
          />
          <p className="mt-2 text-center text-[11px] text-t4">{t('card.flipHint')}</p>
        </div>
      </div>

      <div
        ref={panelRef}
        className="absolute right-0 left-0 z-20 px-5"
        style={{ top: geometry.top, bottom: -geometry.range }}
      >
        <div className="h-full [animation:enter-panel_380ms_ease-out_480ms_backwards]">
          <div
            className="flex h-full flex-col overflow-hidden rounded-t-xl border border-navy border-t-0 bg-bg-card"
            style={{
              borderTopWidth: 1,
              borderTopColor: 'color-mix(in srgb, var(--color-gold-light) 15%, transparent)',
            }}
          >
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onClickCapture={onClickCapture}
              className="touch-pan-y select-none"
            >
              {/* Official header */}
              <div className="flex items-center justify-between bg-navy px-4 py-4">
                <span className="text-[8.5px] font-extrabold tracking-[1.8px] text-white/75">
                  {config.name.english}
                </span>
                <NationalEmblem code={country} size={20} opacity={0.9} />
                <span className="text-[8.5px] font-extrabold tracking-[1.8px] text-white/75">
                  {config.name.primary}
                </span>
              </div>

              <div className="[animation:enter-row_180ms_ease-out_580ms_backwards]">
                {/* Identity */}
                <div className="flex items-center gap-3.5 px-4 py-3.5">
                  <GrayPhoto src={portrait} initials={initials} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold tracking-[0.2px] text-t1">
                      {lang === 'en'
                        ? `${cardData.firstName.toUpperCase()}  ${cardData.lastName.toUpperCase()}`
                        : (cardData.nameThai ?? cardData.fullNameEnglish)}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-t3">
                      {lang === 'en'
                        ? (cardData.nameThai ?? '')
                        : cardData.fullNameEnglish}
                    </div>
                  </div>
                  <CountryFlagBadge code={country} status={status} />
                </div>

                <div className="bg-b2" style={HAIRLINE} />

                {/* ID number */}
                <div className="flex items-center px-4 py-3">
                  <Icon name="fingerprint" size={13} className="text-gold-light" />
                  <div className="ml-2.5 min-w-0 flex-1">
                    <div className={`mb-[3px] ${FIELD_LABEL}`}>{t('id.personalNo')}</div>
                    <div className="font-mono text-[15px] tracking-[0.8px] text-gold-light">
                      {cardData.idNumber}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={copyId}
                    aria-label="Copy ID number"
                    className="flex h-[26px] w-[26px] items-center justify-center rounded-[5px] border border-gold-border bg-gold-bg text-gold-light"
                  >
                    <Icon name="copy" size={12} />
                  </button>
                </div>
                <div className="bg-b2" style={HAIRLINE} />
              </div>

              <div className="[animation:enter-row_180ms_ease-out_710ms_backwards]">
                {/* DOB + Age */}
                <div className="flex">
                  <FieldCell icon="calendar" label={t('info.dob')}>
                    {localDate(cardData.dateOfBirth, cardData.dateOfBirthThai)}
                  </FieldCell>
                  <div className="bg-b2" style={VRULE} />
                  <FieldCell icon="hourglass" label={t('info.age')}>
                    {age}
                    <span className="text-[10px] text-t3">{t('info.ageUnit')}</span>
                  </FieldCell>
                </div>

                <div className="bg-b2" style={HAIRLINE} />

                {/* Issue + Expiry */}
                <div className="flex">
                  <FieldCell icon="ribbon" label={t('info.issued')}>
                    {localDate(cardData.dateOfIssue, cardData.dateOfIssueThai)}
                  </FieldCell>
                  <div className="bg-b2" style={VRULE} />
                  <FieldCell icon="clock" label={t('info.expires')}>
                    {localDate(cardData.dateOfExpiry, cardData.dateOfExpiryThai)}
                  </FieldCell>
                </div>
                <div className="bg-b2" style={HAIRLINE} />
              </div>

              {/* Address */}
              <div className="px-4 py-3 [animation:enter-row_180ms_ease-out_840ms_backwards]">
                <div className="mb-1 flex items-center gap-1">
                  <Icon name="location" size={11} className="text-t3" />
                  <span className={FIELD_LABEL}>{t('info.address')}</span>
                </div>
                <p className="line-clamp-2 text-xs leading-4 font-semibold text-t1">
                  {config.addressFormatter(cardData, lang)}
                </p>
              </div>

              {/* Emblem divider + swipe pill */}
              <div className="flex items-center gap-2.5 px-4 py-3.5">
                <div className="flex-1 bg-gold-border" style={HAIRLINE} />
                <NationalEmblem code={country} size={14} opacity={0.25} />
                <div className="flex-1 bg-gold-border" style={HAIRLINE} />
              </div>

              <div ref={pillRef} className="pointer-events-none flex justify-center py-2.5">
                <div className="h-[3px] w-8 rounded-[1.5px] bg-b2" />
              </div>

              {/* ── Expanded details ── */}
              <div ref={detailsRef} style={{ opacity: 0 }}>
                <div className="flex items-center gap-1.5 px-4 pt-2.5 pb-1.5">
                  <Icon name="chip" size={12} className="text-gold-light" />
                  <span className="text-[9px] font-bold tracking-[1.2px] text-gold-light">
                    {t('expanded.smartCard')}
                  </span>
                </div>
                <div className="flex flex-wrap px-4 pb-2.5">
                  <SpecItem label={t('expanded.chipSerial')} value={config.chipSerial} mono />
                  <SpecItem label={t('expanded.generation')} value={t('expanded.genValue')} />
                  <SpecItem label={t('expanded.interface')} value={t('expanded.interfaceValue')} />
                  <SpecItem label={t('expanded.standard')} value="ISO/IEC 7816-4" mono />
                </div>

                <div className="bg-b2" style={HAIRLINE} />

                <div className="flex items-center gap-1.5 px-4 pt-2.5 pb-1.5">
                  <Icon name="body" size={12} className="text-gold-light" />
                  <span className="text-[9px] font-bold tracking-[1.2px] text-gold-light">
                    {t('expanded.biometric')}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <BioRow
                    icon="fingerprint"
                    label={t('expanded.fingerprint')}
                    value="a7f2c934...6d3f8e2a"
                    tag={t('expanded.enrolled')}
                  />
                  <BioRow
                    icon="scan"
                    label={t('expanded.faceTemplate')}
                    value="fc91b2e8...04a7d1c3"
                    tag={t('expanded.enrolled')}
                  />
                  <BioRow
                    icon="eye"
                    label={t('expanded.irisScan')}
                    value="—"
                    tag={t('expanded.na')}
                    muted
                  />
                </div>

                <div className="bg-b2" style={HAIRLINE} />

                <button
                  type="button"
                  onClick={() => navigate('/details')}
                  className="flex w-full items-center gap-2 px-4 py-3.5 text-left"
                >
                  <Icon name="document" size={14} className="text-gold-light" />
                  <span className="text-[11px] font-bold tracking-[0.4px] text-gold-light">
                    {t('details.cardDetails')}
                  </span>
                  <Icon name="chevronRight" size={14} className="ml-auto text-t4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
