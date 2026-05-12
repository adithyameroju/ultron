import type {
  AccentId,
  CreativeTheme,
  LinkedInFormatId,
  PosterContent,
  Variation,
} from './posterTypes';
import type { AiHeroImageResult } from './openaiHeroImage';

export type { AiHeroImageResult };

export { buildHeroImagePrompt } from './openaiHeroImage';

const FREEPIK_PROMPT_MAX = 2000;

const ACCENT_SCENE_HINT: Record<AccentId, string> = {
  purple: 'Use restrained violet and deep purple light accents only.',
  picton: 'Use restrained cyan and teal light accents only.',
  cerise: 'Use restrained magenta and pink light accents only.',
  deepPurple: 'Use restrained deep plum and indigo light accents only.',
  violet: 'Use restrained electric violet and lavender light accents only.',
  inkPurple: 'Use restrained near-black purple and ink-blue light accents only.',
};

function posterCanvasForPrompt(theme: CreativeTheme): string {
  if (theme === 'dark') {
    return 'Background must be a seamless flat editorial gradient only—deep purple-black (#0a0418 into #12082a and #18084a)—no cut-out studio, no bright sky, no white backdrop, no hard horizon; paint the subject into this canvas so it merges with the background.';
  }
  return 'Background must be a seamless airy editorial gradient—white into soft lavender (#ffffff, #f8f7fd, #ecebff)—no grey studio cyclorama, no busy stock location; subject should merge softly into this light canvas.';
}

/** Deterministic seed from poster inputs so the same bundle reproduces the same image (Freepik allows 0–1_000_000). */
export function stableFreepikHeroSeed(input: {
  headline: string;
  subhead: string;
  format: LinkedInFormatId;
  theme: CreativeTheme;
  variationId: string;
  displayOverline?: string;
  displaySubhead?: string;
  cta?: string;
}): number {
  const blob = [
    input.headline,
    input.subhead,
    input.displaySubhead ?? '',
    input.displayOverline ?? '',
    input.cta ?? '',
    input.variationId,
    input.format,
    input.theme,
  ].join('\u001f');
  let h = 5381;
  for (let i = 0; i < blob.length; i++) {
    h = Math.imul(h, 33) ^ blob.charCodeAt(i)!;
  }
  return Math.abs(h) % 1_000_001;
}

/**
 * Prompt tuned for Freepik / Magnific text-to-image: leads with headline/subhead, matches poster canvas,
 * reserves top-right for logo, and encodes the rest of the form fields.
 * No readable text in the image (matches poster overlay rules).
 */
export function buildFreepikHeroImagePrompt(
  content: PosterContent,
  variation: Variation,
  theme: CreativeTheme
): string {
  const overline = (variation.displayOverline ?? content.overline).replace(/\s+/g, ' ').trim();
  const headline = content.headline.replace(/\s+/g, ' ').trim();
  const sub = (variation.displaySubhead ?? content.subhead).replace(/\s+/g, ' ').trim();
  const cta = content.cta.replace(/\s+/g, ' ').trim();
  const tags = content.hashtags.replace(/\s+/g, ' ').trim();
  const foot = content.footnote.replace(/\s+/g, ' ').trim();
  const accentHint = ACCENT_SCENE_HINT[variation.accent] ?? ACCENT_SCENE_HINT.purple;

  const leadScene = [
    'One hero illustration for a LinkedIn B2B insurance or fintech poster.',
    headline ? `Primary scene and metaphors must directly reflect this headline: ${headline}` : '',
    sub ? `Supporting details and benefits to show visually (objects, motion, environment): ${sub}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const mood =
    theme === 'dark'
      ? 'Mood: premium dark enterprise, depth, soft glow, trustworthy editorial.'
      : 'Mood: bright clean enterprise, optimistic B2B editorial.';

  const raw = [
    leadScene,
    posterCanvasForPrompt(theme),
    'Keep the top-right area (about one quarter width from the right edge, upper third of the frame) visually quiet—soft gradient or minimal detail only—reserved for a partner logo overlay.',
    'Do not render readable letters, numbers, logos, watermarks, or UI chrome; express ideas through metaphor, objects, and light only.',
    overline ? `Category / overline to echo visually: ${overline}.` : '',
    cta ? `Call-to-action emotional direction (trust, momentum, partnership—not button text): ${cta}.` : '',
    tags ? `Industry topics to echo as metaphors (no hashtag symbols): ${tags}.` : '',
    foot ? `Compliance-aware professional tone; no fine print in the image: ${foot}.` : '',
    mood,
    accentHint,
    'Composition: one clear focal subject, center-left weighting, generous negative space for poster text, high detail.',
  ]
    .filter(Boolean)
    .join(' ');

  return raw.length <= FREEPIK_PROMPT_MAX ? raw : `${raw.slice(0, FREEPIK_PROMPT_MAX - 3)}...`;
}

/** Same-origin proxy path (Vite) → https://api.freepik.com/v1/ai/text-to-image */
const FREEPIK_TEXT_TO_IMAGE_PATH = '/v1/ai/text-to-image';

function freepikTextToImageUrl(): string {
  if (
    import.meta.env.DEV ||
    import.meta.env.VITE_FREEPIK_USE_DEV_PROXY === 'true'
  ) {
    return `/api/freepik${FREEPIK_TEXT_TO_IMAGE_PATH}`;
  }
  return `https://api.freepik.com${FREEPIK_TEXT_TO_IMAGE_PATH}`;
}

/**
 * Aspect presets for Freepik / Magnific text-to-image.
 * The hosted “fluid” model only allows: square_1_1, social_story_9_16, widescreen_16_9,
 * traditional_3_4, classic_4_3 — `social_post_4_5` validates on paper but fails in practice for many keys.
 */
export type FreepikImageAspect =
  | 'square_1_1'
  | 'widescreen_16_9'
  /** ~3:4 portrait; closest allowed vertical to LinkedIn 4:5 without using disallowed sizes. */
  | 'traditional_3_4';

export function freepikImageSizeForFormat(format: LinkedInFormatId): FreepikImageAspect {
  switch (format) {
    case 'landscape':
      return 'widescreen_16_9';
    case 'square':
    case 'carousel':
      return 'square_1_1';
    case 'vertical':
      return 'traditional_3_4';
    default:
      return 'square_1_1';
  }
}

function formatFreepikErrorMessage(parsed: unknown, fallback: string): string {
  if (typeof parsed !== 'object' || parsed === null) {
    return fallback;
  }
  const root = parsed as Record<string, unknown>;
  const problem = root.problem as Record<string, unknown> | undefined;
  if (problem && typeof problem.message === 'string') {
    const inv = problem.invalid_params;
    if (Array.isArray(inv) && inv.length > 0) {
      const parts = inv
        .map((item) => {
          if (typeof item !== 'object' || item === null) {
            return null;
          }
          const p = item as Record<string, unknown>;
          const name = typeof p.name === 'string' ? p.name : 'parameter';
          const reason = typeof p.reason === 'string' ? p.reason : '';
          return reason ? `${name}: ${reason}` : name;
        })
        .filter((x): x is string => typeof x === 'string' && x.length > 0);
      if (parts.length > 0) {
        return `${problem.message} ${parts.join(' · ')}`.slice(0, 600);
      }
    }
    return problem.message;
  }
  const topInv = root.invalid_params;
  if (typeof root.message === 'string' && Array.isArray(topInv) && topInv.length > 0) {
    const parts = topInv
      .map((item) => {
        if (typeof item !== 'object' || item === null) {
          return null;
        }
        const p = item as Record<string, unknown>;
        const name = typeof p.name === 'string' ? p.name : 'parameter';
        const reason = typeof p.reason === 'string' ? p.reason : '';
        return reason ? `${name}: ${reason}` : name;
      })
      .filter((x): x is string => typeof x === 'string' && x.length > 0);
    if (parts.length > 0) {
      return `${root.message} ${parts.join(' · ')}`.slice(0, 600);
    }
  }
  const err = root as { message?: string; error?: { message?: string } };
  return (
    err.message ??
    err.error?.message ??
    (typeof root.detail !== 'undefined' ? String(root.detail) : fallback)
  );
}

/**
 * Freepik AI text-to-image (Magnific-backed API on api.freepik.com).
 * Set `VITE_FREEPIK_API_KEY` in `.env.local` (exposed in client bundle — dev/demo only).
 *
 * CORS: `npm run dev` uses `/api/freepik/...` (Vite `server.proxy`). For `vite preview`, add
 * `VITE_FREEPIK_USE_DEV_PROXY=true` to `.env.local` and rebuild. Static GitHub Pages needs a serverless proxy.
 */
export async function generateFreepikHeroImage(args: {
  prompt: string;
  format: LinkedInFormatId;
  apiKey: string;
  /** When set, adds API `styling` for stronger editorial look aligned with light/dark poster theme. */
  theme?: CreativeTheme;
  /** Optional 0–1_000_000; same seed + same prompt tends to reproduce the same result. */
  seed?: number;
}): Promise<AiHeroImageResult> {
  const key = args.apiKey.trim();
  if (!key) {
    return {
      ok: false,
      message:
        'Missing Freepik API key. Add VITE_FREEPIK_API_KEY to .env.local (no quotes), save, restart npm run dev.',
    };
  }

  const styling =
    args.theme === undefined
      ? {}
      : {
          /** Only `style` — some deployments reject certain `effects` combinations. */
          styling: {
            style: args.theme === 'dark' ? ('dark' as const) : ('digital-art' as const),
          },
        };

  const seed =
    args.seed !== undefined && Number.isFinite(args.seed)
      ? { seed: Math.min(1_000_000, Math.max(0, Math.round(args.seed))) }
      : {};

  const body = {
    prompt: args.prompt,
    image: {
      size: freepikImageSizeForFormat(args.format),
    },
    num_images: 1,
    /** Higher value = closer adherence to the prompt (API range [0, 2]; max 1 decimal place). */
    guidance_scale: 2,
    filter_nsfw: true,
    negative_prompt:
      'watermark, logo text, readable letters, typography, random unrelated objects, generic stock office, cluttered composition, low quality, distorted, deformed hands, white studio backdrop, cutout subject on grey',
    ...styling,
    ...seed,
  };

  try {
    const res = await fetch(freepikTextToImageUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-freepik-api-key': key,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        ok: false,
        message: res.ok ? 'Invalid JSON from Freepik API.' : `${res.status}: ${text.slice(0, 240)}`,
      };
    }

    if (!res.ok) {
      const msg = formatFreepikErrorMessage(parsed, `${res.status} ${res.statusText}`);
      return { ok: false, message: msg };
    }

    const root = parsed as {
      data?: Array<{ base64?: string; url?: string; has_nsfw?: boolean }>;
    };
    const item = root.data?.[0];
    if (item?.has_nsfw === true) {
      return { ok: false, message: 'Image was flagged as NSFW. Try a different prompt.' };
    }

    const b64 = item?.base64;
    if (typeof b64 === 'string' && b64.length > 0) {
      const clean = b64.replace(/^data:image\/\w+;base64,/, '');
      return { ok: true, dataUrl: `data:image/png;base64,${clean}` };
    }

    const url = item?.url;
    if (typeof url === 'string' && url.length > 0) {
      return { ok: true, dataUrl: url };
    }

    return {
      ok: false,
      message: 'Freepik returned no image data. Check your plan, quota, and API response format.',
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}
