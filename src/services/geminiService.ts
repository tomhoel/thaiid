import Constants from 'expo-constants';
import { GenerateCardParams } from '../types/profile';
import { reportError } from '../utils/reportError';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1500;

export class GeminiService {
  private static getCredentials() {
    const extra = Constants.expoConfig?.extra ?? {};
    const supabaseUrl = (extra.supabaseUrl as string) || 'https://iufuxlkskczdhlptszdf.supabase.co';
    const supabaseAnonKey = (extra.supabaseAnonKey as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1ZnV4bGtzY2N6ZGhscHRzemRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzMTcyMjMsImV4cCI6MjA1Nzg5MzIyM30.6tUjVb-b-722s4C_Z3aF-h8jR_6y4fU4b2g9p_yX1_A';
    return { supabaseUrl, supabaseAnonKey };
  }

  /** Call the Supabase Gemini proxy with retry and rate-limit backoff */
  private static async callProxy(parts: any[], attempt = 1): Promise<any> {
    const { supabaseUrl, supabaseAnonKey } = this.getCredentials();

    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/gemini-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
          },
        }),
      });

      const data = await resp.json();

      if (!resp.ok || data.error) {
        const errCode = data?.error?.code || resp.status;
        const errMsg = data?.error?.message || `HTTP ${resp.status}`;

        if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('not configured')) {
          throw new Error('Gemini API key is invalid on the server.');
        }

        if ((errCode === 429 || errCode === 503 || resp.status === 429) && attempt <= MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
          await new Promise(r => setTimeout(r, delay));
          return this.callProxy(parts, attempt + 1);
        }

        throw new Error(errMsg);
      }

      return data;
    } catch (e: any) {
      if (attempt <= MAX_RETRIES && (e.message?.includes('429') || e.message?.includes('503') || e.message?.includes('Network request failed'))) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
        return this.callProxy(parts, attempt + 1);
      }
      throw e;
    }
  }

  /** Generate an AI Card image from profile parameters */
  static async generateCardImage(params: GenerateCardParams): Promise<string> {
    const { profileData, selectedPhotoBase64, selectedPhotoMime = 'image/jpeg', cardPromptHint } = params;

    const parts: any[] = [];

    if (selectedPhotoBase64) {
      parts.push({
        inlineData: {
          mimeType: selectedPhotoMime,
          data: selectedPhotoBase64,
        },
      });
    }

    const promptText = `Generate a realistic national identity card image for ${profileData.fullNameEnglish || 'the citizen'}.
Fields to include accurately:
- Full Name: ${profileData.fullNameEnglish} (${profileData.nameThai || ''})
- ID Number: ${profileData.idNumber}
- Date of Birth: ${profileData.dateOfBirth} (${profileData.dateOfBirthThai || ''})
- Date of Issue: ${profileData.dateOfIssue}
- Date of Expiry: ${profileData.dateOfExpiry}
${cardPromptHint ? `Design Instructions: ${cardPromptHint}` : ''}
The card should have sharp text, official layout, realistic microprint, chip, and guilloche security patterns. Return the card image cleanly.`;

    parts.push({ text: promptText });

    const response = await this.callProxy(parts);

    const candidates = response?.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No image was returned by the AI service.');
    }

    const responseParts = candidates[0]?.content?.parts || [];
    for (const part of responseParts) {
      if (part.inlineData && part.inlineData.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        return `data:${mime};base64,${part.inlineData.data}`;
      }
    }

    throw new Error('AI response did not contain image data.');
  }
}
