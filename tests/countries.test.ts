import { describe, expect, it } from 'vitest';
import { COUNTRY_CODES, COUNTRY_CONFIGS, getCountryConfig } from '@/countries';
import { ProfileSchema } from '@/types/profile';

describe('country configs', () => {
  it('registers all five supported countries', () => {
    expect(COUNTRY_CODES.sort()).toEqual(['BR', 'SG', 'TH', 'US', 'VN']);
  });

  it.each(COUNTRY_CODES)('%s resolves its assets to bundler URLs', (code) => {
    const config = COUNTRY_CONFIGS[code];

    expect(config.emblemAsset).toBeTypeOf('string');
    expect(config.cardImages.front).toBeTypeOf('string');
    expect(config.cardImages.back).toBeTypeOf('string');
  });

  it.each(COUNTRY_CODES)('%s points at an extracted card template', (code) => {
    expect(COUNTRY_CONFIGS[code].cardTemplate).toMatch(/^\/templates\/.+\.(png|jpg)$/);
  });

  it.each(COUNTRY_CODES)('%s ships default card data matching the profile schema', (code) => {
    expect(() => ProfileSchema.parse(COUNTRY_CONFIGS[code].defaultCardData)).not.toThrow();
  });

  it('falls back to Thailand for an unknown code', () => {
    expect(getCountryConfig('XX' as never).code).toBe('TH');
  });
});
