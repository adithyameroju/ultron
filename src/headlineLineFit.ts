import { POSTER_FONTS, typeLandscape, typeCarousel, typeSquare, typeVertical } from './posterTypography';
import type { LinkedInFormatId } from './posterTypes';
import { LINKEDIN_FORMATS } from './posterTypes';

const MAX_HEADLINE_LINES = 4;
const LEFT_COL_FR = 0.6;
const PAD_LANDSCAPE = 80;
const PAD_SQUARE = 58;
const COL_PAD_LANDSCAPE = 12;
const COL_PAD_SQUARE = 10;
const TEXT_ONLY_MAX_FR = 0.86;

/** Approximate glyph width when canvas is unavailable (SSR / tests). */
const CHAR_WIDTH_EM = 0.52;

let measureCanvas: HTMLCanvasElement | null = null;

function measureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') {
    return null;
  }
  measureCanvas ??= document.createElement('canvas');
  return measureCanvas.getContext('2d');
}

/** CSS font shorthand for canvas.measureText (letter-spacing / uppercase not applied by canvas). */
export function posterHeadlineMeasureFont(headlinePx: number): string {
  return `${POSTER_FONTS.headline} ${headlinePx}px ${POSTER_FONTS.family}`;
}

function headlinePxAtDesign(format: LinkedInFormatId | 'carousel'): number {
  const fmt: LinkedInFormatId = format === 'carousel' ? 'square' : format;
  const w = LINKEDIN_FORMATS[fmt].width;
  if (fmt === 'landscape') {
    return typeLandscape(w).headline;
  }
  if (fmt === 'vertical') {
    return typeVertical(w).headline;
  }
  if (format === 'carousel') {
    return typeCarousel(w).headline;
  }
  return typeSquare(w).headline;
}

/** Max headline line width in px at design scale (matches PosterCard two-column / text-only). */
export function posterHeadlineMaxWidthPx(
  format: LinkedInFormatId | 'carousel',
  includeVisual: boolean
): number {
  const fmt: LinkedInFormatId = format === 'carousel' ? 'square' : format;
  const w = LINKEDIN_FORMATS[fmt].width;
  const pad = fmt === 'square' && format !== 'carousel' ? PAD_SQUARE : PAD_LANDSCAPE;
  const colPad = fmt === 'square' && format !== 'carousel' ? COL_PAD_SQUARE : COL_PAD_LANDSCAPE;
  const contentW = w - 2 * pad;
  if (!includeVisual) {
    return contentW * TEXT_ONLY_MAX_FR;
  }
  return contentW * LEFT_COL_FR - colPad;
}

export function measureHeadlineTextWidth(text: string, measureFont: string): number {
  const ctx = measureCtx();
  if (!ctx) {
    const sizeMatch = measureFont.match(/(\d+(?:\.\d+)?)px/);
    const size = sizeMatch ? Number(sizeMatch[1]) : 64;
    return text.length * size * CHAR_WIDTH_EM;
  }
  ctx.font = measureFont;
  return ctx.measureText(text).width;
}

function reflowWordsToLines(
  words: string[],
  maxLines: number,
  maxWidth: number,
  measure: (s: string) => number
): string[] {
  if (words.length === 0) {
    return ['Your headline'];
  }

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (measure(test) <= maxWidth) {
      current = test;
      continue;
    }
    if (current) {
      lines.push(current);
      current = word;
    } else {
      lines.push(word);
      current = '';
    }
  }
  if (current) {
    lines.push(current);
  }

  while (lines.length > maxLines) {
    const last = lines.pop()!;
    lines[lines.length - 1] = `${lines[lines.length - 1]!} ${last}`;
  }

  const splitWideLine = (line: string): string[] => {
    if (measure(line) <= maxWidth) {
      return [line];
    }
    const parts = line.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) {
      return [line];
    }
    const out: string[] = [];
    let cur = '';
    for (const w of parts) {
      const t = cur ? `${cur} ${w}` : w;
      if (measure(t) <= maxWidth) {
        cur = t;
      } else {
        if (cur) {
          out.push(cur);
        }
        cur = w;
      }
    }
    if (cur) {
      out.push(cur);
    }
    return out.length ? out : [line];
  };

  let expanded: string[] = [];
  for (const line of lines) {
    expanded.push(...splitWideLine(line));
  }

  while (expanded.length > maxLines) {
    const last = expanded.pop()!;
    expanded[expanded.length - 1] = `${expanded[expanded.length - 1]!} ${last}`;
  }

  return expanded.slice(0, maxLines);
}

export type PosterHeadlineLayout = {
  format: LinkedInFormatId | 'carousel';
  includeVisual: boolean;
};

/**
 * Reflows headline copy so each array entry fits one visual row at export typography
 * (no extra wraps from long merged lines or `text-wrap: balance`).
 */
export function fitHeadlineLinesForPoster(
  lines: string[],
  layout: PosterHeadlineLayout,
  opts?: { maxLines?: number; allCaps?: boolean }
): string[] {
  const maxLines = opts?.maxLines ?? MAX_HEADLINE_LINES;
  const words = lines
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const headlinePx = headlinePxAtDesign(layout.format);
  const measureFont = posterHeadlineMeasureFont(headlinePx);
  const maxWidth = posterHeadlineMaxWidthPx(layout.format, layout.includeVisual);
  const measure = (s: string) => measureHeadlineTextWidth(s, measureFont);
  return reflowWordsToLines(words, maxLines, maxWidth, measure);
}

/** Tightest two-column text column (square + hero) — safe default when format is unknown. */
export function fitHeadlineLinesConservative(lines: string[], allCaps?: boolean): string[] {
  return fitHeadlineLinesForPoster(
    lines,
    { format: 'square', includeVisual: true },
    { allCaps }
  );
}
