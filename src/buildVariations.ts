import { fitHeadlineLinesConservative, fitHeadlineLinesForPoster, type PosterHeadlineLayout } from './headlineLineFit';
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

/** Two lines: first chunk uses ~`ratio` of the words. */
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

/** Up to three balanced lines (by word count). */
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
  /** Only the brief/model overline; no fabricated “tag” lines per card. */
  const displayOv = baseOv;
  /** Distinct subhead phrasing per poster option (length controlled at generation time). */
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
    {
      lines: balanced2,
      label: '2 lines · balanced',
    },
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

  /** One distinct ACKO accent per variation (no repeats in the default set of four). */
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
      backgroundStyleId: i % 8,
      headlineLines: m.lines,
      headlineAllCaps: m.headlineAllCaps,
      displayOverline: copy.displayOverline,
      displaySubhead: copy.displaySubhead,
      headlineTreatment: copy.headlineTreatment,
    };
  });
}

/** First workspace strip (non-carousel): emphasise copy / headline routes; unified accent + background. */
const STRIP_ACCENT: AccentId = 'purple';

/**
 * Four headline + subhead pairs for the poster-options row: prefers model `copyRoutes`, else pads partial
 * routes, else derives visibly different strings from the primary headline and subhead.
 */
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
      backgroundStyleId: 0,
      id: `copy-strip-${i}-${v.id}`,
    };
  });
}

/** Second strip: same copy as `base`, four accent + canvas recipes with four distinct AI hero paths (non-carousel only). */
export function buildLayoutAccentStrip(base: Variation): Variation[] {
  const accentOrder: AccentId[] = ['purple', 'cerise', 'picton', 'violet'];
  const heroStyles: Array<'default' | 'defaultAlt' | 'stylizedIllustration' | 'photorealHuman'> = [
    'default',
    'defaultAlt',
    'stylizedIllustration',
    'photorealHuman',
  ];
  return accentOrder.map((accent, i) => ({
    ...base,
    accent,
    backgroundStyleId: i % 8,
    heroVisualStyle: heroStyles[i],
    id: `layout-strip-${i}-${accent}-${heroStyles[i]}`,
    label:
      heroStyles[i] === 'photorealHuman'
        ? `${ACCENTS[accent].label} · photoreal hero`
        : heroStyles[i] === 'stylizedIllustration'
          ? `${ACCENTS[accent].label} · illustration hero`
          : heroStyles[i] === 'defaultAlt'
            ? `${ACCENTS[accent].label} · alt abstract hero`
            : `${ACCENTS[accent].label} · canvas ${(i % 8) + 1}`,
    creativeName: ACCENTS[accent].label.split(' ')[0] ?? ACCENTS[accent].label,
  }));
}

/** Single poster variation for export / preview: copy route × layout accent. */
export function mergeCopyAndLayoutVariation(copyV: Variation, layoutV: Variation): Variation {
  return {
    ...copyV,
    accent: layoutV.accent,
    backgroundStyleId: layoutV.backgroundStyleId,
    heroVisualStyle: layoutV.heroVisualStyle ?? 'default',
    id: `${copyV.id}__${layoutV.id}`,
    label: `${copyV.creativeName ?? 'Creative'} · ${ACCENTS[layoutV.accent].label}`,
  };
}
