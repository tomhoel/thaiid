/**
 * Card image storage — saves generated card images to the file system
 * instead of AsyncStorage to avoid the 6MB SQLite limit.
 */
import { Paths, File, Directory } from 'expo-file-system/next';

const CARD_DIR = new Directory(Paths.document, 'cards');

function ensureDir() {
  if (!CARD_DIR.exists) CARD_DIR.create();
}

/** Save a data URI to a file and return the file:// URI */
export async function saveCardImage(countryCode: string, dataUri: string): Promise<string> {
  ensureDir();
  const base64 = dataUri.split(',')[1];
  const file = new File(CARD_DIR, `${countryCode}-front.png`);
  file.write(base64, { encoding: 'base64' });
  return file.uri;
}

/** Save a portrait data URI to a shared file and return the file:// URI.
 *  All countries reference the same portrait file to avoid sync drift. */
export async function savePortraitImage(_countryCode: string, dataUri: string): Promise<string> {
  ensureDir();
  const base64 = dataUri.split(',')[1];
  const file = new File(CARD_DIR, `shared-portrait.png`);
  file.write(base64, { encoding: 'base64' });
  return file.uri;
}

/** Delete all saved card images (used by reset) */
export async function clearCardImages(): Promise<void> {
  if (CARD_DIR.exists) CARD_DIR.delete();
}
