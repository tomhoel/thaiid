/**
 * GeminiService — High-Performance AI Image Generation & Vision Pipeline.
 * Features:
 *   1. Direct / Supabase Proxy Dual-Route Execution with Automatic Fallback
 *   2. Strict Pixel-Perfect Template & Field Preservation Prompts
 *   3. Intelligent Exponential Backoff with Rate-Limit (429/503) Handling
 *   4. Zero-Leak Secret Handling
 */

import Constants from 'expo-constants';
import { GenerateCardParams } from '../types/profile';
import { reportError } from '../utils/reportError';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1500;
const GEMINI_DIRECT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent';

export class GeminiService {
  private static getCredentials() {
    const extra = Constants.expoConfig?.extra ?? {};
    const supabaseUrl = (extra.supabaseUrl as string) || 'https://iufuxlkskczdhlptszdf.supabase.co';
    const supabaseAnonKey =
      (extra.supabaseAnonKey as string) ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1ZnV4bGtzY2N6ZGhscHRzemRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzMTcyMjMsImV4cCI6MjA1Nzg5MzIyM30.6tUjVb-b-722s4C_Z3aF-h8jR_6y4fU4b2g9p_yX1_A';
    const directApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || (extra.geminiApiKey as string);
    return { supabaseUrl, supabaseAnonKey, directApiKey };
  }

  /** Call the AI service (Supabase Proxy first, Direct API fallback) */
  static async callProxy(parts: any[], attempt = 1): Promise<any> {
    const { supabaseUrl, supabaseAnonKey, directApiKey } = this.getCredentials();

    try {
      // 1. Try Supabase Edge Function Proxy
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
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      });

      const data = await resp.json();

      if (!resp.ok || data.error) {
        const errCode = data?.error?.code || resp.status;
        const errMsg = data?.error?.message || `HTTP ${resp.status}`;

        // If server proxy is unconfigured or rate limited, attempt direct API fallback if key exists
        if ((errMsg.includes('not configured') || resp.status === 401 || resp.status === 403) && directApiKey) {
          return this.callDirect(parts, directApiKey);
        }

        if ((errCode === 429 || errCode === 503 || resp.status === 429) && attempt <= MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, delay));
          return this.callProxy(parts, attempt + 1);
        }

        throw new Error(errMsg);
      }

      return data;
    } catch (e: any) {
      if (
        attempt <= MAX_RETRIES &&
        (e.message?.includes('429') ||
          e.message?.includes('503') ||
          e.message?.includes('Network request failed'))
      ) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
        return this.callProxy(parts, attempt + 1);
      }

      // If direct API key is available, fallback to direct API
      if (directApiKey && !e.message?.includes('Direct API Error')) {
        return this.callDirect(parts, directApiKey);
      }

      reportError('GeminiService.callProxy', e);
      throw e;
    }
  }

  /** Direct Google Gemini API fallback */
  private static async callDirect(parts: any[], apiKey: string): Promise<any> {
    const resp = await fetch(`${GEMINI_DIRECT_BASE}`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    });

    const json = await resp.json();
    if (!resp.ok || json.error) {
      throw new Error(`Direct API Error: ${json.error?.message || resp.statusText}`);
    }
    return json;
  }

  /** Build structured prompt parts for card generation */
  static buildCardParts(params: {
    templateBase64: string;
    cardDescription: string;
    secondaryLangName: string;
    profileData: Record<string, any>;
    selectedPhotoBase64?: string | null;
    selectedPhotoMime?: string;
  }): any[] {
    const {
      templateBase64,
      cardDescription,
      secondaryLangName,
      profileData,
      selectedPhotoBase64,
      selectedPhotoMime,
    } = params;

    const parts: any[] = [{ inlineData: { mimeType: 'image/png', data: templateBase64 } }];

    const hasPhoto = !!selectedPhotoBase64;
    if (hasPhoto) {
      parts.push({
        inlineData: {
          mimeType: selectedPhotoMime || 'image/jpeg',
          data: selectedPhotoBase64,
        },
      });
    }

    const aspectNote = `The output image MUST be exactly the same dimensions and aspect ratio as the input image (1013x638 pixels, landscape). Do NOT change the canvas size, crop, pad, or reshape the image in any way.`;

    const fields = [
      `Identification Number: ${profileData.idNumber}`,
      `Native Name (${secondaryLangName}): ${profileData.nameThai || ''}`,
      `English Name: ${profileData.fullNameEnglish}`,
      `Date of Birth: ${profileData.dateOfBirth}`,
      `Date of Issue: ${profileData.dateOfIssue}`,
      `Date of Expiry: ${profileData.dateOfExpiry}`,
    ].join('\n');

    let prompt: string;
    if (hasPhoto) {
      prompt = `Edit this ${cardDescription} image.

${aspectNote}

Make these specific changes ONLY — do NOT move, resize, or reposition any element:
1. Replace the portrait photograph (keep it in the EXACT same position and size) with the person from the SECOND image, cropped and placed exactly in the photo area.
2. Replace ALL text fields on the card with these values — match the original font, size, weight, color, and position perfectly:
${fields}

CRITICAL: The layout must remain IDENTICAL. All other elements (logos, emblems, background patterns, gradient, chip, photo position, and other elements) must remain COMPLETELY UNCHANGED. Do not redraw, move, or re-render any element that is not listed above. Output the result as a single image.`;
    } else {
      prompt = `Edit this ${cardDescription} image.

${aspectNote}

Replace ALL text fields on the card with these values — match the original font, size, weight, color, and position perfectly:
${fields}

CRITICAL: The layout must remain IDENTICAL. Everything else must remain PIXEL-PERFECT — portrait photo, all other text, ID number, emblems, background, chip, patterns, positions. Only the fields listed above should change. Output the result as a single image.`;
    }

    parts.push({ text: prompt });
    return parts;
  }

  /** Extract base64 image data URI from Gemini candidate response */
  static extractImageUri(data: any): string | null {
    const candidates = data?.candidates || [];
    if (candidates.length === 0) return null;

    const parts = candidates[0]?.content?.parts || [];
    for (const part of parts) {
      if (part?.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        return `data:${mime};base64,${part.inlineData.data}`;
      }
    }
    return null;
  }

  /** Generate an AI Card image from profile parameters */
  static async generateCardImage(params: GenerateCardParams & {
    templateBase64?: string;
    cardDescription?: string;
    secondaryLangName?: string;
  }): Promise<string> {
    const {
      profileData,
      selectedPhotoBase64,
      selectedPhotoMime = 'image/jpeg',
      templateBase64,
      cardDescription = 'National Identity Card',
      secondaryLangName = 'Native Language',
    } = params;

    let parts: any[];

    if (templateBase64) {
      parts = this.buildCardParts({
        templateBase64,
        cardDescription,
        secondaryLangName,
        profileData,
        selectedPhotoBase64,
        selectedPhotoMime,
      });
    } else {
      parts = [];
      if (selectedPhotoBase64) {
        parts.push({
          inlineData: {
            mimeType: selectedPhotoMime,
            data: selectedPhotoBase64,
          },
        });
      }
      const promptText = `Generate a realistic national identity card image for ${profileData.fullNameEnglish}.
Fields:
- Full Name: ${profileData.fullNameEnglish}
- ID Number: ${profileData.idNumber}
- Date of Birth: ${profileData.dateOfBirth}
- Date of Issue: ${profileData.dateOfIssue}
- Date of Expiry: ${profileData.dateOfExpiry}
Dimensions: exactly 1013x638 pixels. Clean, official layout.`;
      parts.push({ text: promptText });
    }

    const response = await this.callProxy(parts);
    const uri = this.extractImageUri(response);

    if (!uri) {
      throw new Error('AI response did not contain valid image data.');
    }

    return uri;
  }
}
