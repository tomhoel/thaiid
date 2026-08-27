import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProfileType } from '../types/profile';
import { StorageService } from '../services/storageService';

export const PROFILE_QUERY_KEY = (countryCode: string) => ['profile', countryCode];

export function useProfileQuery(countryCode: string, defaultData: ProfileType) {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY(countryCode),
    queryFn: () => StorageService.getProfile(countryCode, defaultData),
    initialData: defaultData,
  });
}

export function useUpdateProfileMutation(countryCode: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ current, updates }: { current: ProfileType; updates: Partial<ProfileType> }) => {
      const next = { ...current, ...updates };
      await StorageService.saveProfile(countryCode, next);
      return next;
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY(countryCode), updatedProfile);
    },
  });
}
