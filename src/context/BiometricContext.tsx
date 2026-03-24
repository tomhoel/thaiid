import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'biometric_enabled';

interface BiometricContextType {
  enabled: boolean;
  authenticated: boolean;
  ready: boolean;
  setEnabled: (val: boolean) => void;
  authenticate: () => Promise<void>;
}

const BiometricContext = createContext<BiometricContextType>({
  enabled: false,
  authenticated: true,
  ready: false,
  setEnabled: () => {},
  authenticate: async () => {},
});

export function BiometricProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      const isEnabled = val === 'true';
      setEnabledState(isEnabled);
      if (!isEnabled) setAuthenticated(true);
      setReady(true);
    });
  }, []);

  const authenticate = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your ID',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
      });
      if (result.success) setAuthenticated(true);
    } catch {
      // Hardware unavailable — unlock anyway
      setAuthenticated(true);
    }
  }, []);

  // Lock on cold start
  useEffect(() => {
    if (ready && enabled) authenticate();
  }, [ready, enabled]);

  // Lock when app goes to background, re-prompt when it returns
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (!enabled) return;

      if (prev === 'active' && nextState.match(/inactive|background/)) {
        setAuthenticated(false);
      } else if (prev.match(/inactive|background/) && nextState === 'active') {
        authenticate();
      }
    });
    return () => sub.remove();
  }, [enabled, authenticate]);

  const setEnabled = useCallback(async (val: boolean) => {
    if (!val) {
      setEnabledState(false);
      setAuthenticated(true);
      await AsyncStorage.setItem(STORAGE_KEY, 'false');
      return;
    }

    // Check hardware + enrollment before showing the prompt
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      Alert.alert(
        'Biometric unavailable',
        'Please set up fingerprint or face unlock in your device Settings first.',
      );
      return;
    }

    // Optimistically show switch ON
    setEnabledState(true);

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable biometric lock',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
      });

      if (!result.success) {
        setEnabledState(false);
        return;
      }
    } catch {
      setEnabledState(false);
      return;
    }

    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    setAuthenticated(true);
  }, []);

  return (
    <BiometricContext.Provider value={{ enabled, authenticated, ready, setEnabled, authenticate }}>
      {children}
    </BiometricContext.Provider>
  );
}

export const useBiometric = () => useContext(BiometricContext);
