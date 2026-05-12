import type { CarouselPlanSlide } from './carouselPlan';
import type { AccentId, CreativeTheme, LinkedInFormatId, PosterContent, Variation } from './posterTypes';

const OPENAI_GENERATIONS_PATH = '/v1/images/generations';

/** Same-origin proxy (Vite) → https://api.openai.com/v1/images/generations */
function openAiImagesGenerationsUrl(): string {
  if (import.meta.env.DEV || import.meta.env.VITE_OPENAI_USE_DEV_PROXY === 'true') {
    return `/api/openai${OPENAI_GENERATIONS_PATH}`;
  }
  return `https://api.openai.com${OPENAI_GENERATIONS_PATH}`;
}
const IMAGE_PROMPT_MAX_LEN = 8000;

/** Default OpenAI image model for hero generation (`gpt-image-1` = GPT Image 1). Override with `VITE_OPENAI_IMAGE_MODEL`. */
export const DEFAULT_OPENAI_IMAGE_MODEL = 'gpt-image-1';

export type OpenAiImageModelId =
  | 'gpt-image-1'
  | 'gpt-image-1-mini'
  | 'gpt-image-1.5'
  | 'gpt-image-2'
  | 'dall-e-3'
  | 'dall-e-2';

function resolveImageModel(): string {
  const fromEnv = import.meta.env.VITE_OPENAI_IMAGE_MODEL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_OPENAI_IMAGE_MODEL;
}

function isGptImageModel(model: string): boolean {
  return model.startsWith('gpt-image');
}

/** Stopwords for cue extraction — avoids feeding full sentences that the model may render as type. */
const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'for',
  'to',
  'of',
  'in',
  'on',
  'at',
  'by',
  'with',
  'from',
  'as',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
  'your',
  'our',
  'their',
  'they',
  'we',
  'you',
  'not',
  'no',
  'so',
  'if',
  'but',
  'into',
  'than',
  'then',
  'when',
  'what',
  'which',
  'who',
  'how',
  'why',
  'about',
  'over',
  'under',
  'more',
  'less',
  'any',
  'all',
  'can',
  'will',
  'has',
  'have',
  'had',
  'do',
  'does',
  'did',
  'just',
  'only',
  'also',
  'out',
  'up',
  'down',
]);

/** Non-photoreal hero styles only (no real humans). */
type HeroVisualModality = 'soft3d' | 'illustration' | 'iconsLine';

/** Picks a single visual language from headline + subhead. Never photoreal. */
function inferHeroVisualModality(headline: string, subhead: string): HeroVisualModality {
  const blob = `${headline} ${subhead}`.toLowerCase();
  const iconLineHits = [
    'icon',
    'icons',
    'simple',
    'minimal',
    'line',
    'linear',
    'outline',
    'pictogram',
    'symbol',
    'symbols',
    'checklist',
    'steps',
    'ui',
    'ux',
    'dashboard',
    'tile',
    'tiles',
  ];
  const soft3dHits = [
    'digital',
    'data',
    'cloud',
    'platform',
    'software',
    'api',
    'tech',
    'technology',
    'automate',
    'automation',
    'scale',
    'scalable',
    'speed',
    'network',
    'connectivity',
    'analytics',
    'algorithm',
    'stack',
    'infrastructure',
    'layer',
    'online',
    'app',
    'apps',
    'secure',
    'shield',
    'layered',
  ];
  const illustrationHits = [
    'policy',
    'policies',
    'claims',
    'coverage',
    'premium',
    'paperwork',
    'document',
    'documents',
    'contract',
    'contracts',
    'risk',
    'underwriting',
    'compliance',
    'broker',
    'sme',
    'enterprise',
    'business',
    'paper',
    'process',
    'workflow',
    'b2b',
    'partner',
    'partnership',
    'insurance',
    'insure',
    'friction',
    'teams',
    'team',
    'health',
    'fleet',
    'employee',
    'customer',
  ];

  let i = 0;
  let t = 0;
  let ill = 0;
  for (const w of iconLineHits) {
    if (blob.includes(w)) {
      i += 1;
    }
  }
  for (const w of soft3dHits) {
    if (blob.includes(w)) {
      t += 1;
    }
  }
  for (const w of illustrationHits) {
    if (blob.includes(w)) {
      ill += 1;
    }
  }

  if (i > 0 && i >= t && i >= ill) {
    return 'iconsLine';
  }
  if (t > 0 && t >= ill && t >= i) {
    return 'soft3d';
  }
  if (ill > t && ill > i) {
    return 'illustration';
  }
  if (t > ill) {
    return 'soft3d';
  }
  if (i > ill) {
    return 'iconsLine';
  }
  return 'illustration';
}

function modalityInstruction(modality: HeroVisualModality): string {
  switch (modality) {
    case 'soft3d':
      return 'VISUAL EXECUTION — exactly ONE treatment: premium soft 3D / dimensional abstract forms and large symbolic objects (matte plastic, glass, metal). Large iconic volumes allowed. No photoreal humans, no faces, no hands, no dolls—only stylised non-human CGI.';
    case 'iconsLine':
      return 'VISUAL EXECUTION — exactly ONE treatment: large flat or softly shaded icons plus clean line illustration (stroke-led, minimal fills). Icon-forward layout; no photoreal humans or 3D character heads—vector and line language only.';
    default:
      return 'VISUAL EXECUTION — exactly ONE treatment: modern editorial illustration (flat colour blocks, soft gradients, or light painted digital illustration). Symbolic shapes and metaphors; no photoreal humans, no faces—stylised 2D only.';
  }
}

/**
 * Derives thematic keywords from headline + subhead without quoting full copy,
 * so the image model is less likely to paint headline/subhead as typography.
 */
function abstractVisualCue(headline: string, subhead: string, modality: HeroVisualModality): string {
  const blob = `${headline} ${subhead}`
    .replace(/["'`]/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const tokens = blob.split(' ').filter((w) => w.length > 2 && !STOPWORDS.has(w));
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const t of tokens) {
    if (seen.has(t)) {
      continue;
    }
    seen.add(t);
    keywords.push(t);
    if (keywords.length >= 18) {
      break;
    }
  }

  const joined = keywords.length > 0 ? keywords.join(', ') : 'trust, momentum, protection, digital convenience, B2B insurance India';

  if (modality === 'soft3d') {
    return `Themes inferred from the copy (never spell as text): ${joined}. First infer the underlying idea (what problem or promise the copy implies), then express it as abstract soft-3D forms and materials—no literal depiction of headline words as text objects, no human figures.`;
  }
  if (modality === 'iconsLine') {
    return `Themes inferred from the copy (never spell as text): ${joined}. First infer the core concept, then express it with large icons and line-art metaphors only—no literal typography, no people.`;
  }
  return `Themes inferred from the copy (never spell as text): ${joined}. First infer the core story or tension in the copy, then one illustrated metaphor (objects, paths, shields, layers, balance)—never spell these as words; no photoreal people.`;
}

export type AiHeroImageResult =
  | { ok: true; dataUrl: string; usedNativeTransparency?: boolean }
  | { ok: false; message: string };

/** DALL·E 3 sizes (Image API). */
export function dalleSizeForFormat(format: LinkedInFormatId): '1024x1024' | '1792x1024' | '1024x1792' {
  switch (format) {
    case 'landscape':
      return '1792x1024';
    case 'square':
    case 'carousel':
      return '1024x1024';
    case 'vertical':
      return '1024x1792';
    default:
      return '1024x1024';
  }
}

/**
 * GPT Image 1 / 1-mini / 1.5 fixed sizes per Images API (not the same as DALL·E 3).
 * Maps poster aspect to closest allowed size.
 */
export function gptImageSizeForFormat(format: LinkedInFormatId): '1024x1024' | '1024x1536' | '1536x1024' {
  switch (format) {
    case 'landscape':
      return '1536x1024';
    case 'square':
    case 'carousel':
      return '1024x1024';
    case 'vertical':
      return '1024x1536';
    default:
      return '1024x1024';
  }
}

export function buildHeroImagePrompt(
  content: PosterContent,
  variation: Variation,
  theme: CreativeTheme
): string {
  const headline = content.headline.replace(/\s+/g, ' ').trim();
  const sub = content.subhead.replace(/\s+/g, ' ').trim();
  const modality = inferHeroVisualModality(headline, sub);
  const cue =
    headline || sub
      ? abstractVisualCue(headline, sub, modality)
      : 'Infer trust and momentum for B2B insurance India; express as stylised non-human illustration or soft 3D—nothing readable as text.';

  const accentHints: Record<AccentId, string> = {
    purple: 'violet and deep purple accents on foreground subjects and icons only',
    picton: 'cyan and teal accents on foreground subjects and icons only',
    cerise: 'magenta and pink accents on foreground subjects and icons only',
    deepPurple: 'deep plum and indigo accents on foreground subjects and icons only',
    violet: 'electric violet and soft lavender accents on foreground subjects and icons only',
    inkPurple: 'ink purple and near-black violet accents on foreground subjects and icons only',
  };
  const accentHint = accentHints[variation.accent] ?? accentHints.purple;

  const gptOutput = isGptImageModel(resolveImageModel());

  const noHumans =
    'ABSOLUTE — no real or photoreal humans: no faces, eyes, skin, hair, hands as portraits, no stock-photo people, no silhouettes that read as specific persons, no mannequins or dolls. Use only non-human graphics: icons, abstract shapes, soft 3D objects, line illustration.';

  const conceptFirst =
    'Process: (1) Read the thematic keywords as the marketing concept only—not as literal objects to spell or paste. (2) Infer one clear abstract idea that fits a LinkedIn B2B insurance post beside copy. (3) Render that idea as a single cohesive hero cluster—metaphorical, not literal headline illustration.';

  const parts: string[] = [
    'Single hero artwork for a LinkedIn B2B poster right column: pure visual only—no poster layout, no mock UI frame, no second column, no typography block.',
    'Compliance and brand: follow norms for Indian insurance and financial advertising—no exaggerated guarantees, no fear-mongering, no invented statistics, no impersonation of regulators or government marks, no misleading “before/after” savings. ACKO B2B tone: trustworthy, inclusive, modern India enterprise context where relevant; premium and restrained.',
    noHumans,
    conceptFirst,
    modalityInstruction(modality),
    'Use exactly one visual language end-to-end—do not collage mismatched styles (e.g. no flat icons glued onto photoreal scraps).',
    cue,
    `Overall mood fits a ${theme} enterprise poster; ${accentHint}.`,
  ];

  if (gptOutput) {
    parts.push(
      'Background must be fully transparent: only the illustrated foreground subject and soft edge feather into transparency—no solid backdrop, no checkerboard pattern, no frame, no vignette, no painted “card” behind the subject.',
      'One isolated focal cluster centred with breathing room; edges may softly fade to transparent for clean compositing on any poster gradient.',
      'CRITICAL — no text anywhere: no letters, digits, words, slogans, logos, watermarks, captions, speech bubbles, charts with labels, app UI with strings, road signs, packaging with type, or infographic copy.',
      'Composition: one clear focal idea, minimal clutter, insurance-grade polish.',
      'Leave generous transparent margin on the sides for a vertical crop column beside copy added separately by the designer.'
    );
  } else {
    parts.push(
      'BACKGROUND: uniform flat pure white (#FFFFFF) across the entire canvas behind the subject. No sky, horizon, room photo, or busy wallpaper.',
      'One isolated focal cluster in the centre area; soft feather toward white at edges is OK. Subject must read as cut-out friendly for compositing.',
      'CRITICAL — no text anywhere: no letters, digits, words, slogans, logos, watermarks, captions, speech bubbles, charts with labels, app UI with strings, road signs, packaging with type, or infographic copy.',
      'Composition: one clear focal idea, minimal clutter, insurance-grade polish.',
      'Leave generous empty white margin on the sides for a vertical crop column beside copy that will be added separately by the designer.'
    );
  }

  const raw = parts.join(' ');
  return raw.length <= IMAGE_PROMPT_MAX_LEN ? raw : `${raw.slice(0, IMAGE_PROMPT_MAX_LEN - 3)}...`;
}

/**
 * Carousel-only: builds a hero image prompt from the **plan** row (visual_direction + composition),
 * not from `buildHeroImagePrompt` headline token cues — so each slide can be a distinct scene while
 * staying in one brand-illustration family.
 */
export function buildCarouselSlideHeroImagePrompt(args: {
  theme: CreativeTheme;
  slideIndex: number;
  totalSlides: number;
  planSlide: Pick<CarouselPlanSlide, 'visual_direction' | 'composition' | 'role'>;
  campaignBrief: string;
  prevVisualSummary?: string;
  nextVisualSummary?: string;
}): string {
  const x = args.slideIndex + 1;
  const y = args.totalSlides;
  const brief = args.campaignBrief.replace(/\s+/g, ' ').trim().slice(0, 600);
  const vd = args.planSlide.visual_direction.replace(/\s+/g, ' ').trim();
  const comp = args.planSlide.composition.replace(/\s+/g, ' ').trim();
  const model = resolveImageModel();
  const gptOutput = isGptImageModel(model);

  const globalStyle =
    'GLOBAL STYLE FAMILY for this carousel (brand cohesion — this image must still be unique): premium fintech–insurance illustration; modern soft 3D or polished abstract dimensional forms; deep purple gradient moods with mint / teal accent highlights; soft lighting; rounded minimal character shapes if any figures appear—never photoreal humans, no identifiable faces, no stock-photo people, no hands as portraits.';

  const uniqueness = `This is slide ${x} of ${y} of one LinkedIn carousel document. The visual composition MUST be clearly different from every other slide: different focal object, different metaphor, different setting, different framing and rhythm. Do NOT reuse the same illustration with only colour or background tweaks. Do NOT repeat the same character poses or layout structure as other slides.`;

  const noHumans =
    'ABSOLUTE — no real or photoreal humans: no faces, eyes, skin, hair, hands as portraits, no stock-photo people, no silhouettes that read as specific persons. Use stylised non-human graphics or highly abstracted rounded figures only.';

  const noText =
    'CRITICAL — pure artwork only: no letters, words, numerals, logos, watermarks, UI copy, speech bubbles, chart labels, road signs, packaging text, or any typography. Headlines and body copy are composited separately by the product; render ONLY the visual scene.';

  const compliance =
    'Compliance: follow norms for Indian insurance and financial advertising—no exaggerated guarantees, no fear-mongering, no invented statistics, no impersonation of regulators. ACKO B2B tone: trustworthy, inclusive, modern enterprise context where relevant; premium and restrained.';

  const neighbour =
    args.prevVisualSummary && args.nextVisualSummary
      ? `Scene differentiation: do not echo the previous slide (${args.prevVisualSummary.slice(0, 140)}) or the next slide (${args.nextVisualSummary.slice(0, 140)}).`
      : args.prevVisualSummary
        ? `Previous slide was: ${args.prevVisualSummary.slice(0, 160)} — create a clearly different scene.`
        : args.nextVisualSummary
          ? `Next slide will be: ${args.nextVisualSummary.slice(0, 160)} — do not preview that scene here.`
        : '';

  const parts: string[] = [
    'Single hero artwork for a LinkedIn B2B poster right column (carousel slide). Pure visual only—no poster layout, no mock UI frame, no second column, no typography block.',
    compliance,
    noHumans,
    globalStyle,
    `Story beat for this slide: ${args.planSlide.role}.`,
    `PRIMARY SCENE DIRECTION (follow closely): ${vd}`,
    `COMPOSITION FOR THIS SLIDE ONLY: ${comp}`,
    uniqueness,
    brief ? `Campaign continuity (themes only, never as readable text): ${brief}` : '',
    neighbour,
    noText,
    `Overall mood fits a ${args.theme} enterprise poster side panel.`,
    'Use exactly one visual language end-to-end for this image—do not collage mismatched styles.',
  ];

  if (gptOutput) {
    parts.push(
      'Background must be fully transparent: only the illustrated foreground subject and soft edge feather into transparency—no solid backdrop, no checkerboard pattern, no frame, no vignette, no painted “card” behind the subject.',
      'One isolated focal cluster with breathing room; edges may softly fade to transparent for clean compositing on any poster gradient.',
      'Leave generous transparent margin on the sides for a vertical crop column beside copy added separately by the designer.'
    );
  } else {
    parts.push(
      'BACKGROUND: uniform flat pure white (#FFFFFF) across the entire canvas behind the subject. No sky, horizon, room photo, or busy wallpaper.',
      'One isolated focal cluster in the centre area; soft feather toward white at edges is OK.',
      'Leave generous empty white margin on the sides for a vertical crop column beside copy added separately by the designer.'
    );
  }

  const raw = parts.filter(Boolean).join(' ');
  return raw.length <= IMAGE_PROMPT_MAX_LEN ? raw : `${raw.slice(0, IMAGE_PROMPT_MAX_LEN - 3)}...`;
}

/** Extra instructions so each carousel slide gets a distinct hero while staying one visual family. */
export function appendCarouselSlideHeroContext(
  basePrompt: string,
  args: {
    slideIndex: number;
    totalSlides: number;
    campaignBrief: string;
    prevHeadline?: string;
    nextHeadline?: string;
  }
): string {
  const brief = args.campaignBrief.replace(/\s+/g, ' ').trim().slice(0, 700);
  const extra = [
    `LinkedIn carousel: this is slide ${args.slideIndex + 1} of ${args.totalSlides} in one document post.`,
    'Keep the same premium B2B abstract illustration language and palette temperature as a set, but change the focal metaphor and composition so this slide does NOT duplicate the hero layout of other slides.',
    `Campaign brief for continuity: ${brief}`,
    `Neighbour beats — previous slide headline theme: ${args.prevHeadline ?? '(opening slide)'}. Next slide headline theme: ${args.nextHeadline ?? '(closing slide)'}.`,
  ].join(' ');
  const merged = `${basePrompt} ${extra}`;
  return merged.length <= IMAGE_PROMPT_MAX_LEN ? merged : `${merged.slice(0, IMAGE_PROMPT_MAX_LEN - 3)}...`;
}

/**
 * OpenAI Images API — default **`gpt-image-1`** (GPT Image 1). Set `VITE_OPENAI_IMAGE_MODEL=dall-e-3` to use DALL·E 3.
 * Requires `VITE_OPENAI_API_KEY` — local/dev only; exposed in client bundle.
 *
 * CORS: `npm run dev` uses `/api/openai/...` (Vite `server.proxy`). For `vite preview`, set
 * `VITE_OPENAI_USE_DEV_PROXY=true` in `.env.local` and rebuild. Static hosting needs a serverless proxy.
 */
export async function generateOpenAiHeroImage(args: {
  prompt: string;
  format: LinkedInFormatId;
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

  const model = resolveImageModel();
  const gpt = isGptImageModel(model);
  const size = gpt ? gptImageSizeForFormat(args.format) : dalleSizeForFormat(args.format);

  const body: Record<string, unknown> = gpt
    ? {
        model,
        prompt: args.prompt,
        n: 1,
        size,
        quality: 'medium',
        background: 'transparent',
        output_format: 'png',
      }
    : {
        model,
        prompt: args.prompt,
        n: 1,
        size,
        response_format: 'b64_json',
        ...(model === 'dall-e-3' ? { quality: 'standard' as const } : {}),
      };

  try {
    const res = await fetch(openAiImagesGenerationsUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
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
      return {
        ok: true,
        dataUrl: `data:image/png;base64,${b64}`,
        usedNativeTransparency: gpt && body.background === 'transparent',
      };
    }

    const url = item?.url;
    if (typeof url === 'string' && url.length > 0) {
      return { ok: true, dataUrl: url, usedNativeTransparency: false };
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
