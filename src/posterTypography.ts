/**
 * Single source of truth for poster type scale. Sizes are in px at the design
 * width; multiply by s = actualWidth / designWidth for export.
 * Headline : subhead ≈ 4 : 1 (reference B2B creative).
 */
export const DESIGN = {
  landscape: 1200,
  square: 1080,
} as const;

type Step = {
  /** Headline font size in px at design width. */
  headline: number;
  /** Subhead = headline * ratio. */
  subheadFromHeadline: number;
  overline: number;
  /** CTA = headline * ratio. */
  ctaFromHeadline: number;
  ctaBar: number;
  footnote: number;
  hashtag: number;
};

const LANDSCAPE: Step = {
  /** Larger hero headline (reference: dominant type, 2–3 lines). */
  headline: 64,
  subheadFromHeadline: 0.25,
  overline: 11,
  ctaFromHeadline: 0.34,
  ctaBar: 3,
  footnote: 10,
  hashtag: 8.5,
};

const SQUARE: Step = {
  /** Balanced with 40% hero band on 1:1 — fill frame without top/bottom gaps. */
  headline: 66,
  subheadFromHeadline: 0.25,
  overline: 10,
  ctaFromHeadline: 0.34,
  ctaBar: 3,
  footnote: 9,
  hashtag: 8,
};

const VERTICAL: Step = {
  headline: 54,
  subheadFromHeadline: 0.25,
  overline: 10,
  ctaFromHeadline: 0.34,
  ctaBar: 3,
  footnote: 9,
  hashtag: 7.5,
};

export type PosterTypeSizes = {
  s: number;
  headline: number;
  subhead: number;
  overline: number;
  cta: number;
  ctaBar: number;
  footnote: number;
  hashtag: number;
};

function step(actualW: number, designW: number, st: Step): PosterTypeSizes {
  const s = actualW / designW;
  const headline = st.headline * s;
  return {
    s,
    headline,
    subhead: headline * st.subheadFromHeadline,
    overline: st.overline * s,
    cta: headline * st.ctaFromHeadline,
    ctaBar: st.ctaBar * s,
    footnote: st.footnote * s,
    hashtag: st.hashtag * s,
  };
}

export function typeLandscape(w: number): PosterTypeSizes {
  return step(w, DESIGN.landscape, LANDSCAPE);
}

export function typeSquare(w: number): PosterTypeSizes {
  return step(w, DESIGN.square, SQUARE);
}

export function typeVertical(w: number): PosterTypeSizes {
  return step(w, DESIGN.square, VERTICAL);
}

export const POSTER_FONTS = {
  family: "'Euclid Circular B', sans-serif",
  headline: 700,
  subhead: 300,
  overline: 600,
  cta: 500,
  footnote: 400,
  hashtag: 500,
} as const;
