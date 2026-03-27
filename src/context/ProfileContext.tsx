import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCountry } from './CountryContext';

export type ProfileType = Record<string, any> & { pictureUri?: string; cardFrontUri?: string };

interface ProfileContextType {
  profile: ProfileType;
  updateProfile: (updates: Partial<ProfileType>) => void;
  isGenerating: boolean;
  setGenerating: (v: boolean) => void;
  ready: boolean;
}

const LEGACY_KEY = 'profile_data';
const storageKey = (code: string) => `profile_data_${code}`;

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { country, config } = useCountry();
  const [profile, setProfile] = useState<ProfileType>(config.defaultCardData as ProfileType);
  const [isGenerating, setGenerating] = useState(false);
  const [ready, setReady] = useState(false);
  const countryRef = useRef(country);

  // Migrate legacy `profile_data` -> `profile_data_TH` on first load
  useEffect(() => {
    (async () => {
      try {
        const thKey = storageKey('TH');
        const [legacy, thExists] = await Promise.all([
          AsyncStorage.getItem(LEGACY_KEY),
          AsyncStorage.getItem(thKey),
        ]);
        if (legacy && !thExists) {
          await AsyncStorage.setItem(thKey, legacy);
        }
      } catch (e) {
        console.warn('Legacy migration failed:', e);
      }
    })();
  }, []);

  // Load profile whenever country changes
  useEffect(() => {
    let stale = false;
    countryRef.current = country;
    setReady(false);

    const key = storageKey(country);
    const defaults = config.defaultCardData as ProfileType;

    AsyncStorage.getItem(key)
      .then(saved => {
        if (stale) return;
        if (saved) {
          try {
            const loaded = JSON.parse(saved);
            const merged = { ...defaults, ...loaded };
            setProfile(merged);
          } catch {
            setProfile(defaults);
          }
        } else {
          setProfile(defaults);
        }
      })
      .finally(() => {
        if (!stale) setReady(true);
      });

    return () => { stale = true; };
  }, [country, config]);

  const profileRef = useRef(profile);
  profileRef.current = profile;

  const updateProfile = useCallback((updates: Partial<ProfileType>) => {
    const next = { ...profileRef.current, ...updates };
    setProfile(next);
    AsyncStorage.setItem(storageKey(countryRef.current), JSON.stringify(next)).catch(console.warn);
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, isGenerating, setGenerating, ready }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
