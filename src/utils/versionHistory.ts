/**
 * Card Version History — saves generated card snapshots so users can
 * restore previous configurations without re-generating.
 *
 * Images live on the file system (avoids AsyncStorage size limits).
 * Metadata (profile data + file paths) stored in AsyncStorage.
 */
import { Paths, File, Directory } from 'expo-file-system/next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_DIR = new Directory(Paths.document, 'card-history');
const MAX_VERSIONS = 8;

function ensureDir() {
  if (!HISTORY_DIR.exists) HISTORY_DIR.create();
}

const metaKey = (countryCode: string) => `card_history_${countryCode}`;

export interface CardVersion {
  id: string;
  timestamp: number;
  /** The profile fields that produced this card */
  profileSnapshot: Record<string, any>;
  /** File URI to the saved card front image */
  cardImageUri: string;
  /** File URI to the portrait used (shared file) */
  portraitUri?: string;
}

/** Generate a short unique ID */
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Fingerprint the fields that affect card generation */
function profileFingerprint(profile: Record<string, any>): string {
  const keys = ['fullNameEnglish', 'dateOfBirth', 'dateOfIssue', 'dateOfExpiry', 'pictureUri'];
  return keys.map(k => `${k}:${profile[k] ?? ''}`).join('|');
}

/** Load all versions for a country */
export async function getVersions(countryCode: string): Promise<CardVersion[]> {
  try {
    const raw = await AsyncStorage.getItem(metaKey(countryCode));
    if (!raw) return [];
    const versions: CardVersion[] = JSON.parse(raw);
    // Filter out versions whose image files no longer exist
    return versions.filter(v => {
      try {
        const f = new File(v.cardImageUri);
        return f.exists;
      } catch { return false; }
    });
  } catch {
    return [];
  }
}

/** Save a new version after generation. Deduplicates by profile fingerprint. */
export async function saveVersion(
  countryCode: string,
  profileData: Record<string, any>,
  cardImageUri: string,
  portraitUri?: string,
): Promise<CardVersion> {
  ensureDir();

  // Copy the card image into history directory so it survives re-generation
  const id = uid();
  const ext = cardImageUri.includes('.webp') ? 'webp' : 'png';
  const historyFile = new File(HISTORY_DIR, `${countryCode}-${id}.${ext}`);
  // expo-file-system/next File accepts a URI string directly
  const sourceFile = new File(cardImageUri);
  if (sourceFile.exists) {
    sourceFile.copy(historyFile);
  }

  const version: CardVersion = {
    id,
    timestamp: Date.now(),
    profileSnapshot: {
      fullNameEnglish: profileData.fullNameEnglish,
      dateOfBirth: profileData.dateOfBirth,
      dateOfIssue: profileData.dateOfIssue,
      dateOfExpiry: profileData.dateOfExpiry,
    },
    cardImageUri: historyFile.uri,
    portraitUri,
  };

  const existing = await getVersions(countryCode);

  // Remove duplicate if same fingerprint already exists
  const fp = profileFingerprint(profileData);
  const deduped = existing.filter(v => profileFingerprint(v.profileSnapshot) !== fp);

  // Prepend new version, cap at MAX_VERSIONS
  const updated = [version, ...deduped].slice(0, MAX_VERSIONS);

  // Clean up evicted versions
  const evicted = deduped.slice(MAX_VERSIONS - 1);
  for (const old of evicted) {
    try { new File(old.cardImageUri).delete(); } catch {}
  }

  await AsyncStorage.setItem(metaKey(countryCode), JSON.stringify(updated));
  return version;
}

/** Find a cached version matching the exact profile inputs */
export async function findMatchingVersion(
  countryCode: string,
  profileData: Record<string, any>,
): Promise<CardVersion | null> {
  const versions = await getVersions(countryCode);
  const fp = profileFingerprint(profileData);
  return versions.find(v => profileFingerprint(v.profileSnapshot) === fp) ?? null;
}

/** Delete specific versions by ID */
export async function deleteVersions(countryCode: string, ids: string[]): Promise<void> {
  const versions = await getVersions(countryCode);
  const idSet = new Set(ids);

  // Delete image files
  for (const v of versions) {
    if (idSet.has(v.id)) {
      try { new File(v.cardImageUri).delete(); } catch {}
    }
  }

  const remaining = versions.filter(v => !idSet.has(v.id));
  await AsyncStorage.setItem(metaKey(countryCode), JSON.stringify(remaining));
}

/** Clear all history for a country */
export async function clearHistory(countryCode: string): Promise<void> {
  const versions = await getVersions(countryCode);
  for (const v of versions) {
    try { new File(v.cardImageUri).delete(); } catch {}
  }
  await AsyncStorage.removeItem(metaKey(countryCode));
}

/** Clear all history for all countries */
export async function clearAllHistory(): Promise<void> {
  await Promise.all(['TH', 'SG', 'BR', 'US', 'VN'].map(c => clearHistory(c)));
  if (HISTORY_DIR.exists) HISTORY_DIR.delete();
}
