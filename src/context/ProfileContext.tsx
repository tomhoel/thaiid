import React, { createContext, useContext, useState, ReactNode } from 'react';
import { cardData as defaultCardData } from '../constants/cardData';

export type ProfileType = typeof defaultCardData & { pictureUri?: string };

interface ProfileContextType {
  profile: ProfileType;
  updateProfile: (updates: Partial<ProfileType>) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileType>(defaultCardData);

  const updateProfile = (updates: Partial<ProfileType>) => {
    setProfile(prev => ({ ...prev, ...updates }));
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
