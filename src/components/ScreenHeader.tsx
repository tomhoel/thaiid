import { NationalEmblem } from './card/NationalEmblem';
import { getCountryConfig } from '@/countries';
import type { CountryCode } from '@/types/profile';

/**
 * The navy title bar with the emblem, the screen title and the language toggle.
 *
 * The native header read language from a context. Here it is prop-driven,
 * because language lives in server-held preferences and the route already owns
 * that mutation — passing it down keeps this component pure and testable.
 */
interface ScreenHeaderProps {
  code: CountryCode;
  title: string;
  sub: string;
  language: string;
  onToggleLanguage: () => void;
  busy?: boolean;
}

export function ScreenHeader({
  code,
  title,
  sub,
  language,
  onToggleLanguage,
  busy = false,
}: ScreenHeaderProps) {
  const config = getCountryConfig(code);
  const isEnglish = language === 'en';
  const secondary = config.secondaryLanguage;

  return (
    <header
      className="relative z-10 flex items-center justify-between gap-4 border-b bg-navy px-5 pb-3"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
        borderBottomColor: 'color-mix(in srgb, var(--color-gold-light) 19%, transparent)',
      }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <NationalEmblem code={code} size={32} />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-extrabold tracking-[-0.3px] text-white/90">
            {title}
          </div>
          <div className="mt-px truncate text-[9px] text-white/50">{sub}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleLanguage}
        disabled={busy}
        aria-label={`Switch language to ${isEnglish ? secondary.langName : 'English'}`}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/20 px-2.5 py-1.5 disabled:opacity-50"
      >
        <span
          className={`text-xs font-bold ${isEnglish ? 'text-gold-light' : 'text-white/45'}`}
        >
          EN
        </span>
        <span className="h-[3px] w-[3px] rounded-full bg-white/30" />
        <span
          className={`text-xs font-bold ${isEnglish ? 'text-white/45' : 'text-gold-light'}`}
        >
          {secondary.label}
        </span>
      </button>
    </header>
  );
}
