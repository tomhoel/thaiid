/**
 * GeminiService — AI image generation and vision pipeline.
 *
 * Routing: the Supabase edge function proxy is the primary path so the API key
 * stays server-side. The direct Google endpoint is a local-development-only
 * fallback, gated on VITE_GEMINI_API_KEY, which must never be set in a deployed
 * environment.
 *
 * Card templates are fetched from `public/templates/` on demand rather than
 * inlined as base64 — they total ~1.3 MB and only the generation path needs them.
 */

import type { CountryCode } from '@/types/profile';
import type { GenerateCardParams } from '@/types/profile';
import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/reportError';

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

const TEMPLATE_URLS: Record<CountryCode, string> = {
  TH: '/templates/th-template.png',
  SG: '/templates/sg-template.jpg',
  BR: '/templates/br-template.jpg',
  US: '/templates/us-template.jpg',
  VN: '/templates/vn-template.jpg',
};

export interface InlineImage {
  base64: string;
  mimeType: string;
}

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

/** Strip the `data:<mime>;base64,` prefix a FileReader result carries. */
function stripDataUrlPrefix(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob.'));
    reader.onload = () => resolve(stripDataUrlPrefix(String(reader.result)));
    reader.readAsDataURL(blob);
  });
}

/** Fetch and encode a country's base card template. */
export async function getCountryCardTemplate(countryCode: string): Promise<InlineImage> {
  const url = TEMPLATE_URLS[countryCode as CountryCode] ?? TEMPLATE_URLS.TH;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Could not load the card template for ${countryCode} (HTTP ${response.status}).`
    );
  }
  const blob = await response.blob();
  return {
    base64: await blobToBase64(blob),
    mimeType: blob.type || 'image/png',
  };
}

/** Official card metadata for a country code. */
export function getCountryMetadata(countryCode: string): {
  cardDescription: string;
  secondaryLangName: string;
} {
  switch (countryCode) {
    case 'SG':
      return {
        cardDescription: 'Singapore National Identity Card (NRIC)',
        secondaryLangName: 'Chinese / Malay',
      };
    case 'BR':
      return {
        cardDescription: 'Brazilian Identity Card (Registro Geral)',
        secondaryLangName: 'Portuguese',
      };
    case 'US':
      return {
        cardDescription: 'United States Real ID Driver License',
        secondaryLangName: 'State ID',
      };
    case 'VN':
      return {
        cardDescription: 'Vietnam Citizen Identity Card (Căn cước công dân)',
        secondaryLangName: 'Vietnamese',
      };
    case 'TH':
    default:
      return {
        cardDescription: 'Thai National Identity Card',
        secondaryLangName: 'Thai',
      };
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function nextFallbackModel(model: string): string | null {
  const index = FALLBACK_MODELS.indexOf(model);
  if (index === -1) return FALLBACK_MODELS[1] ?? null;
  return FALLBACK_MODELS[index + 1] ?? null;
}

export class GeminiService {
  /** Local-development escape hatch only. Absent in deployed builds. */
  private static get directApiKey(): string | undefined {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }

  /**
   * Call the AI service through the Supabase edge function, authenticated as the
   * signed-in user so the proxy can enforce access control.
   */
  static async callProxy(parts: GeminiPart[], model = DEFAULT_MODEL, attempt = 1): Promise<unknown> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const { directApiKey } = this;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `${supabaseUrl}/functions/v1/gemini-proxy?model=${encodeURIComponent(model)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token ?? anonKey}`,
            apikey: anonKey,
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
              // Low temperature keeps typography and layout faithful.
              temperature: 0.2,
            },
          }),
        }
      );

      const data = await response.json();
      const error = (data as { error?: { code?: number; message?: string } }).error;

      if (!response.ok || error) {
        const errorCode = error?.code ?? response.status;
        const errorMessage = error?.message ?? `HTTP ${response.status}`;

        if (
          (errorMessage.includes('not configured') ||
            response.status === 401 ||
            response.status === 403) &&
          directApiKey
        ) {
          return this.callDirect(parts, model, directApiKey);
        }

        if (errorCode === 404 || /not found|unsupported/.test(errorMessage)) {
          const next = nextFallbackModel(model);
          if (next) {
            console.warn(`[GeminiService] Model ${model} unavailable. Cascading to ${next}.`);
            return this.callProxy(parts, next, 1);
          }
        }

        if ((errorCode === 429 || errorCode === 503) && attempt <= MAX_RETRIES) {
          await sleep(INITIAL_RETRY_DELAY * 2 ** (attempt - 1));
          return this.callProxy(parts, model, attempt + 1);
        }

        throw new Error(errorMessage);
      }

      return data;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);

      if (attempt <= MAX_RETRIES && /429|503|Failed to fetch|NetworkError/.test(message)) {
        await sleep(INITIAL_RETRY_DELAY * 2 ** (attempt - 1));
        return this.callProxy(parts, model, attempt + 1);
      }

      if (directApiKey && !message.includes('Direct API Error')) {
        return this.callDirect(parts, model, directApiKey);
      }

      reportError('GeminiService.callProxy', e);
      throw e;
    }
  }

  /** Direct Google Gemini API fallback. Development only. */
  private static async callDirect(
    parts: GeminiPart[],
    model: string,
    apiKey: string
  ): Promise<unknown> {
    const response = await fetch(GEMINI_DIRECT_ENDPOINT(model), {
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

    const json = await response.json();
    const error = (json as { error?: { message?: string } }).error;

    if (!response.ok || error) {
      const errorMessage = error?.message ?? response.statusText;
      if (response.status === 404 || errorMessage.includes('not found')) {
        const next = nextFallbackModel(model);
        if (next) return this.callDirect(parts, next, apiKey);
      }
      throw new Error(`Direct API Error: ${errorMessage}`);
    }

    return json;
  }

  /** Build the structured prompt parts for identity card rendering. */
  static buildCardParts(params: {
    template: InlineImage;
    cardDescription: string;
    secondaryLangName: string;
    profileData: Record<string, unknown>;
    portrait?: InlineImage | null;
  }): GeminiPart[] {
    const { template, cardDescription, secondaryLangName, profileData, portrait } = params;

    const parts: GeminiPart[] = [
      { inlineData: { mimeType: template.mimeType, data: template.base64 } },
    ];

    if (portrait) {
      parts.push({ inlineData: { mimeType: portrait.mimeType, data: portrait.base64 } });
    }

    const aspectNote = `CRITICAL FORMAT REQUIREMENT:
- Exact Dimensions: 1013 x 638 pixels (Landscape aspect ratio ~1.588:1, standard ISO/IEC 7810 ID-1 card format).
- Flat Orthographic View: Perfectly straight, 2D front-facing orientation with no 3D tilt, no angle distortion, and no perspective slant.
- Zero Padding: Do not add borders, margins, dropshadows, watermarks, or extra canvas padding.`;

    const fields = [
      `• Identification Number: ${profileData.idNumber}`,
      `• Native Name (${secondaryLangName}): ${profileData.nameThai ?? ''}`,
      `• Legal Name (English): ${profileData.fullNameEnglish}`,
      `• Date of Birth: ${profileData.dateOfBirth}`,
      `• Date of Issue: ${profileData.dateOfIssue}`,
      `• Date of Expiry: ${profileData.dateOfExpiry}`,
    ].join('\n');

    const prompt = portrait
      ? `Role: You are an expert official sovereign identity document compositor and engraver.
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

Output: Return ONLY the final composited high-resolution card image.`
      : `Role: You are an expert official sovereign identity document compositor and engraver.
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

    parts.push({ text: prompt });
    return parts;
  }

  /** Extract the generated image from a Gemini candidate response. */
  static extractImageUri(data: unknown): string | null {
    const candidates =
      (data as { candidates?: Array<{ content?: { parts?: unknown[] } }> })?.candidates ?? [];
    const parts = candidates[0]?.content?.parts ?? [];

    for (const part of parts) {
      const inlineData = (part as { inlineData?: { data?: string; mimeType?: string } })?.inlineData;
      if (inlineData?.data) {
        return `data:${inlineData.mimeType ?? 'image/png'};base64,${inlineData.data}`;
      }
    }
    return null;
  }

  /** Generate a card image for a profile, resolving the template automatically. */
  static async generateCardImage(
    params: GenerateCardParams & {
      cardDescription?: string;
      secondaryLangName?: string;
      model?: string;
    }
  ): Promise<string> {
    const { countryCode, profileData, portrait, model = DEFAULT_MODEL } = params;

    const metadata = getCountryMetadata(countryCode);
    const template = await getCountryCardTemplate(countryCode);

    const parts = this.buildCardParts({
      template,
      cardDescription: params.cardDescription ?? metadata.cardDescription,
      secondaryLangName: params.secondaryLangName ?? metadata.secondaryLangName,
      profileData,
      portrait,
    });

    const response = await this.callProxy(parts, model);
    const uri = this.extractImageUri(response);
    if (!uri) throw new Error('The model did not return an image.');
    return uri;
  }
}
