import type { CountryCode } from '@/types/profile';
import type { CountryConfig } from './types';
import { THAILAND_CONFIG } from './thailand';
import { SINGAPORE_CONFIG } from './singapore';
import { BRAZIL_CONFIG } from './brazil';
import { USA_CONFIG } from './usa';
import { VIETNAM_CONFIG } from './vietnam';

export type { CountryConfig };

export const COUNTRY_CONFIGS: Record<CountryCode, CountryConfig> = {
  TH: THAILAND_CONFIG,
  SG: SINGAPORE_CONFIG,
  BR: BRAZIL_CONFIG,
  US: USA_CONFIG,
  VN: VIETNAM_CONFIG,
};

export const COUNTRY_CODES = Object.keys(COUNTRY_CONFIGS) as CountryCode[];

export function getCountryConfig(code: CountryCode): CountryConfig {
  return COUNTRY_CONFIGS[code] ?? THAILAND_CONFIG;
}

export { THAILAND_CONFIG, SINGAPORE_CONFIG, BRAZIL_CONFIG, USA_CONFIG, VIETNAM_CONFIG };
