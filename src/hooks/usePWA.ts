/**
 * usePWA — High-Tech Progressive Web App Native Integration Hook.
 * Capabilities:
 *   1. PWA Installation Prompt (`beforeinstallprompt` event interception)
 *   2. Standalone Display Mode Detection (iOS Home Screen / Android PWA detection)
 *   3. Real-Time Network & Offline Status Detection
 *   4. Screen Wake Lock API (Keeps screen bright during identity presentation / scanning)
 *   5. Web Badging API (Dynamic notification count on home screen icon)
 *   6. Web Share API (Native OS share sheet integration)
 *   7. Web Haptic Engine (Multi-pattern tactile vibration)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWA() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const wakeLockRef = useRef<any>(null);

  // 1. Detect Standalone Display Mode & Online Status
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    // Check Standalone Mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
      if (isStandaloneMode) setIsInstalled(true);
    };
    checkStandalone();

    // Check Online / Offline status
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Capture PWA Install Prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    // Capture PWA App Installed Event
    const handleAppInstalled = () => {
      deferredPromptRef.current = null;
      setCanInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // 2. Trigger Native PWA Install Prompt
  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unsupported'> => {
    if (!deferredPromptRef.current) return 'unsupported';
    try {
      await deferredPromptRef.current.prompt();
      const choice = await deferredPromptRef.current.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setCanInstall(false);
      }
      deferredPromptRef.current = null;
      return choice.outcome;
    } catch (err) {
      console.warn('[PWA] Error launching install prompt:', err);
      return 'unsupported';
    }
  }, []);

  // 3. Screen Wake Lock API (Keep display awake during ID / QR inspection)
  const requestWakeLock = useCallback(async () => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      if (!wakeLockRef.current) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      }
    } catch (err) {
      console.warn('[PWA] WakeLock not granted:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {}
      wakeLockRef.current = null;
    }
  }, []);

  // 4. Web Badging API (Set notification badges on home screen PWA icon)
  const setAppBadge = useCallback(async (count?: number) => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('setAppBadge' in navigator)) return;
    try {
      if (count && count > 0) {
        await (navigator as any).setAppBadge(count);
      } else {
        await (navigator as any).setAppBadge();
      }
    } catch {}
  }, []);

  const clearAppBadge = useCallback(async () => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('clearAppBadge' in navigator)) return;
    try {
      await (navigator as any).clearAppBadge();
    } catch {}
  }, []);

  // 5. Web Share API (Native OS Share Sheet)
  const shareDocument = useCallback(async (data: { title: string; text?: string; url?: string }) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(data);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, []);

  // 6. Web Haptic Tactile Engine
  const triggerHaptic = useCallback((pattern: number | number[] = 12) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  }, []);

  return {
    canInstall,
    isInstalled,
    isStandalone,
    isOnline,
    promptInstall,
    requestWakeLock,
    releaseWakeLock,
    setAppBadge,
    clearAppBadge,
    shareDocument,
    triggerHaptic,
  };
}
