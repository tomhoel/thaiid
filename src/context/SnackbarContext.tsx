import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Snackbar, type SnackbarVariant } from '../components/Snackbar';
import { setSnackbarHandler } from '../utils/reportError';

interface SnackbarApi {
  show: (text: string, variant?: SnackbarVariant, opts?: { durationMs?: number }) => void;
}

const SnackbarContext = createContext<SnackbarApi>({ show: () => {} });

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [text, setText] = useState<string | null>(null);
  const [variant, setVariant] = useState<SnackbarVariant>('info');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (next: string, nextVariant: SnackbarVariant = 'info', opts?: { durationMs?: number }) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setText(next);
      setVariant(nextVariant);
      timerRef.current = setTimeout(() => setText(null), opts?.durationMs ?? 4000);
    },
    []
  );

  // Bridge reportError -> snackbar
  useEffect(() => {
    setSnackbarHandler((t) => show(t, 'error'));
    return () => setSnackbarHandler(() => {});
  }, [show]);

  // Cleanup timer on unmount
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <SnackbarContext.Provider value={{ show }}>
      {children}
      <Snackbar text={text} variant={variant} />
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarApi {
  return useContext(SnackbarContext);
}
