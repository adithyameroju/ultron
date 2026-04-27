import type { CreativeTheme, LinkedInFormatId, PosterContent, Variation } from './posterTypes';

const IMAGEN_FAST = 'imagen-4.0-fast-generate-001';
const GEN_AI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export type ImagenHeroResult =
  | { ok: true; dataUrl: string }
  | { ok: false; message: string };

/** Maps poster format to Imagen-supported aspect ratios. */
export function imagenAspectRatio(format: LinkedInFormatId): string {
  switch (format) {
    case 'landscape':
      return '16:9';
    case 'square':
      return '1:1';
    case 'vertical':
      return '9:16';
    default:
      return '1:1';
  }
}

export function buildHeroImagePrompt(
  content: PosterContent,
  variation: Variation,
  theme: CreativeTheme
): string {
  const sub = content.subhead.replace(/\s+/g, ' ').trim().slice(0, 480);
  const palette =
    theme === 'dark'
      ? 'Dark premium enterprise palette, subtle gradients, teal and magenta accents'
      : 'Bright clean enterprise palette, soft violet and cyan accents';

  return [
    'Premium B2B insurance marketing hero artwork for LinkedIn, abstract and editorial.',
    `Concept inspired by headline: "${content.headline}".`,
    sub ? `Supporting theme: ${sub}` : '',
    `${palette}; accent vibe: ${variation.accent}; ${theme} creative mode.`,
    'Visual style: modern SaaS illustration, subtle depth, soft gradients, abstract shapes suggesting trust and momentum.',
    'Must not contain readable letters, logos, watermark text, or real brand marks.',
    'Leave clear negative space suitable for cropping into a poster column.',
  ]
    .filter(Boolean)
    .join(' ');
}

function extractBase64FromPredictBody(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const root = data as Record<string, unknown>;

  const tryDecode = (v: unknown): string | null => {
    if (typeof v !== 'string' || v.length < 40) {
      return null;
    }
    return `data:image/png;base64,${v}`;
  };

  const preds = root.predictions;
  if (Array.isArray(preds) && preds.length > 0) {
    const p0 = preds[0] as Record<string, unknown>;
    const b64 =
      (typeof p0.bytesBase64Encoded === 'string' && p0.bytesBase64Encoded) ||
      (typeof p0.bytes_base64_encoded === 'string' && p0.bytes_base64_encoded);
    const out = typeof b64 === 'string' ? tryDecode(b64) : null;
    if (out) {
      return out;
    }
    const imgs = p0.generatedImages ?? p0.generated_images;
    if (Array.isArray(imgs) && imgs[0] && typeof imgs[0] === 'object') {
      const img = imgs[0] as Record<string, unknown>;
      const nested = img.image && typeof img.image === 'object' ? (img.image as Record<string, unknown>) : img;
      const nb =
        (typeof nested.imageBytes === 'string' && nested.imageBytes) ||
        (typeof nested.bytesBase64Encoded === 'string' && nested.bytesBase64Encoded);
      if (typeof nb === 'string') {
        return tryDecode(nb);
      }
    }
  }

  return null;
}

/**
 * Calls Google Imagen on the Gemini API (AI Studio key).
 * Requires `VITE_GEMINI_API_KEY` — intended for local/dev; exposed in client bundle.
 */
export async function generateImagenHeroImage(args: {
  prompt: string;
  aspectRatio: string;
  apiKey: string;
}): Promise<ImagenHeroResult> {
  const key = args.apiKey.trim();
  if (!key) {
    return { ok: false, message: 'Missing Gemini API key. Add VITE_GEMINI_API_KEY to .env.local.' };
  }

  const url = `${GEN_AI_BASE}/${IMAGEN_FAST}:predict?key=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ prompt: args.prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: args.aspectRatio,
          personGeneration: 'allow_adult',
        },
      }),
    });

    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        ok: false,
        message: res.ok ? 'Invalid JSON from Imagen.' : `${res.status}: ${text.slice(0, 180)}`,
      };
    }

    if (!res.ok) {
      const err = parsed as { error?: { message?: string; status?: string } };
      const msg = err.error?.message ?? `${res.status} ${res.statusText}`;
      return { ok: false, message: msg };
    }

    const dataUrl = extractBase64FromPredictBody(parsed);
    if (!dataUrl) {
      return {
        ok: false,
        message: 'Could not read image bytes from API response (model or schema may differ).',
      };
    }

    return { ok: true, dataUrl };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}
