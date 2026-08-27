import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProfileSchema } from '../../src/types/profile';
import { TokenService } from '../../src/services/tokenService';
import { StorageService } from '../../src/services/storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory mock for AsyncStorage
const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => store.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { store.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { store.delete(key); }),
    clear: vi.fn(async () => { store.clear(); }),
    getAllKeys: vi.fn(async () => Array.from(store.keys())),
    multiRemove: vi.fn(async (keys: string[]) => { keys.forEach(k => store.delete(k)); }),
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
