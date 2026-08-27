import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileType, ProfileSchema, CountryCode } from '../types/profile';
import { reportError } from '../utils/reportError';

const STORAGE_KEYS = {
  profile: (code: string) => `profile_data_${code}`,
  cardImage: (code: string) => `card_img_${code}`,
  sharedPortrait: 'shared_portrait_img',
  history: (code: string) => `card_history_${code}`,
  biometric: 'biometric_enabled',
  theme: 'app_theme',
  country: 'active_country',
  language: 'active_lang',
};

export class StorageService {
  /** Get profile for country, validating with Zod */
  static async getProfile(countryCode: string, defaults: ProfileType): Promise<ProfileType> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.profile(countryCode));
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      const merged = { ...defaults, ...parsed };
      const validated = ProfileSchema.safeParse(merged);
      return validated.success ? validated.data : merged;
    } catch (e) {
      reportError('StorageService.getProfile', e);
      return defaults;
    }
  }

  /** Save profile for country */
  static async saveProfile(countryCode: string, profile: ProfileType): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.profile(countryCode), JSON.stringify(profile));
    } catch (e) {
      reportError('StorageService.saveProfile', e, {
        userVisible: true,
        toast: 'Could not save profile changes.',
      });
      throw e;
    }
  }

  /** Save card image (file:// on native, AsyncStorage on web) */
  static async saveCardImage(countryCode: string, dataUri: string): Promise<string> {
    if (Platform.OS === 'web') {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.cardImage(countryCode), dataUri);
      } catch (e) {
        reportError('StorageService.saveCardImage:web', e);
      }
      return dataUri;
    }

    try {
      const { Paths, Directory, File } = require('expo-file-system/next');
      const dir = new Directory(Paths.document, 'cards');
      if (!dir.exists) dir.create();
      const base64 = dataUri.split(',')[1];
      const file = new File(dir, `${countryCode}-front.png`);
      file.write(base64, { encoding: 'base64' });
      return file.uri;
    } catch (e) {
      reportError('StorageService.saveCardImage:native', e);
      return dataUri;
    }
  }

  /** Save shared portrait image */
  static async savePortraitImage(dataUri: string): Promise<string> {
    if (Platform.OS === 'web') {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.sharedPortrait, dataUri);
      } catch (e) {
        reportError('StorageService.savePortraitImage:web', e);
      }
      return dataUri;
    }

    try {
      const { Paths, Directory, File } = require('expo-file-system/next');
      const dir = new Directory(Paths.document, 'cards');
      if (!dir.exists) dir.create();
      const base64 = dataUri.split(',')[1];
      const file = new File(dir, 'shared-portrait.png');
      file.write(base64, { encoding: 'base64' });
      return file.uri;
    } catch (e) {
      reportError('StorageService.savePortraitImage:native', e);
      return dataUri;
    }
  }

  /** Clear all saved images across all countries */
  static async clearAllCardImages(): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const cardKeys = keys.filter(k => k.startsWith('card_img_') || k === STORAGE_KEYS.sharedPortrait);
        if (cardKeys.length > 0) await AsyncStorage.multiRemove(cardKeys);
      } catch (e) {
        reportError('StorageService.clearAllCardImages:web', e);
      }
      return;
    }

    try {
      const { Paths, Directory } = require('expo-file-system/next');
      const dir = new Directory(Paths.document, 'cards');
      if (dir.exists) dir.delete();
    } catch (e) {
      reportError('StorageService.clearAllCardImages:native', e);
    }
  }
}
