import {
  assignRolesForSlideCount,
  mapCarouselPlanToPosterContents,
  parseCarouselPlanRow,
  synthesizeCarouselPlanFromPosterContents,
  type CarouselPlanSlide,
} from './carouselPlan';
import { clampCarouselSlideCount, type PosterContent, type PosterCopyRoute } from './posterTypes';

const OPENAI_CHAT_PATH = '/v1/chat/completions';

function openAiChatCompletionsUrl(): string {
  if (import.meta.env.DEV || import.meta.env.VITE_OPENAI_USE_DEV_PROXY === 'true') {
    return `/api/openai${OPENAI_CHAT_PATH}`;
  }
  return `https://api.openai.com${OPENAI_CHAT_PATH}`;
}

export type StudioContentFromPromptResult =
  | { ok: true; content: PosterContent }
  | { ok: false; message: string };

export type CarouselFromPromptResult =
  | { ok: true; plan: CarouselPlanSlide[]; slides: PosterContent[] }
  | { ok: false; message: string };

const SYSTEM = `You are a B2B marketing copywriter for ACKO for Business (India) LinkedIn social creatives.

STRICT — apply on **every** JSON response (no exceptions):
- **Headline** (root + every copy_routes row): must typeset to **exactly four** lines at large poster headline size. Not three, not five. No fifth wrap. **No** ellipsis, clipping, or UI truncation to hide overflow—write shorter copy if needed (~72–92 characters is usually safe; vary by word length).
- **Subhead** (root + every copy_routes row): must typeset to **exactly two** lines of body copy at poster subhead size. **Not** one line of tiny type, **not** three+ lines, **not** multi-paragraph “wall” text (that is **not** dozens of lines on a poster). **No** truncation/clipping in UI—tighten wording (~118–155 characters including spaces; one or two sentences).

Return ONLY a single JSON object (no markdown fences, no commentary) with these exact string keys:
overline, headline, subhead, cta, footnote, hashtags, copy_routes.

Rules:
- overline: short category line (e.g. Enterprise, Commercial insurance).
- headline: primary headline (plain language, no hashtags). Must match copy_routes[0].headline exactly.
- subhead: primary subhead. Must match copy_routes[0].subhead exactly.
- copy_routes: JSON array of **exactly four** objects, each { "headline": string, "subhead": string }.
  Each of the four rows is a **distinct copy angle** for the same campaign (different wording, not only line breaks).
  Every row must satisfy the STRICT headline (4 lines) and subhead (2 lines) rules above.
  No hashtags in headline or subhead fields.
- cta: one clear call to action (e.g. Talk to us about ACKO for Business).
- footnote: short legal-style line (e.g. Issued by ACKO. T&C apply.).
- hashtags: comma-separated topic tags suitable for LinkedIn (e.g. ACKO, Insurance, B2B).

Do not include JSON inside markdown code blocks. Output raw JSON only.`;

function stripJsonFences(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t);
  if (fence?.[1]) {
    return fence[1].trim();
  }
  return t;
}

function parseCopyRoutes(raw: Record<string, unknown>): PosterCopyRoute[] | undefined {
  const rawRoutes = raw.copy_routes ?? raw.copyRoutes;
  if (!Array.isArray(rawRoutes)) {
    return undefined;
  }
  const out: PosterCopyRoute[] = [];
  for (const el of rawRoutes) {
    if (!el || typeof el !== 'object') {
      continue;
    }
    const o = el as Record<string, unknown>;
    const headline = typeof o.headline === 'string' ? o.headline.replace(/\s+/g, ' ').trim() : '';
    const subhead = typeof o.subhead === 'string' ? o.subhead.replace(/\s+/g, ' ').trim() : '';
    if (!headline) {
      continue;
    }
    out.push({ headline, subhead });
  }
  return out.length > 0 ? out : undefined;
}

function normalizeContent(raw: Record<string, unknown>): PosterContent | null {
  const str = (k: string) => (typeof raw[k] === 'string' ? (raw[k] as string).trim() : '');
  const parsedRoutes = parseCopyRoutes(raw);
  const headline = str('headline') || parsedRoutes?.[0]?.headline || '';
  if (!headline) {
    return null;
  }
  const subhead = str('subhead') || parsedRoutes?.[0]?.subhead || '';
  const copyRoutes =
    parsedRoutes && parsedRoutes.length >= 4
      ? parsedRoutes.slice(0, 4)
      : parsedRoutes && parsedRoutes.length > 0
        ? parsedRoutes
        : undefined;

  return {
    overline: str('overline') || 'Enterprise',
    headline,
    subhead,
    cta: str('cta') || 'Talk to us about ACKO for Business',
    footnote: str('footnote') || 'Issued by ACKO. T&C apply.',
    hashtags: str('hashtags') || 'ACKO, Insurance, B2B',
    copyRoutes,
  };
}

/**
 * Uses OpenAI Chat Completions (JSON). Same key as GPT Image / DALL·E: VITE_OPENAI_API_KEY.
 * Dev uses Vite proxy /api/openai → api.openai.com (see vite.config.ts).
 */
export async function generatePosterContentFromPrompt(args: {
  apiKey: string;
  userPrompt: string;
}): Promise<StudioContentFromPromptResult> {
  const key = args.apiKey.trim();
  if (!key) {
    return {
      ok: false,
      message:
        'Missing OpenAI API key. Set VITE_OPENAI_API_KEY in .env.local and restart npm run dev.',
    };
  }
  const prompt = args.userPrompt.trim();
  if (!prompt) {
    return { ok: false, message: 'Enter a campaign prompt first.' };
  }

  try {
    const res = await fetch(openAiChatCompletionsUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: `Campaign brief / prompt:\n${prompt.slice(0, 8000)}`,
          },
        ],
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
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawContent = root.choices?.[0]?.message?.content;
    if (typeof rawContent !== 'string' || !rawContent.trim()) {
      return { ok: false, message: 'OpenAI returned no message content.' };
    }

    let data: unknown;
    try {
      data = JSON.parse(stripJsonFences(rawContent));
    } catch {
      return { ok: false, message: 'Model did not return valid JSON. Try again with a clearer brief.' };
    }

    if (typeof data !== 'object' || data === null) {
      return { ok: false, message: 'Invalid JSON shape from model.' };
    }

    const content = normalizeContent(data as Record<string, unknown>);
    if (!content) {
      return { ok: false, message: 'JSON missing a non-empty headline.' };
    }

    return { ok: true, content };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

function buildCarouselPlanSystem(slideCount: number): string {
  const roles = assignRolesForSlideCount(slideCount);
  const roleList = roles.join(', ');
  const flow = roles.join(' → ');
  return `You are a senior B2B creative strategist and copywriter for ACKO for Business (India) LinkedIn **carousel document** posts (one swipeable set of ${slideCount} square cards).

Return ONLY a single JSON object (no markdown fences, no commentary) with this exact shape:
{ "plan": [ /* exactly ${slideCount} objects — no more, no fewer */ ] }

The root object MUST use the key **plan** (not "slides"). Each object in "plan" MUST include these string keys:
- slide: integer 1..${slideCount} in order (row 1 has slide 1, … row ${slideCount} has slide ${slideCount})
- role: must be exactly one of: ${roleList} — in this order for rows 1..${slideCount}: ${flow}
- headline: main poster headline for this narrative beat (no hashtags). Must typeset to **exactly four** lines on the 1080×1080 carousel card at headline size—no fifth line, **no** UI truncation. **Hard max ~52 characters** (including spaces) so wrapping stays predictable; one tight phrase or two very short clauses max.
- copy: supporting body for this slide (becomes poster subhead). Must typeset to **exactly two** lines at subhead size—**no** third line, **no** paragraph wall, **no** UI truncation. **Hard max ~110 characters** (including spaces). One or two very short sentences only; no bullet characters.
- visual_direction: concrete **scene** for an illustrator—subjects, metaphors, setting. NO typography, NO logos, NO UI strings, NO letters. Must be **meaningfully different** on every slide: different focal object, metaphor, and environment—not the same scene with palette tweaks.
- composition: framing for **this slide only** (e.g. "asymmetrical, visual weight bottom-left", "centered single focal object with wide negative space"). Must **vary** across slides—do not repeat the same layout pattern.
- overline: short category line (e.g. Enterprise)
- cta: one line; the **last** row (slide ${slideCount}, role cta) must carry the strongest, most concrete action
- hashtags: comma-separated; may lightly repeat core tags

Set-level rules (critical — every generation):
- The full "plan" array is **one campaign story** read in order. Each slide advances the arc; do not paste the same headline or same core claim across slides.
- Every slide's **headline** and **copy** must obey the **four-line headline** and **two-line subhead** rules for the square poster card—no truncation tricks.
- visual_direction + composition together define a **unique** hero scene per slide while staying one premium B2B brand world.

Do not include JSON inside markdown code blocks. Output raw JSON only.`;
}

/**
 * V2 carousel: Step 1 — structured plan JSON; Step 2 (in App) maps plan to poster rows and generates images per \`visual_direction\`.
 */
export async function generateCarouselFromPrompt(args: {
  apiKey: string;
  userPrompt: string;
  slideCount: number;
}): Promise<CarouselFromPromptResult> {
  const key = args.apiKey.trim();
  if (!key) {
    return {
      ok: false,
      message:
        'Missing OpenAI API key. Set VITE_OPENAI_API_KEY in .env.local and restart npm run dev.',
    };
  }
  const prompt = args.userPrompt.trim();
  const slideCount = clampCarouselSlideCount(args.slideCount);
  if (!prompt) {
    return { ok: false, message: 'Enter a campaign prompt first.' };
  }

  try {
    const res = await fetch(openAiChatCompletionsUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.65,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildCarouselPlanSystem(slideCount) },
          {
            role: 'user',
            content: `Campaign brief / prompt:\n${prompt.slice(0, 8000)}\n\nProduce exactly ${slideCount} objects in the "plan" array — one cohesive LinkedIn carousel document. The array length must be exactly ${slideCount}.`,
          },
        ],
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
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawContent = root.choices?.[0]?.message?.content;
    if (typeof rawContent !== 'string' || !rawContent.trim()) {
      return { ok: false, message: 'OpenAI returned no message content.' };
    }

    let data: unknown;
    try {
      data = JSON.parse(stripJsonFences(rawContent));
    } catch {
      return { ok: false, message: 'Model did not return valid JSON. Try again with a clearer brief.' };
    }

    if (typeof data !== 'object' || data === null) {
      return { ok: false, message: 'Invalid JSON shape from model.' };
    }

    const expectedRoles = assignRolesForSlideCount(slideCount);

    let planRaw = (data as Record<string, unknown>).plan;
    if (!Array.isArray(planRaw) || planRaw.length !== slideCount) {
      const slidesRaw = (data as Record<string, unknown>).slides;
      if (Array.isArray(slidesRaw) && slidesRaw.length === slideCount) {
        const legacyPosterSlides: PosterContent[] = [];
        for (const item of slidesRaw) {
          if (typeof item !== 'object' || item === null) {
            legacyPosterSlides.length = 0;
            break;
          }
          const row = normalizeContent(item as Record<string, unknown>);
          if (!row) {
            legacyPosterSlides.length = 0;
            break;
          }
          legacyPosterSlides.push(row);
        }
        if (legacyPosterSlides.length === slideCount) {
          let plan = synthesizeCarouselPlanFromPosterContents(legacyPosterSlides, expectedRoles);
          for (let i = 0; i < plan.length; i++) {
            plan[i] = { ...plan[i], slide: i + 1, role: expectedRoles[i]! };
          }
          const slides = mapCarouselPlanToPosterContents(plan);
          return { ok: true, plan, slides };
        }
      }
    }

    if (!Array.isArray(planRaw)) {
      return {
        ok: false,
        message:
          'JSON missing a "plan" array (or wrong length). The model must return { "plan": [...] } with one row per slide, each including headline, copy (or subhead), visual_direction, and composition.',
      };
    }
    if (planRaw.length !== slideCount) {
      return {
        ok: false,
        message: `Expected exactly ${slideCount} rows in "plan"; got ${planRaw.length}. Click Generate again with the same or a clearer brief.`,
      };
    }

    const plan: CarouselPlanSlide[] = [];
    for (let i = 0; i < slideCount; i++) {
      const item = planRaw[i];
      if (typeof item !== 'object' || item === null) {
        return { ok: false, message: `Plan row ${i + 1} is not an object.` };
      }
      const row = parseCarouselPlanRow(item as Record<string, unknown>, i, expectedRoles[i]!, slideCount);
      if (!row) {
        return {
          ok: false,
          message: `Plan row ${i + 1} needs a non-empty headline (and ideally copy, visual_direction, composition). Try Generate again.`,
        };
      }
      plan.push(row);
    }

    plan.sort((a, b) => a.slide - b.slide);
    for (let i = 0; i < plan.length; i++) {
      plan[i] = { ...plan[i], slide: i + 1, role: expectedRoles[i]! };
    }

    const slides = mapCarouselPlanToPosterContents(plan);
    if (slides.length !== slideCount) {
      return { ok: false, message: 'Could not map carousel plan to poster slides.' };
    }

    return { ok: true, plan, slides };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}
