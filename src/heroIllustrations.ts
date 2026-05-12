import { publicAsset } from './publicUrl';

/**
 * Hero library PNGs live under `public/illustrations/`.
 * Design source (Figma): file `pESkKqyO4qVH8a18Smg1IM` — frames **GMC** `80:208`, **Travel** `80:174`, **Credit** `80:148`
 * (section `83:215`). Re-export via Figma MCP `get_screenshot` and overwrite these files to refresh assets.
 */
export type HeroLibraryId = 'default' | 'gmc' | 'travel' | 'credit';

export type HeroLibraryEntry = {
  id: Exclude<HeroLibraryId, 'default'>;
  label: string;
  /** File under `public/` (PNG recommended). */
  file: string;
};

export const HERO_LIBRARY_ENTRIES: readonly HeroLibraryEntry[] = [
  { id: 'gmc', label: 'GMC', file: 'illustrations/hero-gmc.png' },
  { id: 'travel', label: 'Travel', file: 'illustrations/hero-travel.png' },
  { id: 'credit', label: 'Credit', file: 'illustrations/hero-credit.png' },
] as const;

export function heroLibraryAssetUrl(id: Exclude<HeroLibraryId, 'default'>): string {
  const row = HERO_LIBRARY_ENTRIES.find((e) => e.id === id);
  if (!row) {
    return '';
  }
  return publicAsset(row.file);
}
