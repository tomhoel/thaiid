import { useCallback, useState } from 'react';
import { reportError } from '@/lib/reportError';

const PREFIX = 'thaiid:';

/**
 * A boolean kept in localStorage — the browser's equivalent of the
 * AsyncStorage flags the native app used for device-local settings.
 *
 * Deliberately not server state: these describe this device, not the identity,
 * so they must never round-trip through the API.
 */
export function useLocalFlag(key: string, fallback: boolean): [boolean, (next: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : raw === 'true';
    } catch (error) {
      // Private-mode Safari throws on access rather than returning null.
      reportError('useLocalFlag.read', error);
      return fallback;
    }
  });

  const update = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        localStorage.setItem(PREFIX + key, String(next));
      } catch (error) {
        reportError('useLocalFlag.write', error);
      }
    },
    [key],
  );

  return [value, update];
}
