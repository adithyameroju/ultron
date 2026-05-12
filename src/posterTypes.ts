export type LinkedInFormatId = 'landscape' | 'square' | 'vertical' | 'carousel';

/** V2 LinkedIn document carousel: user-chosen length (copy + export + heroes align to this count). */
export const CAROUSEL_SLIDE_COUNT = { min: 2, max: 7 } as const;

export function clampCarouselSlideCount(n: number): number {
  return Math.min(CAROUSEL_SLIDE_COUNT.max, Math.max(CAROUSEL_SLIDE_COUNT.min, Math.floor(n)));
}

export const LINKEDIN_FORMATS: Record<
  LinkedInFormatId,
  { label: string; width: number; height: number; hint: string }
> = {
  landscape: {
    label: 'LinkedIn landscape',
    width: 1200,
    height: 627,
    hint: '1.91:1 — link-style image',
  },
  square: {
    label: 'LinkedIn square',
    width: 1080,
    height: 1080,
    hint: '1:1 — feed',
  },
  vertical: {
    label: 'LinkedIn vertical',
    width: 1080,
    height: 1350,
    hint: '4:5 — more vertical space',
  },
  carousel: {
    label: 'LinkedIn carousel (document)',
    width: 1080,
    height: 1080,
    hint: `1:1 per slide — V2 only; ${CAROUSEL_SLIDE_COUNT.min}–${CAROUSEL_SLIDE_COUNT.max} slides in Content`,
  },
};

export type CreativeTheme = 'light' | 'dark';

/** ACKO palette accents used on headline treatments and hero slot glows (see `acko-tokens.css`). */
export type AccentId =
  | 'purple'
  | 'picton'
  | 'cerise'
  | 'deepPurple'
  | 'violet'
  | 'inkPurple';

export const ACCENTS: Record<AccentId, { label: string; color: string }> = {
  purple: { label: 'Crocus purple', color: '#4E29BB' },
  picton: { label: 'Picton blue', color: '#1EB7E7' },
  cerise: { label: 'Vivid cerise', color: '#EC5FAB' },
  deepPurple: { label: 'ACKO deep purple', color: '#2E1773' },
  violet: { label: 'Electric violet', color: '#926FF3' },
  inkPurple: { label: 'Ink purple', color: '#18084A' },
};

/** One headline + subhead pair for a non-carousel poster option (workspace strip). */
export type PosterCopyRoute = {
  headline: string;
  subhead: string;
};

export type PosterContent = {
  overline: string;
  headline: string;
  subhead: string;
  cta: string;
  footnote: string;
  /** Comma- or space-separated; shown bottom-left on poster and in LinkedIn caption. */
  hashtags: string;
  /**
   * Four distinct copy angles for the poster-options row. When omitted, routes are derived on the client
   * from headline + subhead (see `expandToFourCopyRoutes`).
   */
  copyRoutes?: PosterCopyRoute[];
};

/** Headline visual treatment per variation card. */
export type HeadlineTreatment =
  | 'none'
  | 'accentFirstLine'
  | 'accentLastWordFirstLine'
  | 'underlineSecondLine';

export type Variation = {
  id: string;
  label: string;
  /** Short marketing name for the variation card (e.g. Bold, Minimal). */
  creativeName?: string;
  accent: AccentId;
  /** Distinct premium canvas recipe (0–7) for export backgrounds per creative option. */
  backgroundStyleId?: number;
  /** 1–3 non-empty lines; always capped for poster layout. */
  headlineLines: string[];
  /** When true, headline uses uppercase + tracking tuned for all-caps. */
  headlineAllCaps?: boolean;
  /** Optional copy overrides for distinctly different poster variants. */
  displayOverline?: string;
  displaySubhead?: string;
  headlineTreatment?: HeadlineTreatment;
};
