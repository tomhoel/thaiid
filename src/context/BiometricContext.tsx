import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'biometric_enabled';

interface BiometricContextType {
  enabled: boolean;
  authenticated: boolean;
  setEnabled: (val: boolean) => void;
  authenticate: () => Promise<void>;
}

const BiometricContext = createContext<BiometricContextType>({
  enabled: false,
  authenticated: true,
  setEnabled: () => {},
  authenticate: async () => {},
});

export function BiometricProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      const isEnabled = val === 'true';
      setEnabledState(isEnabled);
      if (!isEnabled) setAuthenticated(true);
      setReady(true);
    });
  }, []);

  const authenticate = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access your ID',
      fallbackLabel: 'Use passcode',
      cancelLabel: 'Cancel',
    });
    if (result.success) setAuthenticated(true);
  }, []);

  useEffect(() => {
    if (ready && enabled) authenticate();
  }, [ready, enabled]);

  const setEnabled = useCallback(async (val: boolean) => {
    await AsyncStorage.setItem(STORAGE_KEY, String(val));
    setEnabledState(val);
    if (!val) setAuthenticated(true);
    else {
      setAuthenticated(false);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable biometric lock',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
      });
      if (result.success) setAuthenticated(true);
      else {
        await AsyncStorage.setItem(STORAGE_KEY, 'false');
        setEnabledState(false);
        setAuthenticated(true);
      }
    }
  }, []);

  if (!ready) return null;

  return (
    <BiometricContext.Provider value={{ enabled, authenticated, setEnabled, authenticate }}>
      {children}
    </BiometricContext.Provider>
  );
}

export const useBiometric = () => useContext(BiometricContext);
