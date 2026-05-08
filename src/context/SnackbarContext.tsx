import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Snackbar } from '../components/Snackbar';
import { setSnackbarHandler } from '../utils/reportError';

interface SnackbarApi {
  show: (text: string, opts?: { durationMs?: number }) => void;
}

const SnackbarContext = createContext<SnackbarApi>({ show: () => {} });

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [text, setText] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: string, opts?: { durationMs?: number }) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setText(next);
    timerRef.current = setTimeout(() => setText(null), opts?.durationMs ?? 4000);
  }, []);

  // Bridge reportError -> snackbar
  useEffect(() => {
    setSnackbarHandler((t) => show(t));
    return () => setSnackbarHandler(() => {});
  }, [show]);

  // Cleanup timer on unmount
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <SnackbarContext.Provider value={{ show }}>
      {children}
      <Snackbar text={text} />
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarApi {
  return useContext(SnackbarContext);
}
