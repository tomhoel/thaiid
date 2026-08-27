import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GenerateCardParams, ProfileType } from '../types/profile';
import { GeminiService } from '../services/geminiService';
import { StorageService } from '../services/storageService';
import { saveCardVersion } from '../utils/versionHistory';
import { PROFILE_QUERY_KEY } from './useProfileQuery';

export function useGenerateCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: GenerateCardParams) => {
      const { countryCode, profileData, selectedPhotoBase64, selectedPhotoMime } = params;

      // 1. Generate card image via Gemini Edge Service
      const cardDataUri = await GeminiService.generateCardImage(params);

      // 2. Persist card image
      const savedCardUri = await StorageService.saveCardImage(countryCode, cardDataUri);

      // 3. Persist portrait if available
      let savedPortraitUri: string | undefined = profileData.pictureUri;
      if (selectedPhotoBase64) {
        const portraitDataUri = `data:${selectedPhotoMime || 'image/jpeg'};base64,${selectedPhotoBase64}`;
        savedPortraitUri = await StorageService.savePortraitImage(portraitDataUri);
      }

      // 4. Update profile with new URIs
      const updatedProfile: ProfileType = {
        ...profileData,
        cardFrontUri: savedCardUri,
        pictureUri: savedPortraitUri,
      };

      // 5. Save updated profile to storage
      await StorageService.saveProfile(countryCode, updatedProfile);

      // 6. Save version history snapshot
      try {
        await saveCardVersion(
          countryCode,
          {
            fullNameEnglish: updatedProfile.fullNameEnglish,
            nameThai: updatedProfile.nameThai || '',
            idNumber: updatedProfile.idNumber,
            dateOfBirth: updatedProfile.dateOfBirth,
            dateOfIssue: updatedProfile.dateOfIssue,
            dateOfExpiry: updatedProfile.dateOfExpiry,
          },
          savedCardUri,
          savedPortraitUri,
        );
      } catch (e) {
        console.warn('[useGenerateCardMutation] version save error:', e);
      }

      return { countryCode, profile: updatedProfile };
    },
    onSuccess: ({ countryCode, profile }) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY(countryCode), profile);
    },
  });
}
