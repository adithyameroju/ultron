import type { PosterHeroVisualStyle } from './posterTypes';

/** Hero visual styles for AI/static hero deck — independent of design colour strip. */
export const STATIC_HERO_STYLES: readonly PosterHeroVisualStyle[] = [
  'default',
  'defaultAlt',
  'stylizedIllustration',
  'photorealHuman',
] as const;

export function staticHeroSlotKey(copyIdx: number, style: PosterHeroVisualStyle): string {
  return `${copyIdx}:${style}`;
}

export function hasAnyStaticHeroForCopy(
  map: Record<string, string>,
  copyIdx: number,
  styles: readonly PosterHeroVisualStyle[] = STATIC_HERO_STYLES
): boolean {
  return styles.some((s) => Boolean(map[staticHeroSlotKey(copyIdx, s)]));
}
