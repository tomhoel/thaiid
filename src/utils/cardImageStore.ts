/**
 * Card image storage — saves generated card images to the file system
 * instead of AsyncStorage to avoid the 6MB SQLite limit on native,
 * and uses AsyncStorage/dataUri fallback on web.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let cachedDir: any = null;

function getCardDir() {
  if (Platform.OS === 'web') return null;
  if (!cachedDir) {
    try {
      const { Paths, Directory } = require('expo-file-system/next');
      cachedDir = new Directory(Paths.document, 'cards');
    } catch {
      cachedDir = null;
    }
  }
  return cachedDir;
}

function ensureDir() {
  const dir = getCardDir();
  if (dir && !dir.exists) {
    try {
      dir.create();
    } catch {}
  }
}

/** Save a data URI to a file and return the file:// URI (or dataUri on web) */
export async function saveCardImage(countryCode: string, dataUri: string): Promise<string> {
  if (Platform.OS === 'web') {
    try {
      await AsyncStorage.setItem(`card_img_${countryCode}`, dataUri);
    } catch {}
    return dataUri;
  }
  ensureDir();
  const dir = getCardDir();
  if (!dir) return dataUri;
  const { File } = require('expo-file-system/next');
  const base64 = dataUri.split(',')[1];
  const file = new File(dir, `${countryCode}-front.png`);
  file.write(base64, { encoding: 'base64' });
  return file.uri;
}

/** Save a portrait data URI to a shared file and return the file:// URI (or dataUri on web).
 *  All countries reference the same portrait file to avoid sync drift. */
export async function savePortraitImage(_countryCode: string, dataUri: string): Promise<string> {
  if (Platform.OS === 'web') {
    try {
      await AsyncStorage.setItem('shared_portrait_img', dataUri);
    } catch {}
    return dataUri;
  }
  ensureDir();
  const dir = getCardDir();
  if (!dir) return dataUri;
  const { File } = require('expo-file-system/next');
  const base64 = dataUri.split(',')[1];
  const file = new File(dir, `shared-portrait.png`);
  file.write(base64, { encoding: 'base64' });
  return file.uri;
}

/** Delete all saved card images (used by reset) */
export async function clearCardImages(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cardKeys = keys.filter(k => k.startsWith('card_img_') || k === 'shared_portrait_img');
      if (cardKeys.length > 0) await AsyncStorage.multiRemove(cardKeys);
    } catch {}
    return;
  }
  const dir = getCardDir();
  if (dir && dir.exists) {
    try {
      dir.delete();
    } catch {}
  }
}
