import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'biometric_enabled';

interface BiometricContextType {
  enabled: boolean;
  authenticated: boolean;
  ready: boolean;
  setEnabled: (val: boolean) => Promise<void>;
  authenticate: () => Promise<boolean>;
}

const BiometricContext = createContext<BiometricContextType>({
  enabled: false,
  authenticated: true,
  ready: false,
  setEnabled: async () => {},
  authenticate: async () => false,
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

  const authenticate = useCallback(async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your ID',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
      });
      if (result.success) {
        setAuthenticated(true);
        return true;
      }
      return false;
    } catch {
      // Hardware unavailable — deny access for security
      setAuthenticated(false);
      return false;
    }
  }, []);

  // Lock on cold start — only when biometric was previously enabled (from storage)
  // Depends only on `ready`, not `enabled`, to avoid competing with setEnabled's own auth flow
  useEffect(() => {
    if (ready && enabled) authenticate();
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock when app goes to background, re-prompt when it returns
  // Grace period: brief backgrounding (image picker, camera, share sheet) doesn't lock
  const bgTimestamp = useRef(0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const GRACE_MS = 30000; // 30 seconds — covers image picker, camera, crop, share sheet

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (!enabledRef.current) return;

      if (prev === 'active' && nextState.match(/inactive|background/)) {
        bgTimestamp.current = Date.now();
      } else if (prev.match(/inactive|background/) && nextState === 'active') {
        const elapsed = Date.now() - bgTimestamp.current;
        if (elapsed > GRACE_MS) {
          setAuthenticated(false);
          authenticate();
        }
      }
    });
    return () => sub.remove();
  }, [authenticate]);

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

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable biometric lock',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
      });

      if (!result.success) {
        return;
      }
    } catch {
      return;
    }

    // Only update state after confirmed successful authentication
    setEnabledState(true);
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
