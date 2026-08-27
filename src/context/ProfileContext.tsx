import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useCountry } from './CountryContext';
import { ProfileType } from '../types/profile';
import { useProfileQuery, useUpdateProfileMutation } from '../hooks/useProfileQuery';

export { ProfileType } from '../types/profile';

interface ProfileContextType {
  profile: ProfileType;
  updateProfile: (updates: Partial<ProfileType>) => void;
  isGenerating: boolean;
  setGenerating: (v: boolean) => void;
  setGeneratingCountries: (codes: string[]) => void;
  clearGeneratingCountry: (code: string) => void;
  ready: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { country, config } = useCountry();
  const defaults = config.defaultCardData as ProfileType;

  // TanStack Query for caching and reactivity
  const { data: profile = defaults, isSuccess, isFetching } = useProfileQuery(country, defaults);
  const updateMutation = useUpdateProfileMutation(country);

  // Generating set for active country tasks
  const [generatingSet, setGeneratingSet] = useState<Set<string>>(new Set());
  const isGenerating = generatingSet.has(country);

  const setGenerating = useCallback((v: boolean) => {
    setGeneratingSet(prev => {
      const next = new Set(prev);
      if (v) next.add(country);
      else next.delete(country);
      return next;
    });
  }, [country]);

  const setGeneratingCountries = useCallback((codes: string[]) => {
    setGeneratingSet(prev => {
      const next = new Set(prev);
      codes.forEach(c => next.add(c));
      return next;
    });
  }, []);

  const clearGeneratingCountry = useCallback((code: string) => {
    setGeneratingSet(prev => {
      const next = new Set(prev);
      next.delete(code);
      return next;
    });
  }, []);

  const updateProfile = useCallback((updates: Partial<ProfileType>) => {
    updateMutation.mutate({ current: profile, updates });
  }, [profile, updateMutation]);

  const ready = isSuccess || !isFetching;

  return (
    <ProfileContext.Provider value={{
      profile,
      updateProfile,
      isGenerating,
      setGenerating,
      setGeneratingCountries,
      clearGeneratingCountry,
      ready,
    }}>
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
