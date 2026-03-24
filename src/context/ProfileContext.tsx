import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cardData as defaultCardData } from '../constants/cardData';

export type ProfileType = typeof defaultCardData & { pictureUri?: string };

interface ProfileContextType {
  profile: ProfileType;
  updateProfile: (updates: Partial<ProfileType>) => void;
}

const STORAGE_KEY = 'profile_data';
const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileType>(defaultCardData);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved) {
        try {
          setProfile(JSON.parse(saved));
        } catch {}
      }
    });
  }, []);

  const updateProfile = (updates: Partial<ProfileType>) => {
    setProfile(prev => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile }}>
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
