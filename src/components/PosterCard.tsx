import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import type {
  CreativeTheme,
  HeadlineTreatment,
  LinkedInFormatId,
  PosterContent,
  Variation,
} from '../posterTypes';
import { ACCENTS, LINKEDIN_FORMATS } from '../posterTypes';
import {
  posterGradientLayer,
  posterStyleOverlayLayer,
  resolveBackgroundIds,
} from '../posterBackgroundLayers';
import { hexWithAlpha } from '../posterColorUtils';
import { fitHeadlineLinesForPoster, type PosterHeadlineLayout } from '../headlineLineFit';
import {
  POSTER_FONTS,
  type PosterTypeSizes,
  typeSquare,
  typeLandscape,
  typeVertical,
  typeCarousel,
} from '../posterTypography';
import { normalizePosterCta } from '../posterCopyClamp';
import { HeroShieldVisual } from './HeroShieldVisual';
import { publicAsset } from '../publicUrl';

/** Poster logos — strict spec: `.cursor/rules/acko-poster-logo-strict.mdc` (do not change paths or logoStyle without user approval). */
const LOGO_FOR_DARK_BG = publicAsset('acko-for-business-on-dark.png');
const LOGO_FOR_LIGHT_BG = publicAsset('acko-for-business-light-creative.png');

const PAD_PX = 80;
/** Tighter frame on 1:1; paired with SQUARE type scale and hero band. */
const PAD_PX_SQUARE = 58;
/** Share of content height for text+hero row on 1:1 (optical centre vs logo). */
const SQUARE_HERO_BAND_FR = 0.9;
const LEFT_COL_FR = 0.6;
const RIGHT_COL_FR = 0.4;
/** Space under the ACKO logo so raster heroes are not covered (scaled with poster type). */
const LOGO_HERO_TOP_GAP = 18;

function posterLogoSrc(theme: CreativeTheme): string {
  return theme === 'light' ? LOGO_FOR_LIGHT_BG : LOGO_FOR_DARK_BG;
}

type Props = {
  format: LinkedInFormatId;
  theme: CreativeTheme;
  content: PosterContent;
  variation: Variation;
  /** When false, hero shield is hidden and the text block sits left-to-centre (not edge-pinned). */
  includeVisual?: boolean;
  /** Raster or URL hero image. When set, replaces the default shield visual. */
  heroImageUrl?: string | null;
  /** Overlay while AI image request is in flight. */
  heroImageLoading?: boolean;
  /** Library artwork uses `contain` to preserve aspect ratio; AI uses `contain` + poster-matched slot. */
  heroImageObjectFit?: 'cover' | 'contain';
  /** When true, hero slot uses the same gradient family as the poster so AI art (contain) blends at edges. */
  heroMatchPosterBackdrop?: boolean;
  /** LinkedIn carousel: small “current / total” pill on the canvas. */
  slidePager?: { current: number; total: number };
};

/** When no hero visual: text block width as fraction of content area, centred (copy stays left-aligned). */
const TEXT_ONLY_MAX_WIDTH = '86%';

function formatHashtagsForPoster(raw: string): string {
  return raw
    .split(/[,\s]+/)
    .map((t) => t.replace(/^#/, '').trim())
    .filter(Boolean)
    .map((t) => `#${t}`)
    .join('  ');
}

const logoStyle = (h: number, theme: CreativeTheme): CSSProperties => ({
  height: `${h}px`,
  width: 'auto',
  objectFit: 'contain',
  display: 'block',
  /** Light mark is RGBA PNG only — no baked backdrop; subtle lift on pale gradients. */
  filter:
    theme === 'light' ? 'drop-shadow(0 1px 2px rgba(46, 23, 115, 0.14))' : undefined,
});

function heroSlotMergedBackdrop(theme: CreativeTheme, accent: string): string {
  if (theme === 'dark') {
    return [
      `linear-gradient(168deg, #0a0418 0%, #12082a 28%, #18084a 62%, #0f0620 100%)`,
      `radial-gradient(ellipse 90% 70% at 100% 45%, ${hexWithAlpha(accent, 0.12)}, transparent 55%)`,
    ].join(', ');
  }
  return [
    `linear-gradient(168deg, #ffffff 0%, #f8f7fd 45%, #ecebff 100%)`,
    `radial-gradient(ellipse 85% 65% at 100% 40%, ${hexWithAlpha(accent, 0.1)}, transparent 50%)`,
  ].join(', ');
}

const headlineRowStyle: CSSProperties = {
  display: 'block',
  whiteSpace: 'nowrap',
};

function headlineLineNodes(
  lines: string[],
  treatment: HeadlineTreatment,
  accent: string,
  headlineColor: string
): ReactNode {
  if (treatment === 'none') {
    return lines.map((line, i) => (
      <span key={i} style={headlineRowStyle}>
        {line}
      </span>
    ));
  }
  if (treatment === 'accentFirstLine') {
    return lines.map((line, i) => (
      <span key={i} style={{ ...headlineRowStyle, color: i === 0 ? accent : headlineColor }}>
        {line}
      </span>
    ));
  }
  if (treatment === 'accentLastWordFirstLine') {
    return lines.map((line, i) => (
      <span key={i} style={headlineRowStyle}>
        {i === 0 ? lastWordAccentFragment(line, accent, headlineColor) : line}
      </span>
    ));
  }
  return lines.map((line, i) => (
    <span
      key={i}
      style={{
        ...headlineRowStyle,
        color: headlineColor,
        textDecoration: i === 1 ? 'underline' : undefined,
        textDecorationColor: i === 1 ? accent : undefined,
        textDecorationThickness: i === 1 ? '0.09em' : undefined,
        textUnderlineOffset: i === 1 ? '0.14em' : undefined,
      }}
    >
      {line}
    </span>
  ));
}

function lastWordAccentFragment(line: string, accent: string, base: string): ReactNode {
  const words = line.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return line;
  }
  if (words.length === 1) {
    return <span style={{ color: accent }}>{words[0]}</span>;
  }
  const last = words[words.length - 1]!;
  const rest = words.slice(0, -1).join(' ');
  return (
    <>
      <span style={{ color: base }}>{rest} </span>
      <span style={{ color: accent }}>{last}</span>
    </>
  );
}

function HeroSlot({
  accent,
  theme,
  heroImageUrl,
  heroImageLoading,
  heroImageObjectFit = 'cover',
  matchPosterBackdrop = false,
}: {
  accent: string;
  theme: CreativeTheme;
  heroImageUrl?: string | null;
  heroImageLoading?: boolean;
  heroImageObjectFit?: 'cover' | 'contain';
  matchPosterBackdrop?: boolean;
}) {
  const fit = heroImageObjectFit;
  const slotBg =
    heroImageUrl && matchPosterBackdrop ? heroSlotMergedBackdrop(theme, accent) : undefined;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 10,
        overflow: 'hidden',
        background: slotBg ?? 'transparent',
      }}
    >
      {heroImageUrl ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={heroImageUrl}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: fit,
              objectPosition: 'center',
              display: 'block',
            }}
          />
        </div>
      ) : (
        <HeroShieldVisual accent={accent} theme={theme} />
      )}
      {heroImageLoading ? (
        <div
          className="poster-hero-slot-loading"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(4, 8, 22, 0.52)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            fontFamily: POSTER_FONTS.family,
            fontSize: 12,
            letterSpacing: '0.14em',
            color: 'rgba(0, 255, 240, 0.92)',
          }}
          aria-busy
        >
          <span className="poster-hero-slot-loading__shimmer" aria-hidden />
          <span style={{ position: 'relative', zIndex: 1 }}>Generating visual…</span>
        </div>
      ) : null}
    </div>
  );
}

function ctaTextColor(theme: CreativeTheme): string {
  if (theme === 'light') {
    return '#2E1773';
  }
  return 'rgba(220, 205, 255, 0.95)';
}

function slidePagerPill(
  slidePager: { current: number; total: number } | undefined,
  pad: number,
  scale: number,
  theme: CreativeTheme
): ReactNode {
  if (!slidePager || slidePager.total < 2) {
    return null;
  }
  const fs = Math.max(10, 11 * scale);
  return (
    <div
      style={{
        position: 'absolute',
        right: pad,
        bottom: Math.max(14, 16 * scale),
        zIndex: 4,
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          padding: `${5 * scale}px ${11 * scale}px`,
          borderRadius: 999,
          fontSize: fs,
          fontWeight: 700,
          letterSpacing: '0.06em',
          fontFamily: POSTER_FONTS.family,
          color: theme === 'dark' ? 'rgba(230,240,255,0.95)' : '#2E1773',
          background: theme === 'dark' ? 'rgba(4,8,22,0.78)' : 'rgba(255,255,255,0.9)',
          border:
            theme === 'dark' ? '1px solid rgba(0,255,240,0.28)' : '1px solid rgba(46,23,115,0.22)',
          boxShadow: '0 4px 18px rgba(0,0,0,0.28)',
        }}
      >
        {slidePager.current} / {slidePager.total}
      </span>
    </div>
  );
}

function PosterBackgroundLayers({
  theme,
  accent,
  variation,
}: {
  theme: CreativeTheme;
  accent: string;
  variation: Variation;
}) {
  const { gradientId, patternId } = resolveBackgroundIds(variation);
  const layerBase: CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  };
  return (
    <>
      <div style={{ ...layerBase, zIndex: 0, ...posterGradientLayer(theme, accent, gradientId) }} />
      <div style={{ ...layerBase, zIndex: 0, ...posterStyleOverlayLayer(theme, accent, patternId, gradientId) }} />
    </>
  );
}

function posterTextBlocks(
  t: PosterTypeSizes,
  content: PosterContent,
  variation: Variation,
  theme: CreativeTheme,
  accent: string,
  tagLine: string,
  headlineStyle: CSSProperties,
  options: {
    overlineLetterSpacing: string;
    centerPaddingY: number;
    subheadMarginTop: number;
    /** When set, clamps subhead lines (legacy; prefer omit so full copy shows). */
    subheadLineClamp?: number;
    /** Hard cap on wrapped headline rows (legacy; prefer omit so full copy shows). */
    headlineLineClamp?: number;
    footnoteBlockPaddingTop: number;
    footnoteGap: number;
    /** Headline body colour (theme main text). */
    headlineColor: string;
    /** 1:1 — one stacked block, vertically centred; avoids empty bands above/below. */
    layout?: 'default' | 'squareStack';
    /** Gap between stacked items in squareStack (px at scale). */
    stackGap?: number;
    /** CTA container: rounded chip vs square tile (static 1:1 only uses square). */
    ctaShape?: 'pill' | 'square';
    headlineLayout: PosterHeadlineLayout;
  }
): ReactNode {
  const {
    overlineLetterSpacing,
    centerPaddingY,
    subheadMarginTop,
    subheadLineClamp,
    headlineLineClamp,
    footnoteBlockPaddingTop,
    footnoteGap,
    headlineColor,
    layout = 'default',
    stackGap: stackGapOpt,
    ctaShape = 'pill',
    headlineLayout,
  } = options;
  const textMuted = theme === 'dark' ? 'rgba(210, 200, 255, 0.78)' : '#5D5D5D';
  const gap = stackGapOpt ?? 11 * t.s;
  const overlineText = variation.displayOverline ?? content.overline;
  const subheadText = variation.displaySubhead ?? content.subhead;
  const headlineTreatment = variation.headlineTreatment ?? 'none';
  const headlineLines = fitHeadlineLinesForPoster(variation.headlineLines, headlineLayout, {
    allCaps: variation.headlineAllCaps,
  });
  const headlineBlockStyle: CSSProperties = { ...headlineStyle };
  if (headlineLineClamp != null) {
    headlineBlockStyle.display = '-webkit-box';
    headlineBlockStyle.WebkitLineClamp = headlineLineClamp;
    headlineBlockStyle.WebkitBoxOrient = 'vertical';
    headlineBlockStyle.overflow = 'hidden';
    headlineBlockStyle.wordBreak = 'break-word';
    headlineBlockStyle.paddingBottom = `${8 * t.s}px`;
    delete headlineBlockStyle.textWrap;
  }

  const subheadBoxStyle = (marginTopPx: number): CSSProperties => {
    const base: CSSProperties = {
      margin: `${marginTopPx}px 0 0`,
      fontSize: t.subhead,
      lineHeight: 1.45,
      fontWeight: POSTER_FONTS.subhead,
      color: textMuted,
      maxWidth: '100%',
    };
    if (subheadLineClamp != null) {
      return {
        ...base,
        display: '-webkit-box',
        WebkitLineClamp: subheadLineClamp,
        WebkitBoxOrient: 'vertical' as const,
        overflow: 'hidden',
      };
    }
    return { ...base, overflow: 'visible' };
  };

  if (layout === 'squareStack') {
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap,
            width: '100%',
          }}
        >
          {overlineText ? (
            <p
              style={{
                margin: 0,
                fontSize: t.overline,
                fontWeight: POSTER_FONTS.overline,
                letterSpacing: overlineLetterSpacing,
                color: accent,
                textTransform: 'uppercase',
              }}
            >
              {overlineText}
            </p>
          ) : null}
          <h1 style={headlineBlockStyle}>
            {headlineLineNodes(headlineLines, headlineTreatment, accent, headlineColor)}
          </h1>
          {subheadText ? (
            <p style={subheadBoxStyle(8 * t.s)}>{subheadText}</p>
          ) : null}
          {content.cta ? ctaBlock(content.cta, t, theme, accent, { stacked: true, shape: ctaShape }) : null}
          {content.footnote ? (
            <p
              style={{
                margin: 0,
                fontSize: t.footnote,
                lineHeight: 1.4,
                color: textMuted,
                fontWeight: POSTER_FONTS.footnote,
              }}
            >
              {content.footnote}
            </p>
          ) : null}
          {tagLine ? (
            <p
              style={{
                margin: 0,
                fontSize: t.hashtag,
                fontWeight: POSTER_FONTS.hashtag,
                letterSpacing: '0.04em',
                color: theme === 'dark' ? 'rgba(160, 150, 200, 0.75)' : '#4E29BB',
              }}
            >
              {tagLine}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ flexShrink: 0 }}>
        {overlineText ? (
          <p
            style={{
              margin: 0,
              fontSize: t.overline,
              fontWeight: POSTER_FONTS.overline,
              letterSpacing: overlineLetterSpacing,
              color: accent,
              textTransform: 'uppercase',
            }}
          >
            {overlineText}
          </p>
        ) : null}
      </div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: 0,
          paddingTop: centerPaddingY * t.s,
          paddingBottom: centerPaddingY * t.s,
        }}
      >
        <h1 style={headlineBlockStyle}>
          {headlineLineNodes(headlineLines, headlineTreatment, accent, headlineColor)}
        </h1>
        {subheadText ? (
          <p style={subheadBoxStyle(subheadMarginTop * t.s)}>{subheadText}</p>
        ) : null}
        {content.cta ? ctaBlock(content.cta, t, theme, accent, { shape: ctaShape }) : null}
      </div>
      <div style={{ flexShrink: 0, paddingTop: footnoteBlockPaddingTop * t.s }}>
        {content.footnote ? (
          <p
            style={{
              margin: 0,
              fontSize: t.footnote,
              lineHeight: 1.4,
              color: textMuted,
              fontWeight: POSTER_FONTS.footnote,
            }}
          >
            {content.footnote}
          </p>
        ) : null}
        {tagLine ? (
          <p
            style={{
              margin: content.footnote ? `${footnoteGap * t.s}px 0 0` : 0,
              fontSize: t.hashtag,
              fontWeight: POSTER_FONTS.hashtag,
              letterSpacing: '0.04em',
              color: theme === 'dark' ? 'rgba(160, 150, 200, 0.75)' : '#4E29BB',
            }}
          >
            {tagLine}
          </p>
        ) : null}
      </div>
    </>
  );
}

function ctaBlock(
  cta: string,
  t: { cta: number; s: number },
  theme: CreativeTheme,
  accent: string,
  opts?: { stacked?: boolean; shape?: 'pill' | 'square' }
): ReactNode {
  const stacked = opts?.stacked ?? false;
  const shape = opts?.shape ?? 'pill';
  const line = normalizePosterCta(cta);
  const border = hexWithAlpha(accent, theme === 'dark' ? 0.48 : 0.38);
  const fill = hexWithAlpha(accent, theme === 'dark' ? 0.18 : 0.12);
  const ctaPx = t.cta * 1.08;
  const shadow =
    theme === 'dark'
      ? `0 1px 0 rgba(0,0,0,0.35), inset 0 1px 0 ${hexWithAlpha('#ffffff', 0.08)}`
      : `0 2px 8px rgba(78, 41, 187, 0.12), inset 0 1px 0 ${hexWithAlpha('#ffffff', 0.65)}`;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        alignSelf: 'flex-start',
        maxWidth: '100%',
        boxSizing: 'border-box',
        marginTop: stacked ? 0 : 12 * t.s,
        padding: `${7 * t.s}px ${16 * t.s}px`,
        borderRadius: shape === 'pill' ? 9999 : 5 * t.s,
        border: `1px solid ${border}`,
        background: `linear-gradient(180deg, ${hexWithAlpha(accent, theme === 'dark' ? 0.22 : 0.16)} 0%, ${fill} 100%)`,
        boxShadow: shadow,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: ctaPx,
          fontWeight: 600,
          letterSpacing: '0.03em',
          color: ctaTextColor(theme),
          lineHeight: 1.2,
        }}
      >
        {line}
      </p>
    </div>
  );
}

function landscapeLayout(
  w: number,
  h: number,
  content: PosterContent,
  variation: Variation,
  theme: CreativeTheme,
  includeVisual: boolean,
  heroImageUrl?: string | null,
  heroImageLoading?: boolean,
  heroImageObjectFit: 'cover' | 'contain' = 'cover',
  heroMatchPosterBackdrop = false,
  slidePager?: { current: number; total: number }
) {
  const t = typeLandscape(w);
  const pad = PAD_PX * t.s;
  const textMain = theme === 'dark' ? '#FFFFFF' : '#0A0A0A';
  const accent = ACCENTS[variation.accent].color;
  const tagLine = formatHashtagsForPoster(content.hashtags);
  const logoH = 28 * t.s;
  const heroLogoReserveY = heroImageUrl ? logoH + LOGO_HERO_TOP_GAP * t.s : 0;

  const headlineStyle: CSSProperties = {
    margin: 0,
    fontSize: t.headline,
    lineHeight: 1.12,
    fontWeight: POSTER_FONTS.headline,
    color: textMain,
    letterSpacing: '-0.02em',
    maxWidth: '100%',
    fontFamily: POSTER_FONTS.family,
  };
  if (theme === 'dark') {
    headlineStyle.textShadow = '0 1px 0 rgba(0,0,0,0.25)';
  }
  if (variation.headlineAllCaps) {
    headlineStyle.textTransform = 'uppercase';
    headlineStyle.letterSpacing = '0.04em';
  }

  const textOptions = {
    overlineLetterSpacing: '0.12em',
    centerPaddingY: 4,
    subheadMarginTop: 22,
    footnoteBlockPaddingTop: 8,
    footnoteGap: 6,
    headlineColor: textMain,
    ctaShape: 'pill' as const,
    headlineLayout: { format: 'landscape' as const, includeVisual },
  } as const;

  const textInner = posterTextBlocks(
    t,
    content,
    variation,
    theme,
    accent,
    tagLine,
    headlineStyle,
    textOptions
  );

  return (
    <div
      style={{
        width: w,
        height: h,
        position: 'relative',
        fontFamily: POSTER_FONTS.family,
        overflow: 'hidden',
        textAlign: 'left',
      }}
    >
      <PosterBackgroundLayers theme={theme} accent={accent} variation={variation} />
      <div
        style={{
          position: 'absolute',
          right: pad,
          top: pad,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <img src={posterLogoSrc(theme)} alt="" style={logoStyle(logoH, theme)} />
      </div>
      {includeVisual ? (
        <div
          style={{
            position: 'absolute',
            left: pad,
            right: pad,
            top: pad,
            bottom: pad,
            zIndex: 1,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: `${LEFT_COL_FR * 100}%`,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minWidth: 0,
              paddingRight: 12 * t.s,
              boxSizing: 'border-box',
            }}
          >
            {textInner}
          </div>
          <div
            style={{
              width: `${RIGHT_COL_FR * 100}%`,
              height: '100%',
              position: 'relative',
              minWidth: 0,
              flexShrink: 0,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: heroLogoReserveY,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            >
              <HeroSlot
                accent={accent}
                theme={theme}
                heroImageUrl={heroImageUrl}
                heroImageLoading={heroImageLoading}
                heroImageObjectFit={heroImageObjectFit}
                matchPosterBackdrop={heroMatchPosterBackdrop}
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            left: pad,
            right: pad,
            top: pad,
            bottom: pad,
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: TEXT_ONLY_MAX_WIDTH,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minWidth: 0,
              boxSizing: 'border-box',
            }}
          >
            {textInner}
          </div>
        </div>
      )}
      {slidePagerPill(slidePager, pad, t.s, theme)}
    </div>
  );
}

function squareOrVertical(
  format: 'square' | 'vertical',
  w: number,
  h: number,
  content: PosterContent,
  variation: Variation,
  theme: CreativeTheme,
  includeVisual: boolean,
  heroImageUrl?: string | null,
  heroImageLoading?: boolean,
  heroImageObjectFit: 'cover' | 'contain' = 'cover',
  heroMatchPosterBackdrop = false,
  slidePager?: { current: number; total: number },
  isCarouselSurface = false
) {
  const t =
    format === 'vertical' ? typeVertical(w) : isCarouselSurface ? typeCarousel(w) : typeSquare(w);
  const pad = (format === 'square' ? PAD_PX_SQUARE : PAD_PX) * t.s;
  const textMain = theme === 'dark' ? '#FFFFFF' : '#0A0A0A';
  const accent = ACCENTS[variation.accent].color;
  const tagLine = formatHashtagsForPoster(content.hashtags);
  const logoH = 26 * t.s;
  const heroLogoReserveY = heroImageUrl ? logoH + LOGO_HERO_TOP_GAP * t.s : 0;
  const isSquareTight = format === 'square';

  const headlineStyle: CSSProperties = {
    margin: 0,
    fontSize: t.headline,
    lineHeight: 1.12,
    fontWeight: POSTER_FONTS.headline,
    color: textMain,
    letterSpacing: '-0.02em',
    fontFamily: POSTER_FONTS.family,
  };
  if (theme === 'dark') {
    headlineStyle.textShadow = '0 1px 0 rgba(0,0,0,0.25)';
  }
  if (variation.headlineAllCaps) {
    headlineStyle.textTransform = 'uppercase';
    headlineStyle.letterSpacing = '0.04em';
  }

  const ctaShape: 'pill' | 'square' = format === 'square' && !isCarouselSurface ? 'square' : 'pill';
  const headlineLayout: PosterHeadlineLayout = isCarouselSurface
    ? { format: 'carousel', includeVisual }
    : { format, includeVisual };
  const textOptions = {
    overlineLetterSpacing: '0.1em',
    centerPaddingY: 4,
    subheadMarginTop: 20,
    footnoteBlockPaddingTop: 6,
    footnoteGap: 4,
    headlineColor: textMain,
    layout: (isSquareTight ? 'squareStack' : 'default') as 'default' | 'squareStack',
    stackGap: isSquareTight ? 9 * t.s : undefined,
    ctaShape,
    headlineLayout,
  } as const;

  const textInner = posterTextBlocks(
    t,
    content,
    variation,
    theme,
    accent,
    tagLine,
    headlineStyle,
    textOptions
  );

  const textColumnChild = (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        ...(format === 'vertical' ? { justifyContent: 'center' as const } : {}),
      }}
    >
      {textInner}
    </div>
  );

  const contentAreaH = h - 2 * pad;
  const squareHeroBandH =
    format === 'square' && includeVisual ? contentAreaH * SQUARE_HERO_BAND_FR : undefined;

  return (
    <div
      style={{
        width: w,
        height: h,
        position: 'relative',
        fontFamily: POSTER_FONTS.family,
        overflow: 'hidden',
        textAlign: 'left',
      }}
    >
      <PosterBackgroundLayers theme={theme} accent={accent} variation={variation} />
      <div
        style={{
          position: 'absolute',
          right: pad,
          top: pad,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <img src={posterLogoSrc(theme)} alt="" style={logoStyle(logoH, theme)} />
      </div>
      {includeVisual ? (
        <div
          style={{
            position: 'absolute',
            left: pad,
            right: pad,
            top: pad,
            bottom: pad,
            zIndex: 1,
            display: 'flex',
            flexDirection: 'row',
            alignItems: squareHeroBandH != null ? 'center' : 'stretch',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: `${LEFT_COL_FR * 100}%`,
              height: squareHeroBandH ?? '100%',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              paddingRight: 10 * t.s,
              boxSizing: 'border-box',
            }}
          >
            {textColumnChild}
          </div>
          <div
            style={{
              width: `${RIGHT_COL_FR * 100}%`,
              height: squareHeroBandH ?? '100%',
              position: 'relative',
              minWidth: 0,
              minHeight: 0,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: heroLogoReserveY,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            >
              <HeroSlot
                accent={accent}
                theme={theme}
                heroImageUrl={heroImageUrl}
                heroImageLoading={heroImageLoading}
                heroImageObjectFit={heroImageObjectFit}
                matchPosterBackdrop={heroMatchPosterBackdrop}
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            left: pad,
            right: pad,
            top: pad,
            bottom: pad,
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: TEXT_ONLY_MAX_WIDTH,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minWidth: 0,
              boxSizing: 'border-box',
            }}
          >
            {isSquareTight ? (
              <div
                style={{
                  width: '100%',
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {textInner}
              </div>
            ) : (
              textInner
            )}
          </div>
        </div>
      )}
      {slidePagerPill(slidePager, pad, t.s, theme)}
    </div>
  );
}

export const PosterCard = forwardRef<HTMLDivElement, Props>(function PosterCard(
  {
    format,
    theme,
    content,
    variation,
    includeVisual = true,
    heroImageUrl = null,
    heroImageLoading = false,
    heroImageObjectFit = 'cover',
    heroMatchPosterBackdrop = false,
    slidePager,
  },
  ref
) {
  const { width, height } = LINKEDIN_FORMATS[format];
  if (format === 'landscape') {
    return (
      <div ref={ref} style={{ width, height, lineHeight: 1 }}>
        {landscapeLayout(
          width,
          height,
          content,
          variation,
          theme,
          includeVisual,
          heroImageUrl,
          heroImageLoading,
          heroImageObjectFit,
          heroMatchPosterBackdrop,
          slidePager
        )}
      </div>
    );
  }
  const innerFormat: 'square' | 'vertical' = format === 'vertical' ? 'vertical' : 'square';
  return (
    <div ref={ref} style={{ width, height, lineHeight: 1 }}>
      {squareOrVertical(
        innerFormat,
        width,
        height,
        content,
        variation,
        theme,
        includeVisual,
        heroImageUrl,
        heroImageLoading,
        heroImageObjectFit,
        heroMatchPosterBackdrop,
        slidePager,
        format === 'carousel'
      )}
    </div>
  );
});
