import { fitHeadlineLinesConservative, fitHeadlineLinesForPoster, type PosterHeadlineLayout } from './headlineLineFit';
import {
  BACKGROUND_PALETTE_LABELS,
  STYLE_PATTERN_LABELS as STYLE_PATTERN_LABELS_CANON,
} from './posterBackgroundLayers';
import type { AccentId, HeadlineTreatment, PosterContent, PosterCopyRoute, Variation } from './posterTypes';
import { ACCENTS } from './posterTypes';

const MAX_HEADLINE_LINES = 4;

function fitLines(lines: string[], layout?: PosterHeadlineLayout, allCaps?: boolean): string[] {
  if (layout) {
    return fitHeadlineLinesForPoster(lines, layout, { allCaps });
  }
  return fitHeadlineLinesConservative(lines, allCaps);
}

function wordsOf(headline: string): string[] {
  return headline.trim().split(/\s+/).filter(Boolean);
}

function splitTwoLines(words: string[], ratio: number): string[] {
  if (words.length === 0) {
    return ['Your headline'];
  }
  if (words.length === 1) {
    return [words[0]!];
  }
  const k = Math.max(1, Math.min(words.length - 1, Math.round(words.length * ratio)));
  return [words.slice(0, k).join(' '), words.slice(k).join(' ')];
}

function splitThreeLines(words: string[]): string[] {
  if (words.length === 0) {
    return ['Your headline'];
  }
  if (words.length === 1) {
    return [words[0]!];
  }
  if (words.length === 2) {
    return [words[0]!, words[1]!];
  }
  const a = Math.ceil(words.length / 3);
  const b = Math.ceil((words.length - a) / 2);
  const l1 = words.slice(0, a).join(' ');
  const l2 = words.slice(a, a + b).join(' ');
  const l3 = words.slice(a + b).join(' ');
  return [l1, l2, l3].filter((x) => x.length > 0);
}

function capLines(lines: string[], max: number): string[] {
  const out = lines.filter((l) => l.trim().length > 0);
  if (out.length <= max) {
    return out;
  }
  const head = out.slice(0, max - 1);
  const tail = out.slice(max - 1).join(' ');
  return [...head, tail];
}

function firstSentence(text: string): string {
  const t = text.trim();
  const dot = t.indexOf('.');
  if (dot === -1) {
    return t;
  }
  return t.slice(0, dot + 1).trim();
}

function variationCopy(
  content: PosterContent,
  index: number
): { displayOverline: string; displaySubhead: string; headlineTreatment: HeadlineTreatment } {
  const baseOv = content.overline.trim();
  const sub = content.subhead.trim();
  const first = firstSentence(sub);
  const treatments: HeadlineTreatment[] = [
    'none',
    'accentFirstLine',
    'accentLastWordFirstLine',
    'underlineSecondLine',
  ];
  const displayOv = baseOv;
  const subheads = [
    sub,
    sub ? `One thread: ${first}` : sub,
    sub ? `Now: ${first}` : sub,
    sub ? `${first}` : sub,
  ];
  return {
    displayOverline: displayOv,
    displaySubhead: subheads[index % subheads.length]!,
    headlineTreatment: treatments[index % treatments.length]!,
  };
}

export function buildVariations(content: PosterContent, layout?: PosterHeadlineLayout): Variation[] {
  const words = wordsOf(content.headline);
  const balanced2 = fitLines(capLines(splitTwoLines(words, 0.5), MAX_HEADLINE_LINES), layout);
  const modes: Array<{
    lines: string[];
    label: string;
    headlineAllCaps?: boolean;
  }> = [
    { lines: balanced2, label: '2 lines · balanced' },
    {
      lines: fitLines(capLines(splitTwoLines(words, 0.38), MAX_HEADLINE_LINES), layout),
      label: '2 lines · short / long',
    },
    {
      lines: fitLines(capLines(splitThreeLines(words), MAX_HEADLINE_LINES), layout),
      label: 'Up to 3 lines',
    },
    {
      lines: fitLines(capLines(splitTwoLines(words, 0.62), MAX_HEADLINE_LINES), layout),
      label: '2 lines · lead / tail',
    },
  ];

  const accentOrder: AccentId[] = ['purple', 'cerise', 'picton', 'violet'];
  const creativeNames = ['Bold', 'Minimal', 'Visual-heavy', 'Statement'] as const;
  return modes.map((m, i) => {
    const accent = accentOrder[i % accentOrder.length] ?? 'purple';
    const copy = variationCopy(content, i);
    return {
      id: `v${i + 1}-${accent}`,
      label: `${ACCENTS[accent].label} · ${m.label}`,
      creativeName: creativeNames[i] ?? creativeNames[0],
      accent,
      backgroundGradientId: 0,
      stylePatternId: 0,
      headlineLines: m.lines,
      headlineAllCaps: m.headlineAllCaps,
      displayOverline: copy.displayOverline,
      displaySubhead: copy.displaySubhead,
      headlineTreatment: copy.headlineTreatment,
    };
  });
}

const STRIP_ACCENT: AccentId = 'purple';

export function expandToFourCopyRoutes(content: PosterContent): PosterCopyRoute[] {
  const norm = (r: PosterCopyRoute): PosterCopyRoute => ({
    headline: r.headline.replace(/\s+/g, ' ').trim(),
    subhead: r.subhead.replace(/\s+/g, ' ').trim(),
  });

  const fromModel = (content.copyRoutes ?? []).filter((r) => r.headline.trim()).map(norm);
  if (fromModel.length >= 4) {
    return fromModel.slice(0, 4);
  }
  if (fromModel.length > 0) {
    const padded = [...fromModel];
    while (padded.length < 4) {
      padded.push({ ...padded[padded.length - 1]! });
    }
    return padded.slice(0, 4);
  }

  const h = content.headline.replace(/\s+/g, ' ').trim();
  const s = content.subhead.replace(/\s+/g, ' ').trim();
  const words = wordsOf(h);
  const mid = Math.max(1, Math.ceil(words.length / 2));
  const headA = words.slice(0, mid).join(' ');
  const headB = words.slice(mid).join(' ');
  const commaParts = h.split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean);
  const vc = [0, 1, 2, 3].map((i) => variationCopy(content, i));

  const headlines: string[] = [
    h,
    headB ? `${headB} — ${headA}` : headA || h,
    commaParts.length > 1 ? commaParts[1]! : headA || h,
    words.length > 3
      ? `${words.slice(-3).join(' ')}, ${words.slice(0, -3).join(' ')}`.trim()
      : words.length > 1
        ? `${words[words.length - 1]!}: ${words.slice(0, -1).join(' ')}`
        : h,
  ];

  return headlines.map((headline, i) => ({
    headline: headline || h,
    subhead: (vc[i]?.displaySubhead ?? s) || s,
  }));
}

/** Poster options row — copy / headline routes only. */
export function buildCopyVisualStrip(content: PosterContent, layout?: PosterHeadlineLayout): Variation[] {
  const routes = expandToFourCopyRoutes(content);
  return routes.map((route, i) => {
    const slice: PosterContent = {
      ...content,
      headline: route.headline,
      subhead: route.subhead,
      copyRoutes: undefined,
    };
    const v = buildVariations(slice, layout)[i]!;
    return {
      ...v,
      accent: STRIP_ACCENT,
      backgroundGradientId: 0,
      stylePatternId: 0,
      id: `copy-strip-${i}-${v.id}`,
    };
  });
}

export const BACKGROUND_GRADIENT_LABELS = BACKGROUND_PALETTE_LABELS;
export const STYLE_PATTERN_LABELS = STYLE_PATTERN_LABELS_CANON;

/** Design options — text / accent colour only (no hero or background change). */
export function buildDesignColorStrip(base: Variation): Variation[] {
  const accents: Array<{ accent: AccentId; name: string }> = [
    { accent: 'purple', name: 'Crocus' },
    { accent: 'cerise', name: 'Cerise' },
    { accent: 'picton', name: 'Picton' },
    { accent: 'violet', name: 'Violet' },
    { accent: 'deepPurple', name: 'Deep' },
    { accent: 'inkPurple', name: 'Ink' },
  ];
  return accents.map((spec, i) => ({
    ...base,
    accent: spec.accent,
    heroVisualStyle: base.heroVisualStyle ?? 'default',
    backgroundGradientId: base.backgroundGradientId ?? 0,
    stylePatternId: base.stylePatternId ?? 0,
    id: `design-color-${i}-${spec.accent}`,
    label: ACCENTS[spec.accent].label,
    creativeName: spec.name,
  }));
}

/** Background strip — base gradient canvas only. */
export function buildBackgroundGradientStrip(base: Variation): Variation[] {
  return BACKGROUND_GRADIENT_LABELS.map((label, i) => ({
    ...base,
    backgroundGradientId: i,
    id: `bg-gradient-${i}`,
    label,
    creativeName: label,
  }));
}

/** Style strip — light abstract / curvy pattern overlays. */
export function buildStylePatternStrip(base: Variation): Variation[] {
  return STYLE_PATTERN_LABELS.map((label, i) => ({
    ...base,
    stylePatternId: i,
    id: `style-pattern-${i}`,
    label,
    creativeName: label,
  }));
}

/** @deprecated Use `buildDesignColorStrip`. */
export const buildLayoutAccentStrip = buildDesignColorStrip;

/** @deprecated Use `buildBackgroundGradientStrip`. */
export const buildBackgroundStrip = buildBackgroundGradientStrip;

/** @deprecated */
export const BACKGROUND_PATTERN_LABELS = BACKGROUND_GRADIENT_LABELS;

/** Merge copy × design colour × background gradient × style pattern. */
export function mergePosterVariation(
  copyV: Variation,
  designV: Variation,
  gradientV?: Variation | null,
  styleV?: Variation | null
): Variation {
  const gradientId =
    gradientV?.backgroundGradientId ??
    designV.backgroundGradientId ??
    copyV.backgroundGradientId ??
    0;
  const patternId =
    styleV?.stylePatternId ?? designV.stylePatternId ?? copyV.stylePatternId ?? 0;
  return {
    ...copyV,
    accent: designV.accent,
    backgroundGradientId: gradientId,
    stylePatternId: patternId,
    backgroundStyleId: gradientId,
    heroVisualStyle: designV.heroVisualStyle ?? copyV.heroVisualStyle ?? 'default',
    id: `${copyV.id}__${designV.id}__g${gradientId}__s${patternId}`,
    label: `${copyV.creativeName ?? 'Creative'} · ${ACCENTS[designV.accent].label}`,
  };
}

export function mergeCopyAndLayoutVariation(copyV: Variation, layoutV: Variation): Variation {
  return mergePosterVariation(copyV, layoutV, null, null);
}
