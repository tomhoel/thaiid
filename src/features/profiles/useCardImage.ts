import { useEffect, useState } from 'react';
import { apiFetchBlob } from '@/lib/apiClient';
import { reportError } from '@/lib/reportError';

/**
 * Turns a stored card path into a URL an `<img>` can display.
 *
 * Card renders live in a private Blob store and are served by `api/cards.ts`
 * only after an ownership check, so there is no URL the browser can load
 * directly. The bytes are fetched with the session token and wrapped in an
 * object URL, which is revoked when the path changes or the component unmounts
 * so the images do not accumulate in memory.
 */
export function useCardImage(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    apiFetchBlob(`/api/cards?path=${encodeURIComponent(path)}`)
      .then((blob) => {
        // The effect may have been torn down while the request was in flight.
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((error) => {
        if (cancelled) return;
        reportError('useCardImage', error);
        setUrl(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  return url;
}
