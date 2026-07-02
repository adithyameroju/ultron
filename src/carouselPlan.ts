import { normalizePosterCta } from './posterCopyClamp';
import { clampCarouselSlideCount, type PosterContent } from './posterTypes';

/** Narrative beat for one carousel card (order is chosen by `assignRolesForSlideCount`). */
export type CarouselSlideRole =
  | 'hook'
  | 'problem'
  | 'insight'
  | 'solution'
  | 'benefits'
  | 'proof'
  | 'cta';

/** Step-1 structured plan for one slide (copy + art direction for image gen). */
export type CarouselPlanSlide = {
  slide: number;
  role: CarouselSlideRole;
  headline: string;
  /** Supporting body copy (maps to poster `subhead`). */
  copy: string;
  /** Scene and subject for GPT Image — must differ per slide; no typography. */
  visual_direction: string;
  /** Layout / framing for this slide only (e.g. centered vs asymmetrical). */
  composition: string;
  overline?: string;
  cta: string;
  hashtags: string;
};

/**
 * Maps slide count 2–7 to a story sequence (hook → … → cta).
 * Not every beat appears when N &lt; 7; last slide is always `cta`.
 */
export function assignRolesForSlideCount(n: number): CarouselSlideRole[] {
  const c = clampCarouselSlideCount(n);
  switch (c) {
    case 2:
      return ['hook', 'cta'];
    case 3:
      return ['hook', 'insight', 'cta'];
    case 4:
      return ['hook', 'problem', 'solution', 'cta'];
    case 5:
      return ['hook', 'problem', 'insight', 'solution', 'cta'];
    case 6:
      return ['hook', 'problem', 'insight', 'solution', 'benefits', 'cta'];
    case 7:
    default:
      return ['hook', 'problem', 'insight', 'solution', 'benefits', 'proof', 'cta'];
  }
}

function strField(raw: Record<string, unknown>, key: string): string {
  return typeof raw[key] === 'string' ? (raw[key] as string).trim() : '';
}

/**
 * Normalise one plan row from model JSON. Coerces `role` to the expected beat for this index.
 */
export function parseCarouselPlanRow(
  raw: Record<string, unknown>,
  index0: number,
  expectedRole: CarouselSlideRole,
  totalSlides: number
): CarouselPlanSlide | null {
  const headline = strField(raw, 'headline');
  const copy =
    strField(raw, 'copy') ||
    strField(raw, 'subhead') ||
    strField(raw, 'supporting_copy') ||
    strField(raw, 'body');
  let visual =
    strField(raw, 'visual_direction') ||
    strField(raw, 'visualDirection') ||
    strField(raw, 'visual');
  let composition =
    strField(raw, 'composition') ||
    strField(raw, 'composition_direction') ||
    strField(raw, 'compositionDirection');
  if (!headline) {
    return null;
  }
  if (!visual) {
    visual = `Premium abstract B2B insurance illustration for the "${expectedRole}" narrative beat. Infer one clear non-literal metaphor from the headline theme only—no text, no logos, no UI. Distinct focal subject from other slides in the same carousel.`;
  }
  if (!composition) {
    composition =
      index0 % 2 === 0
        ? 'Centered focal cluster with generous breathing room and soft depth.'
        : 'Asymmetrical layout with diagonal visual flow and varied negative space.';
  }
  let slideNum = index0 + 1;
  if (typeof raw.slide === 'number' && Number.isFinite(raw.slide)) {
    slideNum = Math.min(totalSlides, Math.max(1, Math.floor(raw.slide)));
  } else {
    const s = strField(raw, 'slide');
    if (s) {
      const p = Number.parseInt(s, 10);
      if (Number.isFinite(p)) {
        slideNum = Math.min(totalSlides, Math.max(1, p));
      }
    }
  }
  return {
    slide: slideNum,
    role: expectedRole,
    headline,
    copy: copy || headline,
    visual_direction: visual,
    composition,
    overline: strField(raw, 'overline') || undefined,
    cta: normalizePosterCta(strField(raw, 'cta') || 'Talk to us about ACKO for Business'),
    hashtags: strField(raw, 'hashtags') || 'ACKO, Insurance, B2B',
  };
}

/**
 * When the model returns legacy poster rows (`slides` with headline/subhead only), build a minimal
 * plan so image generation still gets per-slide `visual_direction` / `composition`.
 */
export function synthesizeCarouselPlanFromPosterContents(
  slides: PosterContent[],
  expectedRoles: CarouselSlideRole[]
): CarouselPlanSlide[] {
  return slides.map((s, i) => ({
    slide: i + 1,
    role: expectedRoles[i] ?? 'cta',
    headline: s.headline,
    copy: s.subhead.trim() ? s.subhead : s.headline,
    visual_direction: `Premium abstract B2B insurance scene for "${expectedRoles[i] ?? 'cta'}" beat: express the idea behind the headline in one distinct metaphor—no text, no logos, no readable words. Headline theme (do not render as type): ${s.headline.slice(0, 120)}.`,
    composition:
      i % 2 === 0
        ? 'Centered focal object with wide negative space and soft depth.'
        : 'Asymmetrical composition with diagonal tension and off-center focal mass.',
    overline: s.overline.trim() || undefined,
    cta: normalizePosterCta(s.cta.trim() || 'Talk to us about ACKO for Business'),
    hashtags: s.hashtags.trim() || 'ACKO, Insurance, B2B',
  }));
}

/** Map ordered plan to `PosterContent[]` for `PosterCard` / caption. */
export function mapCarouselPlanToPosterContents(plan: CarouselPlanSlide[]): PosterContent[] {
  const total = plan.length;
  return plan.map((p, i) => ({
    overline: (p.overline ?? 'Enterprise').trim() || 'Enterprise',
    headline: p.headline.trim(),
    subhead: p.copy.replace(/\s+/g, ' ').trim(),
    cta: normalizePosterCta(p.cta.trim() || 'Talk to us about ACKO for Business'),
    footnote: `Slide ${i + 1} of ${total} · Issued by ACKO. T&C apply.`,
    hashtags: p.hashtags.trim() || 'ACKO, Insurance, B2B',
  }));
}
