export type LinkedInFormatId = 'landscape' | 'square' | 'vertical';

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
};

export type CreativeTheme = 'light' | 'dark';

export type AccentId = 'purple' | 'picton' | 'cerise';

export const ACCENTS: Record<AccentId, { label: string; color: string }> = {
  purple: { label: 'Crocus purple', color: '#4E29BB' },
  picton: { label: 'Picton blue', color: '#1EB7E7' },
  cerise: { label: 'Vivid cerise', color: '#EC5FAB' },
};

export type PosterContent = {
  overline: string;
  headline: string;
  subhead: string;
  cta: string;
  footnote: string;
  /** Comma- or space-separated; shown bottom-left on poster and in LinkedIn caption. */
  hashtags: string;
};

export type Variation = {
  id: string;
  label: string;
  accent: AccentId;
  /** 1–3 non-empty lines; always capped for poster layout. */
  headlineLines: string[];
  /** When true, headline uses uppercase + tracking tuned for all-caps. */
  headlineAllCaps?: boolean;
};
