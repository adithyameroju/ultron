import { Fragment, forwardRef, type CSSProperties, type ReactNode } from 'react';
import type { CreativeTheme, LinkedInFormatId, PosterContent, Variation } from '../posterTypes';
import { ACCENTS, LINKEDIN_FORMATS } from '../posterTypes';
import { hexWithAlpha } from '../posterColorUtils';
import {
  POSTER_FONTS,
  type PosterTypeSizes,
  typeSquare,
  typeLandscape,
  typeVertical,
} from '../posterTypography';
import { HeroShieldVisual } from './HeroShieldVisual';
import { publicAsset } from '../publicUrl';

const LOGO_FOR_DARK_BG = publicAsset('acko-for-business-on-dark.png');

const PAD_PX = 80;
/** Tighter frame on 1:1; paired with SQUARE type scale and hero band. */
const PAD_PX_SQUARE = 58;
/** Share of content height for text+hero row on 1:1 (optical centre vs logo). */
const SQUARE_HERO_BAND_FR = 0.9;
const LEFT_COL_FR = 0.6;
const RIGHT_COL_FR = 0.4;

type Props = {
  format: LinkedInFormatId;
  theme: CreativeTheme;
  content: PosterContent;
  variation: Variation;
  /** When false, hero shield is hidden and the text block sits left-to-centre (not edge-pinned). */
  includeVisual?: boolean;
  /** AI-generated hero image (data URL). When set, replaces the default shield visual. */
  heroImageUrl?: string | null;
  /** Overlay while AI image request is in flight. */
  heroImageLoading?: boolean;
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

const logoStyle = (theme: CreativeTheme, h: number): CSSProperties => ({
  height: `${h}px`,
  width: 'auto',
  objectFit: 'contain',
  filter: theme === 'light' ? 'brightness(0)' : undefined,
});

function HeroSlot({
  accent,
  theme,
  heroImageUrl,
  heroImageLoading,
}: {
  accent: string;
  theme: CreativeTheme;
  heroImageUrl?: string | null;
  heroImageLoading?: boolean;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {heroImageUrl ? (
        <img
          src={heroImageUrl}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
          }}
        />
      ) : (
        <HeroShieldVisual accent={accent} theme={theme} />
      )}
      {heroImageLoading ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(4, 8, 22, 0.55)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            fontFamily: POSTER_FONTS.family,
            fontSize: 12,
            letterSpacing: '0.14em',
            color: 'rgba(0, 255, 240, 0.92)',
          }}
          aria-busy
        >
          Generating visual…
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

function premiumBackground(theme: CreativeTheme, accent: string): CSSProperties {
  if (theme === 'dark') {
    return {
      position: 'absolute',
      inset: 0,
      zIndex: 0,
      pointerEvents: 'none',
      background: [
        `linear-gradient(168deg, #0a0418 0%, #12082a 22%, #18084a 55%, #0f0620 100%)`,
        `radial-gradient(ellipse 90% 70% at 100% 45%, ${hexWithAlpha(accent, 0.1)}, transparent 55%)`,
        `repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 40px)`,
        `repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 40px)`,
      ].join(', '),
    };
  }
  return {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    pointerEvents: 'none',
    background: [
      `linear-gradient(168deg, #ffffff 0%, #f8f7fd 40%, #ecebff 100%)`,
      `radial-gradient(ellipse 85% 65% at 100% 40%, ${hexWithAlpha(accent, 0.08)}, transparent 50%)`,
      `repeating-linear-gradient(0deg, rgba(15,0,50,0.04) 0px, rgba(15,0,50,0.04) 1px, transparent 1px, transparent 40px)`,
    ].join(', '),
  };
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
    subheadLineClamp: number;
    footnoteBlockPaddingTop: number;
    footnoteGap: number;
    /** 1:1 — one stacked block, vertically centred; avoids empty bands above/below. */
    layout?: 'default' | 'squareStack';
    /** Gap between stacked items in squareStack (px at scale). */
    stackGap?: number;
  }
): ReactNode {
  const {
    overlineLetterSpacing,
    centerPaddingY,
    subheadMarginTop,
    subheadLineClamp,
    footnoteBlockPaddingTop,
    footnoteGap,
    layout = 'default',
    stackGap: stackGapOpt,
  } = options;
  const textMuted = theme === 'dark' ? 'rgba(210, 200, 255, 0.78)' : '#5D5D5D';
  const gap = stackGapOpt ?? 11 * t.s;

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
          {content.overline ? (
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
              {content.overline}
            </p>
          ) : null}
          <h1 style={headlineStyle}>
            {variation.headlineLines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 ? <br /> : null}
                {line}
              </Fragment>
            ))}
          </h1>
          {content.subhead ? (
            <p
              style={{
                margin: 0,
                fontSize: t.subhead,
                lineHeight: 1.45,
                fontWeight: POSTER_FONTS.subhead,
                color: textMuted,
                maxWidth: '100%',
                display: '-webkit-box',
                WebkitLineClamp: subheadLineClamp,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
              }}
            >
              {content.subhead}
            </p>
          ) : null}
          {content.cta ? ctaBlock(content.cta, t, theme, accent, { stacked: true }) : null}
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
        {content.overline ? (
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
            {content.overline}
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
        <h1 style={headlineStyle}>
          {variation.headlineLines.map((line, i) => (
            <Fragment key={i}>
              {i > 0 ? <br /> : null}
              {line}
            </Fragment>
          ))}
        </h1>
        {content.subhead ? (
          <p
            style={{
              margin: `${subheadMarginTop * t.s}px 0 0`,
              fontSize: t.subhead,
              lineHeight: 1.45,
              fontWeight: POSTER_FONTS.subhead,
              color: textMuted,
              maxWidth: '100%',
              display: '-webkit-box',
              WebkitLineClamp: subheadLineClamp,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }}
          >
            {content.subhead}
          </p>
        ) : null}
        {content.cta ? ctaBlock(content.cta, t, theme, accent) : null}
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
  t: { cta: number; ctaBar: number; s: number },
  theme: CreativeTheme,
  accent: string,
  opts?: { stacked?: boolean }
): ReactNode {
  const stacked = opts?.stacked ?? false;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10 * t.s,
        marginTop: stacked ? 0 : 16 * t.s,
      }}
    >
      <div
        style={{
          width: t.ctaBar,
          minHeight: Math.max(14 * t.s, t.cta * 1.1),
          background: accent,
          borderRadius: 1,
          flexShrink: 0,
        }}
      />
      <p
        style={{
          margin: 0,
          fontSize: t.cta,
          fontWeight: POSTER_FONTS.cta,
          color: ctaTextColor(theme),
          lineHeight: 1.3,
        }}
      >
        {cta}
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
  heroImageLoading?: boolean
) {
  const t = typeLandscape(w);
  const pad = PAD_PX * t.s;
  const textMain = theme === 'dark' ? '#FFFFFF' : '#0A0A0A';
  const accent = ACCENTS[variation.accent].color;
  const tagLine = formatHashtagsForPoster(content.hashtags);
  const logoH = 28 * t.s;

  const headlineStyle: CSSProperties = {
    margin: 0,
    fontSize: t.headline,
    lineHeight: 1.05,
    fontWeight: POSTER_FONTS.headline,
    color: textMain,
    letterSpacing: '-0.02em',
    textWrap: 'balance' as const,
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
    centerPaddingY: 8,
    subheadMarginTop: 14,
    subheadLineClamp: 4,
    footnoteBlockPaddingTop: 8,
    footnoteGap: 6,
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
      <div style={premiumBackground(theme, accent)} />
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
        <img src={LOGO_FOR_DARK_BG} alt="" style={logoStyle(theme, logoH)} />
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
            }}
          >
            <HeroSlot
              accent={accent}
              theme={theme}
              heroImageUrl={heroImageUrl}
              heroImageLoading={heroImageLoading}
            />
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
              justifyContent: 'space-between',
              minWidth: 0,
              boxSizing: 'border-box',
            }}
          >
            {textInner}
          </div>
        </div>
      )}
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
  heroImageLoading?: boolean
) {
  const t = format === 'vertical' ? typeVertical(w) : typeSquare(w);
  const pad = (format === 'square' ? PAD_PX_SQUARE : PAD_PX) * t.s;
  const textMain = theme === 'dark' ? '#FFFFFF' : '#0A0A0A';
  const accent = ACCENTS[variation.accent].color;
  const tagLine = formatHashtagsForPoster(content.hashtags);
  const logoH = 26 * t.s;
  const isSquareTight = format === 'square';

  const headlineStyle: CSSProperties = {
    margin: 0,
    fontSize: t.headline,
    lineHeight: 1.05,
    fontWeight: POSTER_FONTS.headline,
    color: textMain,
    letterSpacing: '-0.02em',
    textWrap: 'balance' as const,
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
    overlineLetterSpacing: '0.1em',
    centerPaddingY: format === 'vertical' ? 6 : 8,
    subheadMarginTop: 12,
    subheadLineClamp: 5,
    footnoteBlockPaddingTop: 6,
    footnoteGap: 4,
    layout: (isSquareTight ? 'squareStack' : 'default') as 'default' | 'squareStack',
    stackGap: isSquareTight ? 9 * t.s : undefined,
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
        ...(format === 'vertical' ? { justifyContent: 'space-between' as const } : {}),
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
      <div style={premiumBackground(theme, accent)} />
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
        <img src={LOGO_FOR_DARK_BG} alt="" style={logoStyle(theme, logoH)} />
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
            }}
          >
            <HeroSlot
              accent={accent}
              theme={theme}
              heroImageUrl={heroImageUrl}
              heroImageLoading={heroImageLoading}
            />
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
              justifyContent: isSquareTight ? 'center' : 'space-between',
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
          heroImageLoading
        )}
      </div>
    );
  }
  return (
    <div ref={ref} style={{ width, height, lineHeight: 1 }}>
      {squareOrVertical(
        format,
        width,
        height,
        content,
        variation,
        theme,
        includeVisual,
        heroImageUrl,
        heroImageLoading
      )}
    </div>
  );
});
