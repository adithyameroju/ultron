import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { PosterCard } from './components/PosterCard';
import { buildVariations } from './buildVariations';
import { buildLinkedInCaption } from './caption';
import {
  LINKEDIN_FORMATS,
  type CreativeTheme,
  type LinkedInFormatId,
  type PosterContent,
} from './posterTypes';
import { LightboxScaledPreview, ScaledPreview } from './ScaledPreview';
import { pickRandomDemoPreset } from './demoPresets';
import { publicAsset } from './publicUrl';
import './App.css';

const initialContent: PosterContent = {
  overline: 'Enterprise',
  headline: 'Insurance that moves as fast as your business',
  subhead:
    'Digitise cover, cut paperwork, and give your teams a clearer picture of risk—without the usual friction.',
  cta: 'Talk to us about ACKO for Business',
  footnote: 'Issued by ACKO. T&C apply.',
  hashtags: 'ACKO, Insurance, B2B',
};

type GeneratedBundle = {
  content: PosterContent;
  format: LinkedInFormatId;
  theme: CreativeTheme;
  includeVisual: boolean;
};

/** html-to-image: 2× pixels for sharp text and social compression. */
const EXPORT_PIXEL_RATIO = 2;

type AppProps = {
  onSignOut: () => void;
};

function App({ onSignOut }: AppProps) {
  const [draft, setDraft] = useState<PosterContent>(initialContent);
  const [format, setFormat] = useState<LinkedInFormatId>('landscape');
  const [theme, setTheme] = useState<CreativeTheme>('dark');
  const [includeVisual, setIncludeVisual] = useState(true);
  const [generated, setGenerated] = useState<GeneratedBundle | null>(null);
  const [selected, setSelected] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [isBooting, setIsBooting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const bootTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generate = useCallback(() => {
    const next: GeneratedBundle = {
      content: { ...draft, hashtags: draft.hashtags.trim() },
      format,
      theme,
      includeVisual,
    };
    const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (noMotion) {
      setGenerated(next);
      setSelected(0);
      return;
    }
    if (bootTimeoutRef.current) {
      clearTimeout(bootTimeoutRef.current);
    }
    setIsBooting(true);
    bootTimeoutRef.current = setTimeout(() => {
      setGenerated(next);
      setSelected(0);
      setIsBooting(false);
      bootTimeoutRef.current = null;
    }, 2600);
  }, [draft, format, theme, includeVisual]);

  const clearAll = useCallback(() => {
    if (bootTimeoutRef.current) {
      clearTimeout(bootTimeoutRef.current);
      bootTimeoutRef.current = null;
    }
    setIsBooting(false);
    setGenerated(null);
    setSelected(0);
    setLightbox(null);
    setDraft({ ...initialContent });
  }, []);

  const fillDemoCopy = useCallback(() => {
    setDraft(pickRandomDemoPreset());
  }, []);

  useEffect(
    () => () => {
      if (bootTimeoutRef.current) {
        clearTimeout(bootTimeoutRef.current);
      }
    },
    []
  );

  const variations = useMemo(
    () => (generated ? buildVariations(generated.content) : []),
    [generated]
  );

  useEffect(() => {
    setSelected((i) => (i < variations.length ? i : 0));
  }, [variations.length]);

  const v = variations[selected] ?? variations[0];
  const caption = useMemo(() => buildLinkedInCaption(draft), [draft]);
  const generatedFmt = generated ? LINKEDIN_FORMATS[generated.format] : null;

  const onDownload = async () => {
    if (!generated || !generatedFmt) {
      return;
    }
    const node = exportRef.current;
    if (!node) {
      return;
    }
    setDownloading(true);
    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise((r) => setTimeout(r, 150));
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: EXPORT_PIXEL_RATIO,
        width: generatedFmt.width,
        height: generatedFmt.height,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `ultron-linkedin-${generated.format}-${Date.now()}.png`;
      a.click();
    } catch (e) {
      console.error(e);
      window.alert(
        'Could not export the image. If this persists, try a different browser or check the console.'
      );
    } finally {
      setDownloading(false);
    }
  };

  const onCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      window.prompt('Copy caption', caption);
    }
  };

  useEffect(() => {
    if (lightbox === null) {
      return;
    }
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightbox(null);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [lightbox]);

  useLayoutEffect(() => {
    document.body.classList.toggle('lightbox-open', lightbox !== null);
    return () => document.body.classList.remove('lightbox-open');
  }, [lightbox]);

  const g = generated;

  useEffect(() => {
    if (lightbox === null || !g || variations.length === 0) {
      return;
    }
    const n = variations.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      e.preventDefault();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const current = lightbox;
        const next = e.key === 'ArrowLeft' ? (current - 1 + n) % n : (current + 1) % n;
        setSelected(next);
        setLightbox(next);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, g, variations.length]);

  const posterFormat = g?.format ?? 'landscape';
  const posterTheme = g?.theme ?? 'dark';
  const posterContent = g?.content ?? draft;

  return (
    <>
      <header className="app-header" role="banner">
        <div className="app-header__brand">
          <img
            className="app-header__ultron-mark"
            src={publicAsset('ultron-mark.png')}
            alt=""
            decoding="async"
          />
          <div className="app-header__titleblock">
            <img
              className="app-header__wordmark"
              src={publicAsset('ultron-wordmark.png')}
              alt="Ultron"
              decoding="async"
            />
            <p className="app-header__tagline">ACKO for Business</p>
          </div>
        </div>
        <div className="app-header__actions">
          <button type="button" className="app-header__signout" onClick={onSignOut}>
            Sign out
          </button>
          <div className="app-header__meta">v1</div>
        </div>
      </header>

      <div className="studio">
        <aside className="panel" aria-label="Ultron creative inputs">
        <div className="panel-body">
          <section
            className="panel-section panel-section--output"
            aria-labelledby="section-output"
          >
            <h2 id="section-output" className="panel-section__title">
              Output &amp; layout
            </h2>
            <p className="panel-section__hint">Presets for size, look, and hero art.</p>
            <div className="field field--spaced field--compact">
              <span className="field-label">Format</span>
              <select
                className="select input--compact"
                value={format}
                onChange={(e) => setFormat(e.target.value as LinkedInFormatId)}
                aria-label="LinkedIn image format"
              >
                {Object.entries(LINKEDIN_FORMATS).map(([id, f]) => (
                  <option key={id} value={id}>
                    {f.label} — {f.width}×{f.height}px
                  </option>
                ))}
              </select>
              <small>{LINKEDIN_FORMATS[format].hint}</small>
            </div>
            <div className="field field--spaced field--compact">
              <span className="field-label">Theme</span>
              <select
                className="select input--compact"
                value={theme}
                onChange={(e) => setTheme(e.target.value as CreativeTheme)}
                aria-label="Poster background theme"
              >
                <option value="dark">Dark creative</option>
                <option value="light">Light creative</option>
              </select>
              <small>Light uses a dark-ink logo.</small>
            </div>

            <div className="field field-checkbox field--compact">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={includeVisual}
                  onChange={(e) => setIncludeVisual(e.target.checked)}
                  aria-label="Include hero visual on poster"
                />
                <span>Include hero visual (shield)</span>
              </label>
              <small>Off: text-only, centred block.</small>
            </div>
          </section>

          <section
            className="panel-section panel-section--copy"
            aria-labelledby="section-copy"
          >
            <h2 id="section-copy" className="panel-section__title">
              Copy &amp; content
            </h2>
            <p className="panel-section__hint">Your post and poster text.</p>

            <div className="field field--compact">
              <label htmlFor="overline">Overline</label>
              <input
                id="overline"
                className="input input--compact"
                value={draft.overline}
                onChange={(e) => setDraft((c) => ({ ...c, overline: e.target.value }))}
                placeholder="e.g. Enterprise"
              />
            </div>

            <div className="field field--compact">
              <label htmlFor="headline">Headline</label>
              <input
                id="headline"
                className="input input--compact"
                value={draft.headline}
                onChange={(e) => setDraft((c) => ({ ...c, headline: e.target.value }))}
                placeholder="Main message"
                required
              />
            </div>

            <div className="field field--compact">
              <label htmlFor="subhead">Subhead / body</label>
              <textarea
                id="subhead"
                className="textarea textarea--compact"
                value={draft.subhead}
                onChange={(e) => setDraft((c) => ({ ...c, subhead: e.target.value }))}
                rows={2}
                placeholder="Supporting line for the post"
              />
            </div>

            <div className="row-2">
              <div className="field field--compact">
                <label htmlFor="cta">Call to action</label>
                <input
                  id="cta"
                  className="input input--compact"
                  value={draft.cta}
                  onChange={(e) => setDraft((c) => ({ ...c, cta: e.target.value }))}
                />
              </div>
              <div className="field field--compact">
                <label htmlFor="footnote">Footnote / legal</label>
                <input
                  id="footnote"
                  className="input input--compact"
                  value={draft.footnote}
                  onChange={(e) => setDraft((c) => ({ ...c, footnote: e.target.value }))}
                />
              </div>
            </div>

            <div className="field field--compact">
              <label htmlFor="hashtags">Hashtags</label>
              <input
                id="hashtags"
                className="input input--compact"
                value={draft.hashtags}
                onChange={(e) => setDraft((c) => ({ ...c, hashtags: e.target.value }))}
                placeholder="ACKO, B2B, Insurance"
              />
              <small>Comma or space separated.</small>
            </div>
          </section>
        </div>

        <div className="panel-footer">
          <button
            type="button"
            className="btn-cyber-generate"
            onClick={generate}
            disabled={isBooting}
            aria-busy={isBooting}
          >
            <span className="btn-cyber-generate__glow" aria-hidden />
            <span className="btn-cyber-generate__text">
              {isBooting ? 'Synthesising…' : 'Generate'}
            </span>
          </button>
        </div>
      </aside>

      <main className="out-main" aria-label="Workspace area — preview, variations, and caption">
        <p className="out-main__kicker">Preview &amp; export your LinkedIn set after Generate.</p>
        <div className="actions actions--primary">
          <button
            type="button"
            className="btn btn-cyber-primary"
            onClick={onDownload}
            disabled={downloading || !g || !v}
          >
            {downloading ? 'Synthesising…' : 'Download selected PNG'}
          </button>
          <button type="button" className="btn btn-cyber-ghost" onClick={onCopyCaption}>
            Copy LinkedIn caption
          </button>
        </div>
        <div className="actions actions--tools">
          <button
            type="button"
            className="btn btn-cyber-ghost btn--compact"
            onClick={fillDemoCopy}
            disabled={isBooting}
          >
            Fill demo (B2B)
          </button>
          <button
            type="button"
            className="btn btn-cyber-ghost btn--compact"
            onClick={clearAll}
            disabled={isBooting}
            aria-label="Clear all copy fields and generated previews"
          >
            Clear all
          </button>
        </div>

        <div className="preview-workspace">
          {isBooting ? (
            <div className="preview-boot" role="status" aria-live="polite">
              <span className="visually-hidden">Synthesising poster previews</span>
              <div className="preview-boot__hud" aria-hidden>
                <div className="preview-boot__grid" />
                <svg
                  className="preview-boot__wires"
                  viewBox="0 0 200 120"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path
                    className="preview-boot__wire preview-boot__wire--a"
                    d="M12 18 L98 18 L98 58 L48 88"
                    stroke="url(#pbGrad)"
                    strokeWidth="0.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    className="preview-boot__wire preview-boot__wire--b"
                    d="M188 24 L120 24 L120 70 L70 100"
                    stroke="url(#pbGrad2)"
                    strokeWidth="0.75"
                    strokeLinecap="round"
                  />
                  <path
                    className="preview-boot__wire preview-boot__wire--c"
                    d="M32 100 L32 40 L160 40 L160 90"
                    stroke="url(#pbGrad)"
                    strokeWidth="0.65"
                    strokeLinecap="round"
                    opacity="0.75"
                  />
                  <defs>
                    <linearGradient id="pbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(0,255,220,0.05)" />
                      <stop offset="45%" stopColor="rgba(0,255,240,0.9)" />
                      <stop offset="100%" stopColor="rgba(0,200,255,0.2)" />
                    </linearGradient>
                    <linearGradient id="pbGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(255,46,166,0.1)" />
                      <stop offset="50%" stopColor="rgba(0,255,220,0.7)" />
                      <stop offset="100%" stopColor="rgba(0,255,200,0.15)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="preview-boot__nodes">
                  <span className="preview-boot__node" />
                  <span className="preview-boot__node" />
                  <span className="preview-boot__node" />
                  <span className="preview-boot__node" />
                  <span className="preview-boot__node" />
                  <span className="preview-boot__node" />
                </div>
                <p className="preview-boot__label">MESH // SYNTH RENDER</p>
              </div>
            </div>
          ) : null}

          <div className={`preview-workspace__content${isBooting ? ' preview-workspace__content--hidden' : ''}`}>
            <h2 className="section-title">Variations</h2>
            <p className="subtle section-desc">
              Last render:{' '}
              {g
                ? 'four variants — line breaks + all-caps headline; accents rotate'
                : 'None — run Generate'}
              . Colours: crocus, picton, cerise. Open a preview to step through with arrows.
            </p>
            {!g ? (
              <div className="empty-state" role="status">
                <div className="empty-state__frame">
                  <p className="empty-state__line1">// AWAITING INPUT PIPELINE</p>
                  <p className="empty-state__line2">Set your copy in Ultron, then run Generate.</p>
                </div>
              </div>
            ) : (
              <div className="variation-grid" role="list">
                {variations.map((variation, index) => (
                  <div
                    key={variation.id}
                    className={`variation-card${selected === index ? ' is-selected' : ''}`}
                    role="listitem"
                  >
                    <button
                      type="button"
                      className="preview-expand"
                      onClick={() => {
                        setSelected(index);
                        setLightbox(index);
                      }}
                      aria-label={`Open variation ${index + 1} full size`}
                    >
                      <ScaledPreview format={posterFormat} className="preview-expand__inner">
                        <PosterCard
                          format={posterFormat}
                          theme={posterTheme}
                          content={posterContent}
                          variation={variation}
                          includeVisual={g.includeVisual}
                        />
                      </ScaledPreview>
                    </button>
                    <div className="variation-card__row">
                      <button
                        type="button"
                        className="btn-tiny"
                        onClick={() => setSelected(index)}
                        aria-pressed={selected === index}
                      >
                        {selected === index ? 'Selected' : 'Select'}
                      </button>
                      <p className="variation-meta">
                        {variation.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="caption-block caption-block--subtle">
          <header>
            <h2>LinkedIn caption</h2>
            <span className="chars" aria-live="polite">
              {caption.length} chars
            </span>
          </header>
          <p className="caption-text">{caption || '—'}</p>
        </div>
      </main>
      </div>

      {g && lightbox !== null && variations[lightbox] ? (
        <div
          className="lightbox-backdrop"
          onClick={() => setLightbox(null)}
          role="presentation"
        >
          <div
            className="lightbox-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal
            aria-label="Enlarged preview"
          >
            <div className="lightbox-header">
              <span className="lightbox-header__spacer" aria-hidden />
              <button
                type="button"
                className="lightbox-close"
                onClick={() => setLightbox(null)}
                aria-label="Close preview"
              >
                Close
              </button>
            </div>
            <div className="lightbox-stage">
              {variations.length > 1 ? (
                <button
                  type="button"
                  className="lightbox-nav lightbox-nav--prev"
                  onClick={() => {
                    const n = variations.length;
                    const next = (lightbox - 1 + n) % n;
                    setSelected(next);
                    setLightbox(next);
                  }}
                  aria-label="Previous variation"
                >
                  ←
                </button>
              ) : (
                <span className="lightbox-nav-placeholder" aria-hidden />
              )}
              <div className="lightbox-canvas">
                <LightboxScaledPreview format={g.format} className="lightbox-fit">
                  <PosterCard
                    format={g.format}
                    theme={g.theme}
                    content={g.content}
                    variation={variations[lightbox]!}
                    includeVisual={g.includeVisual}
                  />
                </LightboxScaledPreview>
              </div>
              {variations.length > 1 ? (
                <button
                  type="button"
                  className="lightbox-nav lightbox-nav--next"
                  onClick={() => {
                    const n = variations.length;
                    const next = (lightbox + 1) % n;
                    setSelected(next);
                    setLightbox(next);
                  }}
                  aria-label="Next variation"
                >
                  →
                </button>
              ) : (
                <span className="lightbox-nav-placeholder" aria-hidden />
              )}
            </div>
            <div className="lightbox-footer">
              {variations.length > 1 ? (
                <p className="lightbox-meta" aria-live="polite">
                  {lightbox + 1} <span className="lightbox-meta__of">/</span> {variations.length}
                </p>
              ) : null}
              <p className="lightbox-label">{variations[lightbox]!.label}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="export-offscreen" aria-hidden>
        {g && v ? (
          <PosterCard
            ref={exportRef}
            format={g.format}
            theme={g.theme}
            content={g.content}
            variation={v}
            includeVisual={g.includeVisual}
          />
        ) : null}
      </div>
    </>
  );
}

export default App;
