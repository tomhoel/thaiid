import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cardData as defaultCardData } from '../constants/cardData';

export type ProfileType = typeof defaultCardData & { pictureUri?: string; cardFrontUri?: string };

interface ProfileContextType {
  profile: ProfileType;
  updateProfile: (updates: Partial<ProfileType>) => void;
  isGenerating: boolean;
  setGenerating: (v: boolean) => void;
}

const STORAGE_KEY = 'profile_data';
const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileType>(defaultCardData);
  const [isGenerating, setGenerating] = useState(false);

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
    <ProfileContext.Provider value={{ profile, updateProfile, isGenerating, setGenerating }}>
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
