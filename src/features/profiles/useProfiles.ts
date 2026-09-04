import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import type { CountryCode } from '@/types/profile';

/**
 * Profile and preference access.
 *
 * The user id is never sent from here — the server derives it from the verified
 * session token, so a tampered request cannot reach another user's rows.
 */

export interface RemoteProfile {
  id: string;
  country_code: CountryCode;
  data: Record<string, unknown>;
  card_front_path: string | null;
  portrait_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface RemotePreferences {
  user_id: string;
  active_country: CountryCode;
  theme: 'dark' | 'light';
  language: string;
  created_at: string;
  updated_at: string;
}

export const profileKeys = {
  all: ['profiles'] as const,
  byCountry: (country: CountryCode) => ['profiles', country] as const,
  preferences: ['preferences'] as const,
};

export function useProfiles() {
  return useQuery({
    queryKey: profileKeys.all,
    queryFn: () => apiFetch<{ profiles: RemoteProfile[] }>('/api/profiles').then((r) => r.profiles),
  });
}

export function useProfile(country: CountryCode) {
  return useQuery({
    queryKey: profileKeys.byCountry(country),
    queryFn: () =>
      apiFetch<{ profile: RemoteProfile | null }>(
        `/api/profiles?country=${encodeURIComponent(country)}`
      ).then((r) => r.profile),
  });
}

export function useSaveProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      countryCode: CountryCode;
      data: Record<string, unknown>;
      cardFrontPath?: string | null;
      portraitPath?: string | null;
    }) =>
      apiFetch<{ profile: RemoteProfile }>('/api/profiles', {
        method: 'PUT',
        body: JSON.stringify(input),
      }).then((r) => r.profile),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.byCountry(profile.country_code), profile);
      void queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (country: CountryCode) =>
      apiFetch<void>(`/api/profiles?country=${encodeURIComponent(country)}`, { method: 'DELETE' }),
    onSuccess: (_result, country) => {
      queryClient.setQueryData(profileKeys.byCountry(country), null);
      void queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}

export function usePreferences() {
  return useQuery({
    queryKey: profileKeys.preferences,
    queryFn: () =>
      apiFetch<{ preferences: RemotePreferences }>('/api/preferences').then((r) => r.preferences),
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      activeCountry?: CountryCode;
      theme?: 'dark' | 'light';
      language?: string;
    }) =>
      apiFetch<{ preferences: RemotePreferences }>('/api/preferences', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }).then((r) => r.preferences),
    onSuccess: (preferences) => {
      queryClient.setQueryData(profileKeys.preferences, preferences);
    },
  });
}

/**
 * Uploads a rendered card. Returns the stored pathname plus the authenticated
 * URL to read it back — the blob itself is private and has no public URL.
 */
export function useUploadCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      countryCode: CountryCode;
      imageBase64: string;
      mimeType?: string;
      model?: string;
      dataSnapshot?: Record<string, unknown>;
    }) =>
      apiFetch<{ path: string; url: string }>('/api/cards', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_result, input) => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.byCountry(input.countryCode) });
    },
  });
}
