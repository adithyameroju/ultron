import type { CreativeTheme, LinkedInFormatId, PosterContent, Variation } from './posterTypes';

const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';
const DALLE3_MAX_PROMPT_LEN = 3900;

export type AiHeroImageResult =
  | { ok: true; dataUrl: string }
  | { ok: false; message: string };

/** DALL·E 3 fixed sizes — map poster format to closest aspect. */
export function dalleSizeForFormat(format: LinkedInFormatId): '1024x1024' | '1792x1024' | '1024x1792' {
  switch (format) {
    case 'landscape':
      return '1792x1024';
    case 'square':
      return '1024x1024';
    case 'vertical':
      return '1024x1792';
    default:
      return '1024x1024';
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

  const raw = [
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

  return raw.length <= DALLE3_MAX_PROMPT_LEN ? raw : `${raw.slice(0, DALLE3_MAX_PROMPT_LEN - 3)}...`;
}

/**
 * OpenAI Images API (DALL·E 3). Requires `VITE_OPENAI_API_KEY` — local/dev only; exposed in client bundle.
 */
export async function generateOpenAiHeroImage(args: {
  prompt: string;
  size: '1024x1024' | '1792x1024' | '1024x1792';
  apiKey: string;
}): Promise<AiHeroImageResult> {
  const key = args.apiKey.trim();
  if (!key) {
    return {
      ok: false,
      message:
        'Missing OpenAI API key. Edit .env.local and set VITE_OPENAI_API_KEY=sk-... (no quotes), save, restart npm run dev.',
    };
  }

  try {
    const res = await fetch(OPENAI_IMAGES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: args.prompt,
        n: 1,
        size: args.size,
        quality: 'standard',
        response_format: 'b64_json',
      }),
    });

    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        ok: false,
        message: res.ok ? 'Invalid JSON from OpenAI.' : `${res.status}: ${text.slice(0, 200)}`,
      };
    }

    if (!res.ok) {
      const err = parsed as { error?: { message?: string } };
      return { ok: false, message: err.error?.message ?? `${res.status} ${res.statusText}` };
    }

    const root = parsed as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    const item = root.data?.[0];
    const b64 = item?.b64_json;
    if (typeof b64 === 'string' && b64.length > 0) {
      return { ok: true, dataUrl: `data:image/png;base64,${b64}` };
    }

    const url = item?.url;
    if (typeof url === 'string' && url.length > 0) {
      return { ok: true, dataUrl: url };
    }

    return {
      ok: false,
      message: 'OpenAI returned no image data (try again or check model access).',
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}
