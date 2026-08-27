import { z } from 'zod';

/** Supported country codes */
export const CountryCodeSchema = z.enum(['TH', 'SG', 'BR', 'US', 'VN']);
export type CountryCode = z.infer<typeof CountryCodeSchema>;

/** Citizen profile schema */
export const ProfileSchema = z.object({
  titleThai: z.string().optional(),
  titleEnglish: z.string().optional(),
  idNumber: z.string(),
  idNumberCompact: z.string().optional(),
  nameThai: z.string().optional(),
  namePrefix: z.string().optional(),
  firstName: z.string(),
  lastName: z.string(),
  fullNameEnglish: z.string(),
  dateOfBirthThai: z.string().optional(),
  dateOfBirth: z.string(),
  addressThai: z.string().optional(),
  addressNumber: z.string().optional(),
  moo: z.string().optional(),
  subDistrict: z.string().optional(),
  district: z.string().optional(),
  province: z.string().optional(),
  dateOfIssueThai: z.string().optional(),
  dateOfIssue: z.string(),
  dateOfExpiryThai: z.string().optional(),
  dateOfExpiry: z.string(),
  sex: z.string().optional(),
  sexThai: z.string().optional(),
  nationality: z.string().optional(),
  nationalityThai: z.string().optional(),
  bloodType: z.string().optional(),
  reference: z.string().optional(),
  isValid: z.boolean().default(true),
  pictureUri: z.string().optional(),
  cardFrontUri: z.string().optional(),
}).passthrough();

export type ProfileType = z.infer<typeof ProfileSchema>;

/** Parameters for generating an AI ID Card */
export interface GenerateCardParams {
  countryCode: CountryCode;
  profileData: ProfileType;
  selectedPhotoBase64?: string | null;
  selectedPhotoMime?: string;
  cardPromptHint?: string;
}

/** Card Version Snapshot */
export interface CardVersion {
  id: string;
  timestamp: number;
  countryCode: string;
  profileData: {
    fullNameEnglish: string;
    nameThai: string;
    idNumber: string;
    dateOfBirth: string;
    dateOfIssue: string;
    dateOfExpiry: string;
  };
  cardImageUri: string;
  portraitUri?: string;
}
