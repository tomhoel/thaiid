import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProfileSchema } from '../../src/types/profile';
import { TokenService } from '../../src/services/tokenService';
import { StorageService } from '../../src/services/storageService';
import { GeminiService } from '../../src/services/geminiService';
import { saveCardVersion, getVersions, findMatchingVersion, clearHistory } from '../../src/utils/versionHistory';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory mock for AsyncStorage
vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-key',
      },
    },
  },
}));

const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => store.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { store.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { store.delete(key); }),
    clear: vi.fn(async () => { store.clear(); }),
    getAllKeys: vi.fn(async () => Array.from(store.keys())),
    multiRemove: vi.fn(async (keys: string[]) => { keys.forEach((k) => store.delete(k)); }),
  },
}));

describe('ProfileSchema & Zod Validation', () => {
  it('validates a standard citizen profile', () => {
    const raw = {
      idNumber: '1 6501 00094 20 0',
      firstName: 'SOMCHAI',
      lastName: 'PRASERT',
      fullNameEnglish: 'Mr. Somchai Prasert',
      dateOfBirth: '15 Jan 1990',
      dateOfIssue: '01 Jan 2020',
      dateOfExpiry: '01 Jan 2030',
      isValid: true,
    };

    const res = ProfileSchema.safeParse(raw);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.fullNameEnglish).toBe('Mr. Somchai Prasert');
      expect(res.data.isValid).toBe(true);
    }
  });

  it('fails validation when required fields are missing', () => {
    const raw = {
      firstName: 'SOMCHAI',
    };
    const res = ProfileSchema.safeParse(raw);
    expect(res.success).toBe(false);
  });
});

describe('TokenService Digital ID generation', () => {
  it('generates consistent rotating token for same 15s window', () => {
    const fixedTime = 1770000000;
    const token1 = TokenService.generateToken('1650100094200', fixedTime);
    const token2 = TokenService.generateToken('1650100094200', fixedTime + 10);
    expect(token1).toBe(token2);
    expect(token1.length).toBeGreaterThan(0);
  });

  it('generates different token across time steps', () => {
    const t1 = 1770000000;
    const t2 = t1 + 30;
    const token1 = TokenService.generateToken('1650100094200', t1);
    const token2 = TokenService.generateToken('1650100094200', t2);
    expect(token1).not.toBe(token2);
  });

  it('builds valid JSON payload for QR code with signature', () => {
    const profile = {
      idNumber: '1 6501 00094 20 0',
      idNumberCompact: '1650100094200',
      firstName: 'SOMCHAI',
      lastName: 'PRASERT',
      fullNameEnglish: 'Mr. Somchai Prasert',
      dateOfBirth: '15 Jan 1990',
      dateOfIssue: '01 Jan 2020',
      dateOfExpiry: '01 Jan 2030',
      isValid: true,
    };

    const raw = TokenService.generateQrPayload(profile, 'TH');
    const parsed = JSON.parse(raw);
    expect(parsed.v).toBe('1.0');
    expect(parsed.id).toBe('1650100094200');
    expect(parsed.name).toBe('Mr. Somchai Prasert');
    expect(parsed.country).toBe('TH');
    expect(parsed.sig).toBeDefined();
    expect(parsed.tok).toBeDefined();
  });
});

describe('StorageService persistence', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('saves and retrieves profile with defaults fallback', async () => {
    const defaults = {
      idNumber: 'DEFAULT-ID',
      firstName: 'DEFAULT',
      lastName: 'USER',
      fullNameEnglish: 'DEFAULT USER',
      dateOfBirth: '01 Jan 2000',
      dateOfIssue: '01 Jan 2020',
      dateOfExpiry: '01 Jan 2030',
      isValid: true,
    };

    const initial = await StorageService.getProfile('TH', defaults);
    expect(initial.idNumber).toBe('DEFAULT-ID');

    const updated = { ...defaults, fullNameEnglish: 'Updated Citizen' };
    await StorageService.saveProfile('TH', updated);

    const loaded = await StorageService.getProfile('TH', defaults);
    expect(loaded.fullNameEnglish).toBe('Updated Citizen');
  });
});

describe('GeminiService AI Prompt & Image Processing', () => {
  it('builds structured prompt parts with template and strict aspect ratio instructions', () => {
    const parts = GeminiService.buildCardParts({
      templateBase64: 'BASE64TEMPLATE==',
      cardDescription: 'Thai National ID Card',
      secondaryLangName: 'Thai',
      profileData: {
        idNumber: '1 6501 00094 20 0',
        nameThai: 'นายสมชาย ประเสริฐ',
        fullNameEnglish: 'Mr. Somchai Prasert',
        dateOfBirth: '15 Jan 1990',
        dateOfIssue: '01 Jan 2020',
        dateOfExpiry: '01 Jan 2030',
      },
    });

    expect(parts.length).toBe(2);
    expect(parts[0].inlineData.data).toBe('BASE64TEMPLATE==');
    expect(parts[1].text).toContain('1013x638 pixels');
    expect(parts[1].text).toContain('Mr. Somchai Prasert');
  });

  it('extracts base64 image data URI correctly from Gemini response structure', () => {
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              { text: 'Card generation finished successfully' },
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                },
              },
            ],
          },
        },
      ],
    };

    const uri = GeminiService.extractImageUri(mockResponse);
    expect(uri).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
  });
});

describe('VersionHistory Snapshot Storage & Retrieval', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('saves and retrieves card version snapshots', async () => {
    const profile = {
      fullNameEnglish: 'Jane Doe',
      dateOfBirth: '10 Feb 1995',
      dateOfIssue: '01 Jan 2022',
      dateOfExpiry: '01 Jan 2032',
      idNumber: 'S1234567A',
    };

    const v1 = await saveCardVersion('SG', profile, 'data:image/png;base64,CARD1', 'data:image/jpeg;base64,PORT1');
    expect(v1.id).toBeDefined();

    const versions = await getVersions('SG');
    expect(versions.length).toBe(1);
    expect(versions[0].profileSnapshot.fullNameEnglish).toBe('Jane Doe');

    const matching = await findMatchingVersion('SG', profile);
    expect(matching).not.toBeNull();
    expect(matching?.cardImageUri).toBe('data:image/png;base64,CARD1');

    await clearHistory('SG');
    const afterClear = await getVersions('SG');
    expect(afterClear.length).toBe(0);
  });
});
