import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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
      } catch {}
    })();
  }, []);

  // Load profile whenever country changes
  useEffect(() => {
    countryRef.current = country;
    setReady(false);

    const key = storageKey(country);
    const defaults = config.defaultCardData as ProfileType;

    AsyncStorage.getItem(key)
      .then(saved => {
        // Guard against stale async if country changed again
        if (countryRef.current !== country) return;
        if (saved) {
          try {
            setProfile(JSON.parse(saved));
          } catch {
            setProfile(defaults);
          }
        } else {
          setProfile(defaults);
        }
      })
      .finally(() => {
        if (countryRef.current === country) setReady(true);
      });
  }, [country, config]);

  const updateProfile = (updates: Partial<ProfileType>) => {
    setProfile(prev => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem(storageKey(country), JSON.stringify(next));
      return next;
    });
  };

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
