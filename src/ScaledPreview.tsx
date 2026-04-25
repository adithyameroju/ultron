import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { LINKEDIN_FORMATS, type LinkedInFormatId } from './posterTypes';

const DEFAULT_MAX_W = 280;

type Props = {
  format: LinkedInFormatId;
  children: ReactNode;
  /** Max width in CSS px for the outer preview box; scales the poster to fit. */
  maxWidth?: number;
  className?: string;
};

export function ScaledPreview({
  format,
  children,
  maxWidth = DEFAULT_MAX_W,
  className = '',
}: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(0.2);

  const measure = () => {
    const el = outerRef.current;
    if (!el) {
      return;
    }
    const w = LINKEDIN_FORMATS[format].width;
    setS(el.clientWidth / w);
  };

  useLayoutEffect(() => {
    measure();
    const el = outerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      return;
    }
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [format, maxWidth]);

  const { width, height } = LINKEDIN_FORMATS[format];
  const scale = s || 0.2;
  const ratioClass =
    format === 'landscape' ? '' : format === 'square' ? 'ratio-1-1' : 'ratio-4-5';

  const cap =
    format === 'landscape' ? maxWidth : Math.min(maxWidth, Math.round(maxWidth * 1.15));

  return (
    <div
      ref={outerRef}
      className={`scaled-outer ${ratioClass} ${className}`.trim()}
      style={{ maxWidth: cap, width: '100%' }}
    >
      <div
        className="scaled-inner"
        style={{
          transform: `scale(${scale})`,
          width,
          height,
        }}
      >
        {children}
      </div>
    </div>
  );
}

const LIGHTBOX_CAP = 1000;

type LightboxScaledProps = {
  format: LinkedInFormatId;
  children: ReactNode;
  /** Class on the measurement box (should fill the gallery canvas; use lightbox-fit from App.css). */
  className?: string;
};

/**
 * Scales a poster to fit the lightbox: uses both width and height of the
 * parent so tall formats (e.g. 1080×1080) do not require scrolling.
 */
export function LightboxScaledPreview({ format, children, className = '' }: LightboxScaledProps) {
  const fitRef = useRef<HTMLDivElement>(null);
  const [maxWidth, setMaxWidth] = useState(LIGHTBOX_CAP);

  useLayoutEffect(() => {
    const el = fitRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      return;
    }
    const { width: designW, height: designH } = LINKEDIN_FORMATS[format];
    const update = () => {
      const W = el.clientWidth;
      const H = el.clientHeight;
      if (W < 1 || H < 1) {
        return;
      }
      // Outer width s.t. s·designW ≤ W and s·designH ≤ H, with s = outerW / designW.
      const maxPreviewWidth = Math.min(LIGHTBOX_CAP, W, (H * designW) / designH);
      setMaxWidth(Math.max(80, Math.floor(maxPreviewWidth)));
    };
    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, [format]);

  return (
    <div ref={fitRef} className={className.trim()}>
      <ScaledPreview format={format} maxWidth={maxWidth} className="lightbox-scaled">
        {children}
      </ScaledPreview>
    </div>
  );
}
