import type { CountryCode, ProfileType } from '@/types/profile';

export type { CountryCode };

export interface CountryConfig {
  code: CountryCode;
  name: { english: string; primary: string };
  issuer: { english: string; primary: string };
  ministry: string;
  splashFooter: string;
  qrType: string;
  systemReference: string;
  chipSerial: string;
  cardDescription: string;
  cardPromptHint: string;

  /** Resolved, content-hashed URLs produced by Vite's asset pipeline. */
  emblemAsset: string;
  cardImages: { front: string; back: string };
  /** Public URL of the base card image the generator engraves onto. */
  cardTemplate: string;

  flagLabel: string;

  secondaryLanguage: { code: string; label: string; langName: string };

  dateFormat: { toLocal: (enDate: string) => string };

  addressFormatter: (data: Record<string, unknown>, lang: string) => string;

  translations: Record<string, Record<string, string>>;

  holoStripSide: 'left' | 'right';
  /** Percentage inset from the edge. Defaults to 6%. */
  holoStripOffset?: number;
  /** False when the emblem is pre-coloured and must not be tinted. */
  emblemTinted?: boolean;

  defaultCardData: ProfileType;

  /** Accent overrides layered on top of the base theme tokens. */
  accent?: {
    dark: { gold: string; goldLight: string; goldBg: string; goldBorder: string; navy?: string };
    light: { gold: string; goldLight: string; goldBg: string; goldBorder: string; navy?: string };
  };
}
