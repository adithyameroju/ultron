import { useId } from 'react';
import type { CreativeTheme } from '../posterTypes';
import { adjustHexBrightness, hexWithAlpha } from '../posterColorUtils';

type Props = {
  accent: string;
  theme: CreativeTheme;
};

/**
 * Always-on hero visual: shield + check, premium B2B look. Accent-tinted; replaces generic blobs.
 */
export function HeroShieldVisual({ accent, theme }: Props) {
  const baseId = useId().replace(/:/g, '');

  const strokeGlow = theme === 'dark' ? hexWithAlpha(accent, 0.85) : adjustHexBrightness(accent, 0.85);
  const fillTop = adjustHexBrightness(accent, 0.55);
  const fillBot = adjustHexBrightness(accent, 0.35);
  const check = theme === 'dark' ? '#C4B4FF' : adjustHexBrightness(accent, 1.15);
  const arc = hexWithAlpha(accent, theme === 'dark' ? 0.12 : 0.1);
  const floorGlow = hexWithAlpha(accent, theme === 'dark' ? 0.35 : 0.2);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <svg
        viewBox="0 0 220 240"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
        aria-hidden
      >
        <defs>
          <linearGradient id={`${baseId}-shield`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={fillTop} />
            <stop offset="100%" stopColor={fillBot} />
          </linearGradient>
          <filter id={`${baseId}-blur`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
            </feMerge>
          </filter>
          <filter id={`${baseId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="g" />
            <feMerge>
              <feMergeNode in="g" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse cx="110" cy="210" rx="55" ry="10" fill={floorGlow} opacity={0.9} />

        <g opacity={0.5}>
          <circle cx="110" cy="120" r="90" fill="none" stroke={arc} strokeWidth="0.6" />
          <circle cx="110" cy="120" r="72" fill="none" stroke={arc} strokeWidth="0.4" />
          <circle cx="110" cy="120" r="54" fill="none" stroke={arc} strokeWidth="0.35" />
        </g>

        <path
          d="M110 12 L198 45 L198 118 C198 170 150 210 110 222 C70 210 22 170 22 118 L22 45 Z"
          fill={`url(#${baseId}-shield)`}
          stroke={strokeGlow}
          strokeWidth="2.4"
          filter={theme === 'dark' ? `url(#${baseId}-glow)` : undefined}
        />

        <path
          d="M 72 120 L 98 148 L 160 80"
          fill="none"
          stroke={check}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 72 120 L 98 148 L 160 80"
          fill="none"
          stroke={check}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.35"
          filter={`url(#${baseId}-blur)`}
        />
      </svg>
    </div>
  );
}
