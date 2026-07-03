import type { CSSProperties } from 'react';
import type { CreativeTheme } from './posterTypes';
import { hexWithAlpha } from './posterColorUtils';

export const BACKGROUND_PALETTE_COUNT = 5;
export const STYLE_PATTERN_COUNT = 5;

export const BACKGROUND_PALETTE_LABELS = [
  'Brand Violet',
  'Deep Indigo',
  'Midnight',
  'Berry Plum',
  'Ocean Blue',
] as const;

export const STYLE_PATTERN_LABELS = [
  'Solid',
  'Soft glow',
  'Dots',
  'Grid',
  'Aurora',
] as const;

/** Accent tint used for overlays on each palette (not poster copy accent). */
const PALETTE_TINT: Record<number, string> = {
  0: '#926FF3',
  1: '#6366F1',
  2: '#94A3B8',
  3: '#EC4899',
  4: '#38BDF8',
};

function clampPaletteId(id: number): number {
  return ((Math.floor(id) % BACKGROUND_PALETTE_COUNT) + BACKGROUND_PALETTE_COUNT) % BACKGROUND_PALETTE_COUNT;
}

function clampPatternId(id: number): number {
  return ((Math.floor(id) % STYLE_PATTERN_COUNT) + STYLE_PATTERN_COUNT) % STYLE_PATTERN_COUNT;
}

function paletteTint(gradientId: number): string {
  return PALETTE_TINT[clampPaletteId(gradientId)] ?? '#94A3B8';
}

function darkPaletteStacks(): string[] {
  return [
    `linear-gradient(145deg, #4E29BB 0%, #6D28D9 42%, #5B21B6 100%)`,
    `linear-gradient(160deg, #1E1B4B 0%, #312E81 48%, #1E1B4B 100%)`,
    `linear-gradient(180deg, #0B0D12 0%, #151922 52%, #07080A 100%)`,
    `linear-gradient(155deg, #3B0A2E 0%, #5C1A3E 45%, #2D0A22 100%)`,
    `linear-gradient(170deg, #0C1929 0%, #1E3A5F 50%, #0A1628 100%)`,
  ];
}

function lightPaletteStacks(): string[] {
  return [
    `linear-gradient(145deg, #FFFFFF 0%, #F5F0FF 55%, #EDE9FE 100%)`,
    `linear-gradient(160deg, #FFFFFF 0%, #F8FAFC 48%, #E2E8F0 100%)`,
    `linear-gradient(180deg, #FFFFFF 0%, #F4F4F5 55%, #E4E4E7 100%)`,
    `linear-gradient(155deg, #FFFFFF 0%, #FFF1F2 45%, #FFE4E6 100%)`,
    `linear-gradient(170deg, #FFFFFF 0%, #F0F9FF 50%, #E0F2FE 100%)`,
  ];
}

function paletteStack(theme: CreativeTheme, gradientId: number): string {
  const stacks = theme === 'dark' ? darkPaletteStacks() : lightPaletteStacks();
  return stacks[clampPaletteId(gradientId)]!;
}

function softGlowStop(theme: CreativeTheme, tint: string, gradientId: number): string {
  const g = clampPaletteId(gradientId);
  if (g === 2) {
    return theme === 'dark' ? 'rgba(248, 250, 252, 0.16)' : 'rgba(255, 255, 255, 0.92)';
  }
  return hexWithAlpha(tint, theme === 'dark' ? 0.28 : 0.2);
}

function auroraOverlay(theme: CreativeTheme, gradientId: number): string {
  const g = clampPaletteId(gradientId);
  const primary = paletteTint(g);
  const secondary = PALETTE_TINT[(g + 2) % BACKGROUND_PALETTE_COUNT] ?? '#94A3B8';
  const mist = theme === 'dark' ? 'rgba(226, 232, 240, 0.1)' : 'rgba(148, 163, 184, 0.14)';
  const a1 = hexWithAlpha(primary, theme === 'dark' ? 0.2 : 0.14);
  const a2 = hexWithAlpha(secondary, theme === 'dark' ? 0.16 : 0.11);
  return `radial-gradient(ellipse 45% 35% at 18% 28%, ${a1}, transparent 55%),
    radial-gradient(ellipse 40% 32% at 82% 72%, ${a2}, transparent 52%),
    radial-gradient(ellipse 50% 40% at 52% 48%, ${mist}, transparent 58%)`;
}

function stylePatternBackground(
  theme: CreativeTheme,
  tint: string,
  patternId: number,
  gradientId: number
): string | null {
  const p = clampPatternId(patternId);
  const line = theme === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15, 23, 42, 0.08)';
  const lineFine = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15, 23, 42, 0.06)';

  if (p === 0) {
    return null;
  }

  const gridGap = theme === 'dark' ? '28px' : '24px';
  const overlays: Record<number, string> = {
    1: `radial-gradient(ellipse 70% 55% at 50% 42%, ${softGlowStop(theme, tint, gradientId)}, transparent 62%)`,
    2: `radial-gradient(circle, ${lineFine} 1px, transparent 1px)`,
    3: `repeating-linear-gradient(0deg, ${line} 0px, ${line} 1px, transparent 1px, transparent ${gridGap}),
        repeating-linear-gradient(90deg, ${line} 0px, ${line} 1px, transparent 1px, transparent ${gridGap})`,
    4: auroraOverlay(theme, gradientId),
  };

  return overlays[p] ?? null;
}

/** Base canvas gradient only (workspace “Background” / color variations strip). */
export function posterGradientLayer(
  theme: CreativeTheme,
  _accent: string,
  gradientId = 0
): CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    pointerEvents: 'none',
    background: paletteStack(theme, gradientId),
  };
}

/** Pattern overlay on top of base palette (workspace “Style” / background style strip). */
export function posterStyleOverlayLayer(
  theme: CreativeTheme,
  accent: string,
  patternId = 0,
  gradientId = 0
): CSSProperties {
  const tint = gradientId != null ? paletteTint(gradientId) : accent;
  const overlay = stylePatternBackground(theme, tint, patternId, gradientId);
  if (!overlay) {
    return {
      position: 'absolute',
      inset: 0,
      zIndex: 0,
      pointerEvents: 'none',
      background: 'transparent',
    };
  }

  const p = clampPatternId(patternId);

  return {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    pointerEvents: 'none',
    background: overlay,
    backgroundSize: p === 2 ? (theme === 'dark' ? '14px 14px' : '12px 12px') : undefined,
    opacity: theme === 'dark' ? 0.98 : 1,
  };
}

/** Swatch preview for workspace pickers (no poster chrome). */
export function canvasSwatchBackground(
  theme: CreativeTheme,
  gradientId: number,
  patternId?: number
): CSSProperties {
  const base = paletteStack(theme, gradientId);
  const pattern =
    patternId != null
      ? stylePatternBackground(theme, paletteTint(gradientId), patternId, gradientId)
      : null;
  if (!pattern) {
    return { background: base };
  }
  const p = clampPatternId(patternId ?? 0);
  return {
    background: `${base}, ${pattern}`,
    backgroundSize: p === 2 ? (theme === 'dark' ? '14px 14px' : '12px 12px') : undefined,
  };
}

/** Resolve gradient + pattern ids from variation (legacy `backgroundStyleId` fallback). */
export function resolveBackgroundIds(variation: {
  backgroundGradientId?: number;
  stylePatternId?: number;
  backgroundStyleId?: number;
}): { gradientId: number; patternId: number } {
  if (variation.backgroundGradientId != null || variation.stylePatternId != null) {
    return {
      gradientId: clampPaletteId(variation.backgroundGradientId ?? 0),
      patternId: clampPatternId(variation.stylePatternId ?? 0),
    };
  }
  const legacy = variation.backgroundStyleId ?? 0;
  return { gradientId: clampPaletteId(legacy), patternId: clampPatternId(legacy) };
}
