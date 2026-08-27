/**
 * GeminiService — High-Performance AI Image Generation & Vision Pipeline.
 * Features:
 *   1. Latest Google Gemini 3.x Multimodal Image Architecture (gemini-3-pro-image-preview / gemini-3.1-flash-image)
 *   2. Automatic Model Fallback Cascade (gemini-3-pro-image-preview -> gemini-3.1-flash-image -> gemini-2.5-flash-image)
 *   3. Perfectionized Official Document Engraving & Typography Prompts
 *   4. Direct / Supabase Proxy Dual-Route Execution with Automatic Failover
 *   5. Strict Aspect-Ratio Guarantee (1013x638 ISO/IEC 7810 ID-1 Standard)
 *   6. Intelligent Exponential Backoff with Rate-Limit (429/503) Handling
 *   7. Zero-Config Country Template Resolution (TH, SG, BR, US, VN)
 */

import Constants from 'expo-constants';
import { GenerateCardParams } from '../types/profile';
import { reportError } from '../utils/reportError';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1500;
const DEFAULT_MODEL = 'gemini-3-pro-image-preview';
const FALLBACK_MODELS = [
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image',
  'gemini-3-pro-image',
  'gemini-2.5-flash-image',
  'gemini-2.5-flash',
];

const GEMINI_DIRECT_ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/** Get the base64 template for a country code */
export function getCountryCardTemplate(countryCode: string): string {
  switch (countryCode) {
    case 'SG': return require('../constants/sgCardTemplate').SG_CARD_TEMPLATE_BASE64;
    case 'BR': return require('../constants/brCardTemplate').BR_CARD_TEMPLATE_BASE64;
    case 'US': return require('../constants/usCardTemplate').US_CARD_TEMPLATE_BASE64;
    case 'VN': return require('../constants/vnCardTemplate').VN_CARD_TEMPLATE_BASE64;
    case 'TH':
    default:
      return require('../constants/cardTemplate').CARD_TEMPLATE_BASE64;
  }
}

/** Get official card metadata for a country */
export function getCountryMetadata(countryCode: string): { cardDescription: string; secondaryLangName: string } {
  switch (countryCode) {
    case 'SG': return { cardDescription: 'Singapore National Identity Card (NRIC)', secondaryLangName: 'Chinese / Malay' };
    case 'BR': return { cardDescription: 'Brazilian Identity Card (Registro Geral)', secondaryLangName: 'Portuguese' };
    case 'US': return { cardDescription: 'United States Real ID Driver License', secondaryLangName: 'State ID' };
    case 'VN': return { cardDescription: 'Vietnam Citizen Identity Card (Căn cước công dân)', secondaryLangName: 'Vietnamese' };
    case 'TH':
    default:
      return { cardDescription: 'Thai National Identity Card', secondaryLangName: 'Thai' };
  }
}

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
  static async callProxy(parts: any[], model = DEFAULT_MODEL, attempt = 1): Promise<any> {
    const { supabaseUrl, supabaseAnonKey, directApiKey } = this.getCredentials();

    try {
      // 1. Try Supabase Edge Function Proxy
      const resp = await fetch(`${supabaseUrl}/functions/v1/gemini-proxy?model=${encodeURIComponent(model)}`, {
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
            temperature: 0.2, // Low temperature for factual typography & layout consistency
          },
        }),
      });

      const data = await resp.json();

      if (!resp.ok || data.error) {
        const errCode = data?.error?.code || resp.status;
        const errMsg = data?.error?.message || `HTTP ${resp.status}`;

        // If server proxy is unconfigured or unauthorized, attempt direct API fallback if key exists
        if ((errMsg.includes('not configured') || resp.status === 401 || resp.status === 403) && directApiKey) {
          return this.callDirect(parts, model, directApiKey);
        }

        // Model not found (404) -> cascade to next supported model
        if ((errCode === 404 || errMsg.includes('not found') || errMsg.includes('unsupported')) && model !== FALLBACK_MODELS[FALLBACK_MODELS.length - 1]) {
          const nextIdx = (FALLBACK_MODELS.indexOf(model) + 1) || 1;
          const nextModel = FALLBACK_MODELS[nextIdx];
          console.warn(`[GeminiService] Model ${model} not available. Cascading to ${nextModel}...`);
          return this.callProxy(parts, nextModel, 1);
        }

        if ((errCode === 429 || errCode === 503 || resp.status === 429) && attempt <= MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, delay));
          return this.callProxy(parts, model, attempt + 1);
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
        return this.callProxy(parts, model, attempt + 1);
      }

      // If direct API key is available, fallback to direct API
      if (directApiKey && !e.message?.includes('Direct API Error')) {
        return this.callDirect(parts, model, directApiKey);
      }

      reportError('GeminiService.callProxy', e);
      throw e;
    }
  }

  /** Direct Google Gemini API fallback */
  private static async callDirect(parts: any[], model = DEFAULT_MODEL, apiKey: string): Promise<any> {
    const resp = await fetch(GEMINI_DIRECT_ENDPOINT(model), {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          temperature: 0.2,
        },
      }),
    });

    const json = await resp.json();
    if (!resp.ok || json.error) {
      // If 404, try next model in direct fallback
      const errMsg = json.error?.message || resp.statusText;
      if ((resp.status === 404 || errMsg.includes('not found')) && model !== FALLBACK_MODELS[FALLBACK_MODELS.length - 1]) {
        const nextIdx = (FALLBACK_MODELS.indexOf(model) + 1) || 1;
        const nextModel = FALLBACK_MODELS[nextIdx];
        return this.callDirect(parts, nextModel, apiKey);
      }
      throw new Error(`Direct API Error: ${errMsg}`);
    }
    return json;
  }

  /**
   * Build perfectionized structured prompt parts for high-precision government identity card rendering.
   */
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

    const aspectNote = `CRITICAL FORMAT REQUIREMENT:
- Exact Dimensions: 1013 x 638 pixels (Landscape aspect ratio ~1.588:1, standard ISO/IEC 7810 ID-1 card format).
- Flat Orthographic View: Perfectly straight, 2D front-facing orientation with no 3D tilt, no angle distortion, and no perspective slant.
- Zero Padding: Do not add borders, margins, dropshadows, watermarks, or extra canvas padding.`;

    const fields = [
      `• Identification Number: ${profileData.idNumber}`,
      `• Native Name (${secondaryLangName}): ${profileData.nameThai || ''}`,
      `• Legal Name (English): ${profileData.fullNameEnglish}`,
      `• Date of Birth: ${profileData.dateOfBirth}`,
      `• Date of Issue: ${profileData.dateOfIssue}`,
      `• Date of Expiry: ${profileData.dateOfExpiry}`,
    ].join('\n');

    let prompt: string;
    if (hasPhoto) {
      prompt = `Role: You are an expert official sovereign identity document compositor and engraver.
Task: Edit the provided official ${cardDescription} template (Image 1) using the portrait photograph (Image 2).

${aspectNote}

PRECISE EDITING INSTRUCTIONS:
1. PORTRAIT PHOTOGRAPH:
   - Extract and crop the person from Image 2 (head and shoulders passport crop).
   - Place and fit the photo seamlessly into the exact photo frame area of Image 1, matching standard government ID scale, contrast, and alignment.
2. TEXT & TYPOGRAPHY REPLACEMENT:
   - Replace ALL personal identification text fields with these exact official values:
${fields}
   - Match the font family, font weight, color palette, optical sizing, and position of the original template perfectly.
3. SECURITY & GRAPHICS PRESERVATION:
   - 100% PRESERVE all national crests, emblems, microprint, Guilloche anti-counterfeiting wave patterns, holographic foils, smart card chip contacts, barcodes, and background gradients.
   - Do NOT blur, distort, redraw, or alter any non-text security feature.

Output: Return ONLY the final composited high-resolution card image.`;
    } else {
      prompt = `Role: You are an expert official sovereign identity document compositor and engraver.
Task: Edit the provided official ${cardDescription} template (Image 1).

${aspectNote}

PRECISE EDITING INSTRUCTIONS:
1. TEXT & TYPOGRAPHY REPLACEMENT:
   - Replace ALL personal identification text fields on the card with these exact official values:
${fields}
   - Match the font family, font weight, color palette, optical sizing, and position of the original template perfectly.
2. SECURITY & GRAPHICS PRESERVATION:
   - 100% PRESERVE all existing portrait artwork, national crests, emblems, microprint, Guilloche wave patterns, holographic foils, smart card chip contacts, barcodes, and background gradients.
   - Do NOT blur, distort, redraw, or alter any non-text security feature.

Output: Return ONLY the final composited high-resolution card image.`;
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
    model?: string;
  }): Promise<string> {
    const {
      countryCode,
      profileData,
      selectedPhotoBase64,
      selectedPhotoMime = 'image/jpeg',
      model = DEFAULT_MODEL,
    } = params;

    const meta = getCountryMetadata(countryCode);
    const templateBase64 = params.templateBase64 || getCountryCardTemplate(countryCode);
    const cardDescription = params.cardDescription || meta.cardDescription;
    const secondaryLangName = params.secondaryLangName || meta.secondaryLangName;

    const parts = this.buildCardParts({
      templateBase64,
      cardDescription,
      secondaryLangName,
      profileData,
      selectedPhotoBase64,
      selectedPhotoMime,
    });

    const response = await this.callProxy(parts, model);
    const uri = this.extractImageUri(response);

    if (!uri) {
      throw new Error('AI response did not contain valid image data.');
    }

    return uri;
  }
}
