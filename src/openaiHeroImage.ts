import type { CarouselPlanSlide } from './carouselPlan';
import { ENTERPRISE_VISUAL_GUIDELINES_IMAGE_BLOCK } from './enterpriseVisualGuidelines';
import type {
  AccentId,
  CreativeTheme,
  LinkedInFormatId,
  PosterContent,
  PosterHeroVisualStyle,
  Variation,
} from './posterTypes';

const OPENAI_GENERATIONS_PATH = '/v1/images/generations';

/** Same-origin proxy (Vite) → https://api.openai.com/v1/images/generations */
function openAiImagesGenerationsUrl(): string {
  if (import.meta.env.DEV || import.meta.env.VITE_OPENAI_USE_DEV_PROXY === 'true') {
    return `/api/openai${OPENAI_GENERATIONS_PATH}`;
  }
  return `https://api.openai.com${OPENAI_GENERATIONS_PATH}`;
}
const IMAGE_PROMPT_MAX_LEN = 8000;

function mergeImagePromptWithVisualGuidelines(dynamicPart: string): string {
  const merged = `${dynamicPart.trim()}${ENTERPRISE_VISUAL_GUIDELINES_IMAGE_BLOCK}`;
  return merged.length <= IMAGE_PROMPT_MAX_LEN ? merged : `${merged.slice(0, IMAGE_PROMPT_MAX_LEN - 3)}...`;
}

/** Default OpenAI image model for hero generation (GPT Image 2). Override with `VITE_OPENAI_IMAGE_MODEL`. */
export const DEFAULT_OPENAI_IMAGE_MODEL = 'gpt-image-2';

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

/** `gpt-image-2` supports `high` for maximum fidelity; other GPT Image models use `medium` (never `low`). */
function gptImagesApiQuality(model: string): 'low' | 'medium' | 'high' {
  const m = model.trim().toLowerCase();
  if (m === 'gpt-image-2') {
    return 'high';
  }
  return 'medium';
}

/**
 * Only some GPT Image models accept `background: "transparent"` on `/v1/images/generations`.
 * `gpt-image-2` responds with: "Transparent background is not supported for this model."
 * All other GPT Image models use opaque PNG from the API; {@link finalizeHeroDataUrl} applies white-key transparency when needed.
 */
export function gptImageSupportsApiTransparency(model: string): boolean {
  const m = model.trim().toLowerCase();
  return m === 'gpt-image-1' || m === 'gpt-image-1-mini' || m === 'gpt-image-1.5';
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
      return 'VISUAL EXECUTION — exactly ONE treatment: very high quality modern editorial illustration—commissioned campaign finish (refined flat colour, controlled gradients, or polished digital paint per §2.7 in the visual guidelines). Deliberate composition, confident edges, premium B2B polish; symbolic metaphors only. No photoreal humans, no faces, no rough sketches or clip-art—stylised 2D only.';
  }
}

function themeKeywordsFromCopy(headline: string, subhead: string): string {
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
  return keywords.length > 0
    ? keywords.join(', ')
    : 'trust, momentum, protection, digital convenience, B2B insurance India';
}

function photorealHumanThematicLine(headline: string, subhead: string): string {
  const kw = themeKeywordsFromCopy(headline, subhead);
  return `Story mood inferred from the copy only (never spell as readable type): ${kw}. Let the human scene embody this beat at a glance—metaphorical workplace storytelling, not a literal headline illustration.`;
}

/**
 * Derives thematic keywords from headline + subhead without quoting full copy,
 * so the image model is less likely to paint headline/subhead as typography.
 */
function abstractVisualCue(headline: string, subhead: string, modality: HeroVisualModality): string {
  const joined = themeKeywordsFromCopy(headline, subhead);

  if (modality === 'soft3d') {
    return `Themes inferred from the copy (never spell as text): ${joined}. First infer the underlying idea (what problem or promise the copy implies), then express it as abstract soft-3D forms and materials—no literal depiction of headline words as text objects, no human figures.`;
  }
  if (modality === 'iconsLine') {
    return `Themes inferred from the copy (never spell as text): ${joined}. First infer the core concept, then express it with large icons and line-art metaphors only—no literal typography, no people.`;
  }
  return `Themes inferred from the copy (never spell as text): ${joined}. First infer the core story or tension in the copy, then one very high quality illustrated metaphor (objects, paths, shields, layers, balance)—premium editorial finish per §2.7; never spell these as words; no photoreal people; no sketch or clip-art quality.`;
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
  const heroStyle: PosterHeroVisualStyle = variation.heroVisualStyle ?? 'default';

  const accentHints: Record<AccentId, string> = {
    purple: 'violet and deep purple accents on foreground subjects and icons only',
    picton: 'cyan and teal accents on foreground subjects and icons only',
    cerise: 'magenta and pink accents on foreground subjects and icons only',
    deepPurple: 'deep plum and indigo accents on foreground subjects and icons only',
    violet: 'electric violet and soft lavender accents on foreground subjects and icons only',
    inkPurple: 'ink purple and near-black violet accents on foreground subjects and icons only',
  };
  const accentHint = accentHints[variation.accent] ?? accentHints.purple;

  const gptOutput = gptImageSupportsApiTransparency(resolveImageModel());

  const parts: string[] = [
    'Generate one LinkedIn B2B poster hero image. Follow the Enterprise visual guidelines appended below.',
    `Layout hero style slot: ${heroStyle}.`,
    gptOutput
      ? 'Output mode: API transparent background (see §2.5 transparency rules in the guidelines).'
      : 'Output mode: flat white #FFFFFF background (see §2.5 white-background rules in the guidelines).',
  ];

  if (heroStyle === 'photorealHuman') {
    parts.push(
      `Infer mood from copy themes only (never spell as text): ${photorealHumanThematicLine(headline, sub)}`,
    );
  } else {
    const modality =
      heroStyle === 'stylizedIllustration' ? 'illustration' : inferHeroVisualModality(headline, sub);
    parts.push(modalityInstruction(modality));
    if (heroStyle === 'stylizedIllustration') {
      parts.push(
        'Apply stylizedIllustration rules in §3 and deliver a very high quality editorial illustration per §2.7 of the visual guidelines.'
      );
    }
    if (heroStyle === 'defaultAlt') {
      parts.push('Apply defaultAlt rules in §3 of the visual guidelines.');
    }
    parts.push(
      headline || sub
        ? abstractVisualCue(headline, sub, modality)
        : 'Infer trust and momentum for B2B insurance India; express as stylised non-human illustration or soft 3D—nothing readable as text.',
    );
  }

  parts.push(`Overall mood fits a ${theme} enterprise poster; ${accentHint}.`);

  return mergeImagePromptWithVisualGuidelines(parts.filter(Boolean).join(' '));
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
  const gptOutput = gptImageSupportsApiTransparency(model);

  const neighbour =
    args.prevVisualSummary && args.nextVisualSummary
      ? `Scene differentiation: do not echo the previous slide (${args.prevVisualSummary.slice(0, 140)}) or the next slide (${args.nextVisualSummary.slice(0, 140)}).`
      : args.prevVisualSummary
        ? `Previous slide was: ${args.prevVisualSummary.slice(0, 160)} — create a clearly different scene.`
        : args.nextVisualSummary
          ? `Next slide will be: ${args.nextVisualSummary.slice(0, 160)} — do not preview that scene here.`
        : '';

  const parts: string[] = [
    'Generate one LinkedIn carousel slide hero image. Follow the Enterprise visual guidelines appended below (especially §6).',
    `Slide ${x} of ${y}.`,
    gptOutput
      ? 'Output mode: API transparent background (see §2.5 transparency rules in the guidelines).'
      : 'Output mode: flat white #FFFFFF background (see §2.5 white-background rules in the guidelines).',
    `Story beat for this slide: ${args.planSlide.role}.`,
    `PRIMARY SCENE DIRECTION (follow closely): ${vd}`,
    `COMPOSITION FOR THIS SLIDE ONLY: ${comp}`,
    `This slide must be clearly different from every other slide in the set (see §6.2 uniqueness rules).`,
    brief ? `Campaign continuity (themes only, never as readable text): ${brief}` : '',
    neighbour,
    `Overall mood fits a ${args.theme} enterprise poster side panel.`,
  ];

  return mergeImagePromptWithVisualGuidelines(parts.filter(Boolean).join(' '));
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
 * OpenAI Images API — default **`gpt-image-2`** at **`quality: high`**. Native `background: transparent` is only sent for **`gpt-image-1`**, **`gpt-image-1-mini`**, and **`gpt-image-1.5`**; **`gpt-image-2`** uses opaque PNG + client white-key (see `finalizeHeroDataUrl`). Set `VITE_OPENAI_IMAGE_MODEL` to override (e.g. `dall-e-3`).
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
  const nativeTransparent = gpt && gptImageSupportsApiTransparency(model);
  const size = gpt ? gptImageSizeForFormat(args.format) : dalleSizeForFormat(args.format);

  const body: Record<string, unknown> = gpt
    ? {
        model,
        prompt: args.prompt,
        n: 1,
        size,
        quality: gptImagesApiQuality(model),
        output_format: 'png',
        ...(nativeTransparent ? { background: 'transparent' as const } : {}),
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
        usedNativeTransparency: nativeTransparent,
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
