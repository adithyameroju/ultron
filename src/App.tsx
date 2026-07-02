import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { toPng } from 'html-to-image';
import { PosterCard } from './components/PosterCard';
import {
  buildCopyVisualStrip,
  buildLayoutAccentStrip,
  buildVariations,
  expandToFourCopyRoutes,
  mergeCopyAndLayoutVariation,
} from './buildVariations';
import type { PosterHeadlineLayout } from './headlineLineFit';
import { buildLinkedInCaption } from './caption';
import {
  CAROUSEL_SLIDE_COUNT,
  clampCarouselSlideCount,
  LINKEDIN_FORMATS,
  type CreativeTheme,
  type LinkedInFormatId,
  type PosterContent,
  type Variation,
} from './posterTypes';
import { LightboxScaledPreview, ScaledPreview } from './ScaledPreview';
import { buildV2CampaignPromptFromPreset, pickRandomDemoPreset } from './demoPresets';
import { publicAsset } from './publicUrl';
import {
  HERO_LIBRARY_ENTRIES,
  heroLibraryAssetUrl,
  type HeroLibraryId,
} from './heroIllustrations';
import { hasAnyStaticHeroForCopy, staticHeroSlotKey, STATIC_HERO_STYLES } from './staticHeroSlots';
import {
  buildCarouselSlideHeroImagePrompt,
  buildHeroImagePrompt,
  generateOpenAiHeroImage,
} from './openaiHeroImage';
import type { CarouselPlanSlide } from './carouselPlan';
import { generateCarouselFromPrompt, generatePosterContentFromPrompt } from './openaiStudioContent';
import { flatWhiteToTransparentPng } from './heroImageWhiteKey';
import {
  clearHeroAiHistory,
  listHeroAiHistory,
  saveHeroAiToHistory,
  type HeroAiHistoryEntry,
} from './heroAiHistoryStorage';
import './App.css';
import type { UltronUser } from './authSession';
import { displayInitialFromUser, displayShortNameFromUser } from './displayName';

/** Prefill editor fields from the merged poster variation (active copy × design). */
function draftSliceFromVariation(base: PosterContent, variation: Variation): PosterContent {
  const headline = variation.headlineLines.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  return {
    ...base,
    overline: (variation.displayOverline ?? base.overline).trim(),
    headline: headline || base.headline,
    subhead: (variation.displaySubhead ?? base.subhead).trim(),
  };
}

/** Persist draft headline/subhead into one copy route; refresh shared fields from draft. */
function applyDraftToPosterCopyRoute(base: PosterContent, routeIndex: number, draft: PosterContent): PosterContent {
  const routes = expandToFourCopyRoutes(base);
  const idx = Math.min(Math.max(0, routeIndex), routes.length - 1);
  const nextRoutes = routes.map((r, i) =>
    i === idx ? { headline: draft.headline.trim(), subhead: draft.subhead.trim() } : r
  );
  return {
    ...base,
    overline: draft.overline.trim() || base.overline,
    headline: nextRoutes[0]!.headline,
    subhead: nextRoutes[0]!.subhead,
    cta: draft.cta.trim() || base.cta,
    footnote: draft.footnote.trim() || base.footnote,
    hashtags: draft.hashtags.trim() || base.hashtags,
    copyRoutes: nextRoutes,
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error ?? new Error('read failed'));
    fr.readAsDataURL(blob);
  });
}

function ThumbViewCta() {
  return <span className="thumb-hover-cta">View image</span>;
}

async function finalizeHeroDataUrl(
  result: Awaited<ReturnType<typeof generateOpenAiHeroImage>>
): Promise<string | null> {
  if (!result.ok || !result.dataUrl) {
    return null;
  }
  let finalUrl = result.dataUrl;
  if (!result.usedNativeTransparency) {
    try {
      finalUrl = await flatWhiteToTransparentPng(result.dataUrl, {
        whiteCutoff: 50,
        feather: 30,
      });
    } catch {
      finalUrl = result.dataUrl;
    }
  }
  return finalUrl;
}

/** Bounded parallel map — faster than strict sequential calls without unbounded fan-out to the API. */
const CAROUSEL_HERO_GEN_CONCURRENCY = 3;

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const worker = async () => {
    for (;;) {
      const i = nextIndex;
      nextIndex += 1;
      if (i >= items.length) {
        break;
      }
      results[i] = await mapper(items[i]!, i);
    }
  };
  const pool = Math.min(Math.max(1, concurrency), Math.max(1, items.length));
  await Promise.all(Array.from({ length: pool }, () => worker()));
  return results;
}

type StudioVersion = 'v1' | 'v2';
type V2Phase = 'prompt' | 'editing';

const initialContent: PosterContent = {
  overline: '',
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
  /** V2 LinkedIn carousel: one `PosterContent` per slide (same dimensions as square). */
  carouselSlides?: PosterContent[];
  /** Per-slide hero image URLs (data URLs), aligned with `carouselSlides`. */
  carouselHeroUrls?: (string | null)[];
  /** Structured narrative + art direction per slide (Step 1 plan). */
  carouselPlan?: CarouselPlanSlide[];
  /** Last V2 campaign brief used when generating the carousel (for hero regen prompts). */
  carouselCampaignBrief?: string;
};

/** html-to-image: 2× pixels for sharp text and social compression. */
const EXPORT_PIXEL_RATIO = 2;

type AppProps = {
  user: UltronUser | null;
  onSignOut: () => void;
};

function App({ user, onSignOut }: AppProps) {
  const [draft, setDraft] = useState<PosterContent>(initialContent);
  const [format, setFormat] = useState<LinkedInFormatId>('landscape');
  const [theme, setTheme] = useState<CreativeTheme>('dark');
  /** Studio chrome (shell) — independent of poster Light/Dark creative. */
  const [shellTheme, setShellTheme] = useState<'dark' | 'light'>(() => {
    try {
      const s = localStorage.getItem('ultron-shell-theme');
      if (s === 'light' || s === 'dark') {
        return s;
      }
    } catch {
      /* ignore */
    }
    return 'dark';
  });
  const [includeVisual, setIncludeVisual] = useState(true);
  const [generated, setGenerated] = useState<GeneratedBundle | null>(null);
  const [selected, setSelected] = useState(0);
  /** Non-carousel: which copy / headline route is active (first workspace strip). */
  const [ncCopyIdx, setNcCopyIdx] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [isBooting, setIsBooting] = useState(false);
  /** Static GMC / Travel / Credit artwork, or default (built-in shield / AI). */
  const [heroLibrary, setHeroLibrary] = useState<HeroLibraryId>('default');
  /** Active sub-panel under Visuals (so AI tab shows before first image exists). */
  const [heroUiTab, setHeroUiTab] = useState<'default' | 'library' | 'ai'>('default');
  /** Carousel: mirror of the active slide hero URL. Static posters use `staticHeroImageMap` only. */
  const [heroAiUrl, setHeroAiUrl] = useState<string | null>(null);
  /** Static poster: keyed `copyIndex:heroVisualStyle` → data URL (four copy routes × four layout heroes). */
  const [staticHeroImageMap, setStaticHeroImageMap] = useState<Record<string, string>>({});
  const [staticHeroDeckLoading, setStaticHeroDeckLoading] = useState(false);
  const [heroAiLoading, setHeroAiLoading] = useState(false);
  const [heroAiError, setHeroAiError] = useState<string | null>(null);
  /** When true with `heroLibrary === 'default'`, poster shows shield even if `heroAiUrl` is set (AI stays saved). */
  const [heroShieldPreferred, setHeroShieldPreferred] = useState(true);
  const [heroAiHistoryRows, setHeroAiHistoryRows] = useState<
    { entry: HeroAiHistoryEntry; thumbUrl: string }[]
  >([]);
  const heroAiThumbUrlsRef = useRef<string[]>([]);
  const [studioVersion, setStudioVersion] = useState<StudioVersion>('v2');
  const [v2Phase, setV2Phase] = useState<V2Phase>('prompt');
  const [v2UserPrompt, setV2UserPrompt] = useState('');
  const [v2FromPromptLoading, setV2FromPromptLoading] = useState(false);
  const [v2FromPromptError, setV2FromPromptError] = useState<string | null>(null);
  const [v2ShowCopyEditor, setV2ShowCopyEditor] = useState(false);
  const [carouselSlideCount, setCarouselSlideCount] = useState(5);
  const [carouselSlideIndex, setCarouselSlideIndex] = useState(0);
  const carouselSlideIndexRef = useRef(0);
  const [carouselHeroBusy, setCarouselHeroBusy] = useState(false);
  const generatedRef = useRef(generated);
  generatedRef.current = generated;
  const ncCopyIdxRef = useRef(ncCopyIdx);
  ncCopyIdxRef.current = ncCopyIdx;
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileClusterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.dataset.shellTheme = shellTheme;
    try {
      localStorage.setItem('ultron-shell-theme', shellTheme);
    } catch {
      /* ignore */
    }
  }, [shellTheme]);
  const exportRef = useRef<HTMLDivElement>(null);
  const lightboxExportRef = useRef<HTMLDivElement>(null);
  const bootTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** After `generate()` boot finishes, optionally run AI hero generation (see effect below). */
  const pendingHeroAfterBootRef = useRef(false);
  const variationGridRef = useRef<HTMLDivElement>(null);
  const posterOptionsGridRef = useRef<HTMLDivElement>(null);
  const lightboxDialogRef = useRef<HTMLDivElement>(null);
  const workspaceCarouselDownloadRef = useRef<HTMLDivElement>(null);
  const lightboxCarouselDownloadRef = useRef<HTMLDivElement>(null);

  const [carouselExportMenu, setCarouselExportMenu] = useState<null | 'workspace' | 'lightbox'>(null);

  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY ?? '';

  const canGenerateFromV2Prompt = useMemo(
    () =>
      studioVersion === 'v2' &&
      v2UserPrompt.trim().length > 0 &&
      !v2FromPromptLoading &&
      !carouselHeroBusy &&
      !isBooting &&
      Boolean(openaiApiKey.trim()) &&
      (format !== 'carousel' ||
        (carouselSlideCount >= CAROUSEL_SLIDE_COUNT.min &&
          carouselSlideCount <= CAROUSEL_SLIDE_COUNT.max)),
    [
      studioVersion,
      v2UserPrompt,
      v2FromPromptLoading,
      carouselHeroBusy,
      isBooting,
      openaiApiKey,
      format,
      carouselSlideCount,
    ]
  );

  /**
   * V2: use OpenAI from the campaign prompt when there is no bundle yet, or when Format is carousel but the
   * current bundle is not a carousel document (e.g. user generated landscape then switched to carousel).
   */
  const v2PrimaryUsesPromptPipeline = useMemo(() => {
    if (studioVersion !== 'v2') {
      return false;
    }
    if (!generated) {
      return true;
    }
    return (
      format === 'carousel' &&
      !(generated.format === 'carousel' && Boolean(generated.carouselSlides?.length))
    );
  }, [studioVersion, generated, format]);

  /** When `v2PrimaryUsesPromptPipeline`, footer runs prompt → model; otherwise headline-driven `generate()`. */
  const canGenerate = useMemo(() => {
    if (v2PrimaryUsesPromptPipeline) {
      return canGenerateFromV2Prompt;
    }
    return draft.headline.trim().length > 0;
  }, [v2PrimaryUsesPromptPipeline, canGenerateFromV2Prompt, draft.headline]);

  const footerPrimaryBusy = useMemo(
    () =>
      isBooting ||
      (v2PrimaryUsesPromptPipeline && (v2FromPromptLoading || carouselHeroBusy)),
    [isBooting, v2PrimaryUsesPromptPipeline, v2FromPromptLoading, carouselHeroBusy]
  );

  const footerPrimaryLabel = useMemo(() => {
    if (footerPrimaryBusy) {
      if (v2PrimaryUsesPromptPipeline) {
        if (v2FromPromptLoading) {
          return format === 'carousel' ? 'Generating carousel copy…' : 'Generating image…';
        }
        if (carouselHeroBusy) {
          return 'Generating slide visuals…';
        }
      }
      if (isBooting) {
        return 'Generating 4 creative options…';
      }
      return 'Working…';
    }
    if (v2PrimaryUsesPromptPipeline) {
      return format === 'carousel' ? 'Generate carousel from prompt' : 'Generate image';
    }
    return 'Generate Creatives';
  }, [
    footerPrimaryBusy,
    isBooting,
    v2PrimaryUsesPromptPipeline,
    v2FromPromptLoading,
    carouselHeroBusy,
    format,
  ]);

  /** Copy / boot in flight — shimmer poster and design thumbnails (not hero-only work). */
  const workspaceCopyGenerating = useMemo(
    () => isBooting || v2FromPromptLoading,
    [isBooting, v2FromPromptLoading]
  );

  /** Carousel layout strip: shimmer while copy is generating. */
  const workspaceCarouselLayoutBusy = workspaceCopyGenerating;

  const generate = useCallback(() => {
    if (!canGenerate) {
      return;
    }
    const trimmedHashtags = draft.hashtags.trim();
    const baseContent = { ...draft, hashtags: trimmedHashtags };

    /** Regenerating 4 layout options must not strip `carouselSlides` (that breaks the workspace carousel UI). */
    let next: GeneratedBundle;
    if (
      format === 'carousel' &&
      generated?.format === 'carousel' &&
      generated.carouselSlides &&
      generated.carouselSlides.length > 0
    ) {
      const slides = [...generated.carouselSlides];
      const idx = Math.min(Math.max(carouselSlideIndex, 0), slides.length - 1);
      slides[idx] = { ...baseContent };
      const urls = [...(generated.carouselHeroUrls ?? slides.map(() => null))];
      while (urls.length < slides.length) {
        urls.push(null);
      }
      next = {
        ...generated,
        content: slides[0]!,
        format,
        theme,
        includeVisual,
        carouselSlides: slides,
        carouselHeroUrls: urls,
        carouselPlan: generated.carouselPlan,
        carouselCampaignBrief: generated.carouselCampaignBrief,
      };
    } else {
      next = {
        content: baseContent,
        format,
        theme,
        includeVisual,
      };
    }
    const wantsHeroAfter =
      includeVisual && heroUiTab === 'ai' && Boolean(openaiApiKey.trim());
    const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (noMotion || wantsHeroAfter) {
      if (!canGenerate) {
        return;
      }
      pendingHeroAfterBootRef.current = wantsHeroAfter;
      setGenerated(next);
      setSelected(0);
      setNcCopyIdx(0);
      setHeroAiUrl(null);
      setStaticHeroImageMap({});
      setHeroAiError(null);
      setHeroShieldPreferred(true);
      return;
    }
    if (bootTimeoutRef.current) {
      clearTimeout(bootTimeoutRef.current);
    }
    setIsBooting(true);
    bootTimeoutRef.current = setTimeout(() => {
      pendingHeroAfterBootRef.current =
        includeVisual && heroUiTab === 'ai' && Boolean(openaiApiKey.trim());
      setGenerated(next);
      setSelected(0);
      setNcCopyIdx(0);
      setIsBooting(false);
      bootTimeoutRef.current = null;
      setHeroAiUrl(null);
      setStaticHeroImageMap({});
      setHeroAiError(null);
      setHeroShieldPreferred(true);
    }, 2600);
  }, [
    draft,
    format,
    theme,
    includeVisual,
    canGenerate,
    generated,
    carouselSlideIndex,
    heroUiTab,
    openaiApiKey,
  ]);

  const clearAll = useCallback(() => {
    if (bootTimeoutRef.current) {
      clearTimeout(bootTimeoutRef.current);
      bootTimeoutRef.current = null;
    }
    setIsBooting(false);
    setGenerated(null);
    setSelected(0);
    setNcCopyIdx(0);
    setLightbox(null);
    setHeroLibrary('default');
    setHeroUiTab('default');
    setHeroAiUrl(null);
    setStaticHeroImageMap({});
    setHeroAiError(null);
    setHeroAiLoading(false);
    setHeroShieldPreferred(true);
    setV2Phase('prompt');
    setV2UserPrompt('');
    setV2FromPromptError(null);
    setV2FromPromptLoading(false);
    setV2ShowCopyEditor(false);
    setCarouselSlideIndex(0);
    setCarouselHeroBusy(false);
    setStaticHeroDeckLoading(false);
    setProfileMenuOpen(false);
    setDraft({ ...initialContent });
    void (async () => {
      try {
        await clearHeroAiHistory();
      } catch {
        /* ignore */
      }
      heroAiThumbUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      heroAiThumbUrlsRef.current = [];
      setHeroAiHistoryRows([]);
    })();
  }, []);

  const fillDemoCopy = useCallback(() => {
    const preset = pickRandomDemoPreset();
    setDraft(preset);
    if (studioVersion === 'v2') {
      setV2UserPrompt(buildV2CampaignPromptFromPreset(preset));
      setV2FromPromptError(null);
    }
  }, [studioVersion]);

  useEffect(() => {
    if (!profileMenuOpen) {
      return undefined;
    }
    const onDocMouse = (e: MouseEvent) => {
      const el = profileClusterRef.current;
      if (el && !el.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [profileMenuOpen]);

  const refreshHeroAiHistory = useCallback(async () => {
    heroAiThumbUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    heroAiThumbUrlsRef.current = [];
    try {
      const entries = await listHeroAiHistory(24);
      const rows = entries.map((entry) => {
        const thumbUrl = URL.createObjectURL(entry.blob);
        heroAiThumbUrlsRef.current.push(thumbUrl);
        return { entry, thumbUrl };
      });
      setHeroAiHistoryRows(rows);
    } catch {
      setHeroAiHistoryRows([]);
    }
  }, []);

  useEffect(() => {
    carouselSlideIndexRef.current = carouselSlideIndex;
  }, [carouselSlideIndex]);

  useEffect(() => {
    void refreshHeroAiHistory();
    return () => {
      heroAiThumbUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      heroAiThumbUrlsRef.current = [];
    };
  }, [refreshHeroAiHistory]);

  const applyHeroAiFromHistory = useCallback(async (entry: HeroAiHistoryEntry) => {
    try {
      const url = await blobToDataUrl(entry.blob);
      setHeroShieldPreferred(false);
      setHeroUiTab('ai');
      setHeroAiError(null);
      const bundle = generatedRef.current;
      if (bundle?.format === 'carousel' && bundle.carouselSlides?.length) {
        setHeroAiUrl(url);
        setGenerated((prev) => {
          if (!prev || prev.format !== 'carousel' || !prev.carouselSlides?.length) {
            return prev;
          }
          const idx = carouselSlideIndexRef.current;
          const next = [...(prev.carouselHeroUrls ?? prev.carouselSlides.map(() => null))];
          while (next.length < prev.carouselSlides.length) {
            next.push(null);
          }
          next[idx] = url;
          return { ...prev, carouselHeroUrls: next };
        });
      } else {
        setHeroAiUrl(null);
        const src = bundle?.content;
        const copyLen = src ? Math.max(1, buildCopyVisualStrip(src).length) : 1;
        setStaticHeroImageMap((prev) => {
          const next = { ...prev };
          for (let ci = 0; ci < copyLen; ci++) {
            for (const st of STATIC_HERO_STYLES) {
              next[staticHeroSlotKey(ci, st)] = url;
            }
          }
          return next;
        });
      }
    } catch {
      setHeroAiError('Could not load saved image from history.');
    }
  }, []);

  useEffect(
    () => () => {
      if (bootTimeoutRef.current) {
        clearTimeout(bootTimeoutRef.current);
      }
    },
    []
  );

  const posterHeadlineLayout = useMemo((): PosterHeadlineLayout | undefined => {
    if (!generated) {
      return undefined;
    }
    return { format: generated.format, includeVisual: generated.includeVisual };
  }, [generated]);

  const previewContent = useMemo(() => {
    if (!generated) {
      return draft;
    }
    if (generated.format === 'carousel' && generated.carouselSlides?.length) {
      return generated.carouselSlides[carouselSlideIndex] ?? draft;
    }
    if (studioVersion === 'v2' && v2Phase === 'editing') {
      return draft;
    }
    return generated.content;
  }, [generated, draft, studioVersion, v2Phase, carouselSlideIndex]);

  const copyStripVariations = useMemo(() => {
    if (!generated) {
      return [];
    }
    if (generated.format === 'carousel' && generated.carouselSlides?.length) {
      return [];
    }
    const src = studioVersion === 'v2' && v2Phase === 'editing' ? previewContent : generated.content;
    return buildCopyVisualStrip(src, posterHeadlineLayout);
  }, [generated, studioVersion, v2Phase, previewContent, posterHeadlineLayout]);

  const layoutStripVariations = useMemo(() => {
    if (!generated) {
      return [];
    }
    if (generated.format === 'carousel' && generated.carouselSlides?.length) {
      return [];
    }
    const src = studioVersion === 'v2' && v2Phase === 'editing' ? previewContent : generated.content;
    const copy = buildCopyVisualStrip(src, posterHeadlineLayout);
    const base = copy[Math.min(ncCopyIdx, Math.max(0, copy.length - 1))]!;
    return buildLayoutAccentStrip(base);
  }, [generated, studioVersion, v2Phase, previewContent, ncCopyIdx, posterHeadlineLayout]);

  const variations = useMemo(() => {
    if (!generated) {
      return [];
    }
    if (generated.format === 'carousel' && generated.carouselSlides?.length) {
      return buildVariations(previewContent, posterHeadlineLayout);
    }
    return layoutStripVariations;
  }, [generated, previewContent, layoutStripVariations, posterHeadlineLayout]);

  useEffect(() => {
    setSelected((i) => (i < variations.length ? i : 0));
  }, [variations.length]);

  useEffect(() => {
    setNcCopyIdx((i) => (i < copyStripVariations.length ? i : 0));
  }, [copyStripVariations.length]);

  const v = useMemo(() => {
    if (!variations.length) {
      return undefined;
    }
    if (generated?.format === 'carousel' && generated.carouselSlides?.length) {
      return variations[Math.min(selected, variations.length - 1)];
    }
    const copy = copyStripVariations[Math.min(ncCopyIdx, Math.max(0, copyStripVariations.length - 1))];
    const layout = variations[Math.min(selected, Math.max(0, variations.length - 1))];
    if (!copy || !layout) {
      const c0 = copyStripVariations[0];
      const l0 = variations[0];
      if (!c0 || !l0) {
        return undefined;
      }
      return mergeCopyAndLayoutVariation(c0, l0);
    }
    return mergeCopyAndLayoutVariation(copy, layout);
  }, [generated, variations, copyStripVariations, selected, ncCopyIdx]);

  const lightboxPosterVariation = useMemo(() => {
    if (lightbox === null || !variations.length) {
      return null;
    }
    if (generated?.format === 'carousel' && generated.carouselSlides?.length) {
      return variations[lightbox] ?? null;
    }
    const nCopy = copyStripVariations.length;
    if (!nCopy) {
      return null;
    }
    const copyIdx = Math.min(Math.max(0, lightbox), nCopy - 1);
    const copy = copyStripVariations[copyIdx]!;
    const layout = variations[Math.min(selected, Math.max(0, variations.length - 1))]!;
    return mergeCopyAndLayoutVariation(copy, layout);
  }, [lightbox, generated, variations, copyStripVariations, selected]);

  const { resolvedHeroImageUrl, resolvedHeroImageObjectFit, heroMatchPosterBackdrop } = useMemo(() => {
    const isCarouselDoc =
      generated?.format === 'carousel' && Boolean(generated.carouselSlides?.length);

    if (isCarouselDoc) {
      const slideAiUrl = generated!.carouselHeroUrls?.[carouselSlideIndex] ?? null;
      if (slideAiUrl) {
        return {
          resolvedHeroImageUrl: slideAiUrl,
          resolvedHeroImageObjectFit: 'contain' as const,
          heroMatchPosterBackdrop: false as const,
        };
      }
      if (heroLibrary !== 'default') {
        return {
          resolvedHeroImageUrl: heroLibraryAssetUrl(heroLibrary),
          resolvedHeroImageObjectFit: 'contain' as const,
          heroMatchPosterBackdrop: false as const,
        };
      }
      if (!heroShieldPreferred && heroAiUrl) {
        return {
          resolvedHeroImageUrl: heroAiUrl,
          resolvedHeroImageObjectFit: 'contain' as const,
          heroMatchPosterBackdrop: false as const,
        };
      }
      return {
        resolvedHeroImageUrl: null as string | null,
        resolvedHeroImageObjectFit: 'cover' as const,
        heroMatchPosterBackdrop: false as const,
      };
    }

    if (heroLibrary !== 'default') {
      return {
        resolvedHeroImageUrl: heroLibraryAssetUrl(heroLibrary),
        resolvedHeroImageObjectFit: 'contain' as const,
        heroMatchPosterBackdrop: false as const,
      };
    }
    const heroStyle = v?.heroVisualStyle ?? 'default';
    if (!heroShieldPreferred) {
      const aiSlot = staticHeroImageMap[staticHeroSlotKey(ncCopyIdx, heroStyle)] ?? null;
      if (aiSlot) {
        return {
          resolvedHeroImageUrl: aiSlot,
          resolvedHeroImageObjectFit: 'contain' as const,
          heroMatchPosterBackdrop: false as const,
        };
      }
    }
    return {
      resolvedHeroImageUrl: null as string | null,
      resolvedHeroImageObjectFit: 'cover' as const,
      heroMatchPosterBackdrop: false as const,
    };
  }, [
    heroLibrary,
    heroAiUrl,
    heroShieldPreferred,
    v?.heroVisualStyle,
    generated?.format,
    generated?.carouselHeroUrls,
    generated?.carouselSlides?.length,
    carouselSlideIndex,
    staticHeroImageMap,
    ncCopyIdx,
  ]);

  const carouselSlidePager = useMemo(() => {
    if (generated?.format !== 'carousel' || !generated.carouselSlides?.length) {
      return undefined;
    }
    return { current: carouselSlideIndex + 1, total: generated.carouselSlides.length };
  }, [generated?.format, generated?.carouselSlides, carouselSlideIndex]);

  const heroImageLoading = useMemo(
    () =>
      heroAiLoading ||
      staticHeroDeckLoading ||
      (carouselHeroBusy &&
        generated?.format === 'carousel' &&
        !generated.carouselHeroUrls?.[carouselSlideIndex]),
    [
      heroAiLoading,
      staticHeroDeckLoading,
      carouselHeroBusy,
      generated?.format,
      generated?.carouselHeroUrls,
      carouselSlideIndex,
    ]
  );

  /** Per-slide hero for export and carousel previews — only `carouselHeroUrls[i]` for carousel (no global hero leak). */
  const heroUrlForExportSlide = useCallback(
    (slideIndex: number): string | null => {
      if (generated?.format === 'carousel' && generated.carouselSlides?.length) {
        const slideAi = generated.carouselHeroUrls?.[slideIndex] ?? null;
        if (slideAi) {
          return slideAi;
        }
        if (heroLibrary !== 'default') {
          return heroLibraryAssetUrl(heroLibrary);
        }
        if (!heroShieldPreferred && heroAiUrl) {
          return heroAiUrl;
        }
        return null;
      }
      if (heroLibrary !== 'default') {
        return heroLibraryAssetUrl(heroLibrary);
      }
      if (heroShieldPreferred) {
        return null;
      }
      const st = v?.heroVisualStyle ?? 'default';
      return staticHeroImageMap[staticHeroSlotKey(ncCopyIdx, st)] ?? null;
    },
    [
      heroLibrary,
      heroShieldPreferred,
      generated?.format,
      generated?.carouselSlides?.length,
      generated?.carouselHeroUrls,
      heroAiUrl,
      staticHeroImageMap,
      ncCopyIdx,
      v?.heroVisualStyle,
    ]
  );

  /** Static workspace thumbnails: pick the saved AI URL for this copy×layout merge (not only the active layout). */
  const staticAiHeroUrlForMerged = useCallback(
    (merged: Variation | null | undefined, copyIdx: number): string | null => {
      if (!merged || !generated || generated.format === 'carousel') {
        return null;
      }
      if (heroLibrary !== 'default') {
        return heroLibraryAssetUrl(heroLibrary);
      }
      if (heroShieldPreferred) {
        return null;
      }
      const st = merged.heroVisualStyle ?? 'default';
      return staticHeroImageMap[staticHeroSlotKey(copyIdx, st)] ?? null;
    },
    [generated, heroLibrary, heroShieldPreferred, staticHeroImageMap]
  );

  /** Hero spinner on workspace thumbs only when that slot is still waiting (avoids all tiles looking broken). */
  const thumbHeroLoading = useCallback(
    (copyIdx: number, merged: Variation | null | undefined): boolean => {
      if (!generated?.includeVisual || generated.format === 'carousel') {
        return false;
      }
      if (heroLibrary !== 'default' || heroShieldPreferred) {
        return false;
      }
      if (staticAiHeroUrlForMerged(merged, copyIdx)) {
        return false;
      }
      return heroAiLoading || staticHeroDeckLoading;
    },
    [
      generated?.includeVisual,
      generated?.format,
      heroLibrary,
      heroShieldPreferred,
      staticAiHeroUrlForMerged,
      heroAiLoading,
      staticHeroDeckLoading,
    ]
  );

  const showClearAiVisual = useMemo(() => {
    if (!generated) {
      return false;
    }
    if (generated.format === 'carousel' && generated.carouselSlides?.length) {
      return Boolean(generated.carouselHeroUrls?.[carouselSlideIndex] ?? heroAiUrl);
    }
    return Object.keys(staticHeroImageMap).length > 0;
  }, [
    generated,
    generated?.carouselHeroUrls,
    carouselSlideIndex,
    heroAiUrl,
    staticHeroImageMap,
  ]);

  const heroAiThumbPreviewUrl = useMemo(() => {
    if (resolvedHeroImageUrl) {
      return resolvedHeroImageUrl;
    }
    if (generated?.format === 'carousel') {
      return heroAiUrl;
    }
    for (const s of STATIC_HERO_STYLES) {
      const u = staticHeroImageMap[staticHeroSlotKey(ncCopyIdx, s)];
      if (u) {
        return u;
      }
    }
    return null;
  }, [resolvedHeroImageUrl, generated?.format, heroAiUrl, staticHeroImageMap, ncCopyIdx]);

  const heroStatusLabel = useMemo(() => {
    if (!includeVisual) {
      return 'Hero: off (text-only layout)';
    }
    if (heroLibrary !== 'default') {
      const ent = HERO_LIBRARY_ENTRIES.find((e) => e.id === heroLibrary);
      const lib = `Hero: Library — ${ent?.label ?? heroLibrary}`;
      const hasAiBacking =
        generated?.format === 'carousel'
          ? Boolean(heroAiUrl || generated.carouselHeroUrls?.some(Boolean))
          : Object.keys(staticHeroImageMap).length > 0;
      return hasAiBacking ? `${lib} · AI visual saved` : lib;
    }
    const hasStaticThisCopy =
      generated != null &&
      generated.format !== 'carousel' &&
      hasAnyStaticHeroForCopy(staticHeroImageMap, ncCopyIdx);
    const hasCarouselAi =
      generated?.format === 'carousel' &&
      Boolean(generated.carouselHeroUrls?.[carouselSlideIndex] ?? heroAiUrl);
    const showingAi =
      !heroShieldPreferred && (hasStaticThisCopy || (generated?.format === 'carousel' && hasCarouselAi));
    if (showingAi) {
      return 'Hero: AI-generated image';
    }
    if ((hasStaticThisCopy || hasCarouselAi) && heroShieldPreferred) {
      return 'Hero: Built-in shield · AI visual saved (open AI tab to apply)';
    }
    return 'Hero: Built-in shield';
  }, [
    includeVisual,
    heroAiUrl,
    heroLibrary,
    heroShieldPreferred,
    generated,
    generated?.format,
    generated?.carouselHeroUrls,
    carouselSlideIndex,
    staticHeroImageMap,
    ncCopyIdx,
  ]);

  const openDefaultHero = useCallback(() => {
    setHeroUiTab('default');
    setHeroLibrary('default');
    setHeroShieldPreferred(true);
    setHeroAiError(null);
  }, []);

  const openLibraryHero = useCallback(() => {
    setHeroUiTab('library');
    setHeroShieldPreferred(false);
    setHeroAiError(null);
    setHeroLibrary((h) => {
      if (h !== 'default') {
        return h;
      }
      return heroAiUrl || Object.keys(staticHeroImageMap).length > 0
        ? 'default'
        : HERO_LIBRARY_ENTRIES[0]!.id;
    });
  }, [heroAiUrl, staticHeroImageMap]);

  const openAiHeroTab = useCallback(() => {
    setHeroUiTab('ai');
    setHeroLibrary('default');
    setHeroShieldPreferred(false);
  }, []);

  const generateOpenAiHero = useCallback(async () => {
    if (!generated || !v || !includeVisual) {
      return;
    }
    setHeroAiError(null);
    setHeroAiLoading(true);
    try {
    const heroBase =
      generated.format === 'carousel' && generated.carouselSlides?.length
        ? generated.carouselSlides[carouselSlideIndex] ?? generated.content
        : generated.content;
    const heroCopy: PosterContent = {
      ...heroBase,
      headline: draft.headline.trim() || heroBase.headline,
      subhead: draft.subhead.trim() || heroBase.subhead,
    };
    const planSlide = generated.carouselPlan?.[carouselSlideIndex];
    const carouselBrief = generated.carouselCampaignBrief?.trim() ?? '';
    const useCarouselPlanHero =
      generated.format === 'carousel' &&
      Boolean(planSlide && carouselBrief && generated.carouselSlides?.length);

    const prompt = useCarouselPlanHero
      ? buildCarouselSlideHeroImagePrompt({
          theme: generated.theme,
          slideIndex: carouselSlideIndex,
          totalSlides: generated.carouselSlides!.length,
          planSlide: planSlide!,
          campaignBrief: carouselBrief,
          prevVisualSummary:
            carouselSlideIndex > 0
              ? generated.carouselPlan![carouselSlideIndex - 1]!.visual_direction
              : undefined,
          nextVisualSummary:
            carouselSlideIndex < generated.carouselSlides!.length - 1
              ? generated.carouselPlan![carouselSlideIndex + 1]!.visual_direction
              : undefined,
        })
      : buildHeroImagePrompt(heroCopy, v, generated.theme);
    const result = await generateOpenAiHeroImage({
      prompt,
      format: generated.format,
      apiKey: openaiApiKey,
    });
    if (result.ok) {
      setHeroAiLoading(false);
      setHeroUiTab('ai');
      setHeroShieldPreferred(false);
      const finalUrl = await finalizeHeroDataUrl(result);
      if (!finalUrl) {
        setHeroAiError('Could not process the generated image.');
        return;
      }
      if (generated.format === 'carousel' && generated.carouselSlides?.length) {
        setHeroAiUrl(finalUrl);
        const idx = carouselSlideIndex;
        setGenerated((prev) => {
          if (!prev?.carouselSlides?.length || prev.format !== 'carousel') {
            return prev;
          }
          const next = [...(prev.carouselHeroUrls ?? prev.carouselSlides.map(() => null))];
          while (next.length < prev.carouselSlides.length) {
            next.push(null);
          }
          next[idx] = finalUrl;
          return { ...prev, carouselHeroUrls: next };
        });
      } else {
        setHeroAiUrl(null);
        const srcForStrip =
          studioVersion === 'v2' && v2Phase === 'editing' ? previewContent : generated.content;
        const copyLen = Math.max(1, buildCopyVisualStrip(srcForStrip, posterHeadlineLayout).length);
        setStaticHeroImageMap((prev) => {
          const next = { ...prev };
          for (let ci = 0; ci < copyLen; ci++) {
            for (const st of STATIC_HERO_STYLES) {
              next[staticHeroSlotKey(ci, st)] = finalUrl;
            }
          }
          return next;
        });
      }
      void saveHeroAiToHistory({
        dataUrl: finalUrl,
        headlinePreview: heroCopy.headline,
        format: generated.format,
      })
        .then(() => refreshHeroAiHistory())
        .catch(() => {
          /* history save optional */
        });
    } else {
      setHeroAiError(result.message);
    }
    } finally {
      setHeroAiLoading(false);
    }
  }, [
    generated,
    v,
    includeVisual,
    openaiApiKey,
    draft.headline,
    draft.subhead,
    carouselSlideIndex,
    refreshHeroAiHistory,
    previewContent,
    studioVersion,
    v2Phase,
    posterHeadlineLayout,
  ]);

  const generateStaticHeroDeck = useCallback(async () => {
    if (!generated || generated.format === 'carousel' || !includeVisual || !openaiApiKey.trim()) {
      return;
    }
    setHeroAiError(null);
    setStaticHeroDeckLoading(true);
    try {
      const src = studioVersion === 'v2' && v2Phase === 'editing' ? previewContent : generated.content;
      const copyStrip = buildCopyVisualStrip(src, posterHeadlineLayout);
      const base = copyStrip[0];
      if (!base) {
        setHeroAiError('No copy variation to brief the hero model.');
        return;
      }
      const layouts = buildLayoutAccentStrip(base);
      const layout0 = layouts[0];
      if (!layout0) {
        setHeroAiError('No layout variation to brief the hero model.');
        return;
      }
      const merged = mergeCopyAndLayoutVariation(base, layout0);
      const headline = merged.headlineLines.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      const heroCopy: PosterContent = {
        ...generated.content,
        headline: headline || generated.content.headline,
        subhead: (merged.displaySubhead ?? generated.content.subhead).trim(),
        overline: (merged.displayOverline ?? generated.content.overline).trim(),
      };
      const prompt = buildHeroImagePrompt(heroCopy, merged, generated.theme);
      const result = await generateOpenAiHeroImage({
        prompt,
        format: generated.format,
        apiKey: openaiApiKey,
      });
      const url = await finalizeHeroDataUrl(result);
      if (url && result.ok) {
        const n = copyStrip.length;
        setStaticHeroImageMap((prev) => {
          const next = { ...prev };
          for (let ci = 0; ci < n; ci++) {
            for (const st of STATIC_HERO_STYLES) {
              next[staticHeroSlotKey(ci, st)] = url;
            }
          }
          return next;
        });
        setHeroUiTab('ai');
        setHeroShieldPreferred(false);
        setHeroAiUrl(null);
      } else {
        setHeroAiError(
          (!result.ok && result.message) || 'Could not generate or process the hero image.'
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setHeroAiError(msg);
    } finally {
      setStaticHeroDeckLoading(false);
    }
  }, [generated, includeVisual, openaiApiKey, previewContent, studioVersion, v2Phase, posterHeadlineLayout]);

  /** After headline-driven `generate()` boot, optionally run AI hero(s) when the AI tab is active. */
  useEffect(() => {
    if (isBooting) {
      return undefined;
    }
    if (!pendingHeroAfterBootRef.current) {
      return undefined;
    }
    pendingHeroAfterBootRef.current = false;
    if (!includeVisual || heroUiTab !== 'ai' || !openaiApiKey.trim() || !generated) {
      return undefined;
    }
    if (generated.format === 'carousel' && generated.carouselSlides?.length) {
      void generateOpenAiHero();
    } else if (generated.format !== 'carousel') {
      void generateStaticHeroDeck();
    }
    return undefined;
  }, [isBooting, generated, includeVisual, heroUiTab, openaiApiKey, generateOpenAiHero, generateStaticHeroDeck]);

  const goCarouselSlide = useCallback(
    (i: number) => {
      if (!generated?.carouselSlides || generated.format !== 'carousel') {
        return;
      }
      if (i === carouselSlideIndex) {
        return;
      }
      const slides = [...generated.carouselSlides];
      slides[carouselSlideIndex] = { ...draft };
      const nextDraft = slides[i];
      if (!nextDraft) {
        return;
      }
      setGenerated({
        ...generated,
        carouselSlides: slides,
        content: slides[0] ?? generated.content,
      });
      setCarouselSlideIndex(i);
      setDraft({ ...nextDraft });
      const urls = generated.carouselHeroUrls;
      if (generated.format === 'carousel' && urls?.length && !heroShieldPreferred) {
        setHeroAiUrl(urls[i] ?? null);
      }
    },
    [generated, draft, carouselSlideIndex, heroShieldPreferred]
  );

  useEffect(() => {
    if (generated?.format !== 'carousel' || !generated.carouselSlides?.length) {
      return undefined;
    }
    if (studioVersion !== 'v2' || v2Phase !== 'editing') {
      return undefined;
    }
    const id = window.setTimeout(() => {
      setGenerated((prev) => {
        if (!prev?.carouselSlides || prev.format !== 'carousel') {
          return prev;
        }
        const slides = [...prev.carouselSlides];
        slides[carouselSlideIndex] = { ...draft };
        return { ...prev, carouselSlides: slides };
      });
    }, 400);
    return () => clearTimeout(id);
  }, [draft, generated?.format, generated?.carouselSlides?.length, carouselSlideIndex, studioVersion, v2Phase]);

  const generateFromV2Prompt = useCallback(async () => {
    if (!canGenerateFromV2Prompt) {
      return;
    }
    setV2FromPromptError(null);
    setV2FromPromptLoading(true);
    if (format === 'carousel') {
      setHeroAiUrl(null);
      setStaticHeroImageMap({});
      setHeroShieldPreferred(true);
      const result = await generateCarouselFromPrompt({
        apiKey: openaiApiKey,
        userPrompt: v2UserPrompt.trim(),
        slideCount: clampCarouselSlideCount(carouselSlideCount),
      });
      setV2FromPromptLoading(false);
      if (!result.ok) {
        setV2FromPromptError(result.message);
        return;
      }
      const slides = result.slides.map((s) => ({ ...s, hashtags: s.hashtags.trim() }));
      const first = slides[0]!;
      setCarouselSlideIndex(0);
      setDraft(first);
      setGenerated({
        content: first,
        format: 'carousel',
        theme,
        includeVisual,
        carouselSlides: slides,
        carouselHeroUrls: slides.map(() => null),
        carouselPlan: result.plan,
        carouselCampaignBrief: v2UserPrompt.trim(),
      });
      if (includeVisual && heroUiTab === 'ai' && openaiApiKey.trim()) {
        setCarouselHeroBusy(true);
        const campaignBrief = v2UserPrompt.trim();
        const plan = result.plan;
        try {
          await mapWithConcurrency(slides, CAROUSEL_HERO_GEN_CONCURRENCY, async (_, i) => {
            const ps = plan[i]!;
            const prompt = buildCarouselSlideHeroImagePrompt({
              theme,
              slideIndex: i,
              totalSlides: slides.length,
              planSlide: ps,
              campaignBrief,
              prevVisualSummary: i > 0 ? plan[i - 1]!.visual_direction : undefined,
              nextVisualSummary: i < slides.length - 1 ? plan[i + 1]!.visual_direction : undefined,
            });
            const imgResult = await generateOpenAiHeroImage({
              prompt,
              format: 'carousel',
              apiKey: openaiApiKey,
            });
            const finalUrl = await finalizeHeroDataUrl(imgResult);
            setGenerated((prev) => {
              if (!prev?.carouselSlides?.length || prev.format !== 'carousel') {
                return prev;
              }
              const nextUrls = [...(prev.carouselHeroUrls ?? prev.carouselSlides.map(() => null))];
              while (nextUrls.length < prev.carouselSlides.length) {
                nextUrls.push(null);
              }
              nextUrls[i] = finalUrl;
              return { ...prev, carouselHeroUrls: nextUrls };
            });
            if (finalUrl) {
              setHeroUiTab('ai');
              setHeroShieldPreferred(false);
              if (i === carouselSlideIndexRef.current) {
                setHeroAiUrl(finalUrl);
              }
            }
            return finalUrl;
          });
        } finally {
          setCarouselHeroBusy(false);
        }
      }
    } else {
      const result = await generatePosterContentFromPrompt({
        apiKey: openaiApiKey,
        userPrompt: v2UserPrompt.trim(),
      });
      setV2FromPromptLoading(false);
      if (!result.ok) {
        setV2FromPromptError(result.message);
        return;
      }
      const content = { ...result.content, hashtags: result.content.hashtags.trim() };
      setDraft(content);
      setGenerated({
        content,
        format,
        theme,
        includeVisual,
      });
    }
    setSelected(0);
    setNcCopyIdx(0);
    setLightbox(null);
    setHeroAiError(null);
    setV2Phase('editing');
    setV2ShowCopyEditor(false);
    if (format !== 'carousel') {
      setHeroAiUrl(null);
      setStaticHeroImageMap({});
      setHeroShieldPreferred(true);
    } else if (!includeVisual || !openaiApiKey.trim() || heroUiTab !== 'ai') {
      setHeroAiUrl(null);
      setStaticHeroImageMap({});
      setHeroShieldPreferred(true);
    }
    // carousel + visuals + API key: hero loop already set shield off and hero URL; do not reset here
  }, [
    canGenerateFromV2Prompt,
    openaiApiKey,
    v2UserPrompt,
    format,
    theme,
    includeVisual,
    carouselSlideCount,
    heroUiTab,
  ]);

  const onPanelFooterPrimary = useCallback(() => {
    if (v2PrimaryUsesPromptPipeline) {
      void generateFromV2Prompt();
      return;
    }
    generate();
  }, [v2PrimaryUsesPromptPipeline, generateFromV2Prompt, generate]);

  const caption = useMemo(() => {
    if (!generated) {
      return '';
    }
    return buildLinkedInCaption(previewContent);
  }, [generated, previewContent]);
  const generatedFmt = generated ? LINKEDIN_FORMATS[generated.format] : null;

  const runPosterExport = useCallback(
    async (node: HTMLDivElement | null, filenameSuffix: string) => {
      if (!generated || !generatedFmt || !node) {
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
        const safe = filenameSuffix.replace(/[^a-zA-Z0-9-_]+/g, '-');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `ultron-linkedin-${generated.format}-${safe}-${Date.now()}.png`;
        a.click();
      } catch (e) {
        console.error(e);
        window.alert(
          'Could not export the image. If this persists, try a different browser or check the console.'
        );
      } finally {
        setDownloading(false);
      }
    },
    [generated, generatedFmt]
  );

  type CarouselExportAsset = { filename: string; dataUrl: string };

  const collectCarouselSlidePngs = useCallback(async (): Promise<CarouselExportAsset[]> => {
    if (
      !generated ||
      generated.format !== 'carousel' ||
      !generated.carouselSlides?.length ||
      !generatedFmt
    ) {
      return [];
    }
    const slides = generated.carouselSlides;
    const { width: capW, height: capH } = generatedFmt;
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = `position:fixed;left:-32000px;top:0;width:${capW}px;height:${capH}px;overflow:visible;opacity:0;pointer-events:none;z-index:0`;
    document.body.appendChild(host);
    const out: CarouselExportAsset[] = [];
    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      for (let i = 0; i < slides.length; i++) {
        const slideContent = slides[i]!;
        const vars = buildVariations(slideContent);
        const vv = vars[Math.min(selected, vars.length - 1)]!;
        const box = document.createElement('div');
        host.appendChild(box);
        const root = createRoot(box);
        root.render(
          <PosterCard
            format={generated.format}
            theme={generated.theme}
            content={slideContent}
            variation={vv}
            includeVisual={generated.includeVisual}
            heroImageUrl={heroUrlForExportSlide(i)}
            heroImageLoading={false}
            heroImageObjectFit={resolvedHeroImageObjectFit}
            heroMatchPosterBackdrop={heroMatchPosterBackdrop}
            slidePager={{ current: i + 1, total: slides.length }}
          />
        );
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        await new Promise((r) => setTimeout(r, 120));
        const node = box.firstElementChild as HTMLDivElement | null;
        if (!node) {
          root.unmount();
          host.removeChild(box);
          continue;
        }
        const dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio: EXPORT_PIXEL_RATIO,
          width: generatedFmt.width,
          height: generatedFmt.height,
        });
        root.unmount();
        host.removeChild(box);
        const n = String(i + 1).padStart(2, '0');
        out.push({
          filename: `carousel-slide-${n}-v${selected + 1}.png`,
          dataUrl,
        });
      }
    } finally {
      host.remove();
    }
    return out;
  }, [
    generated,
    generatedFmt,
    selected,
    heroUrlForExportSlide,
    resolvedHeroImageObjectFit,
    heroMatchPosterBackdrop,
  ]);

  const runCarouselExportIndividualPngs = useCallback(async () => {
    const files = await collectCarouselSlidePngs();
    if (!files.length) {
      return;
    }
    setDownloading(true);
    try {
      for (const f of files) {
        const a = document.createElement('a');
        a.href = f.dataUrl;
        a.download = `${f.filename.replace(/\.png$/i, '')}-${Date.now()}.png`;
        a.click();
        await new Promise((r) => setTimeout(r, 200));
      }
    } catch (e) {
      console.error(e);
      window.alert(
        'Could not export one or more slides. If this persists, try a different browser or check the console.'
      );
    } finally {
      setDownloading(false);
    }
  }, [collectCarouselSlidePngs]);

  const runCarouselExportZip = useCallback(async () => {
    const files = await collectCarouselSlidePngs();
    if (!files.length) {
      return;
    }
    setDownloading(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (const f of files) {
        const comma = f.dataUrl.indexOf(',');
        const b64 = comma >= 0 ? f.dataUrl.slice(comma + 1) : '';
        if (!b64) {
          continue;
        }
        zip.file(f.filename, b64, { base64: true });
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ultron-linkedin-carousel-v${selected + 1}-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      window.alert('Could not build ZIP. If this persists, check the console.');
    } finally {
      setDownloading(false);
    }
  }, [collectCarouselSlidePngs, selected]);

  const runCarouselExportPdf = useCallback(async () => {
    const files = await collectCarouselSlidePngs();
    if (!files.length || !generatedFmt) {
      return;
    }
    setDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const w = generatedFmt.width;
      const h = generatedFmt.height;
      const pdf = new jsPDF({
        unit: 'px',
        format: [w, h],
        orientation: w >= h ? 'landscape' : 'portrait',
        hotfixes: ['px_scaling'],
      });
      files.forEach((f, i) => {
        if (i > 0) {
          pdf.addPage([w, h], w >= h ? 'l' : 'p');
        }
        pdf.addImage(f.dataUrl, 'PNG', 0, 0, w, h, undefined, 'FAST');
      });
      pdf.save(`ultron-linkedin-carousel-v${selected + 1}-${Date.now()}.pdf`);
    } catch (e) {
      console.error(e);
      window.alert('Could not build PDF. If this persists, check the console.');
    } finally {
      setDownloading(false);
    }
  }, [collectCarouselSlidePngs, generatedFmt, selected]);

  const onDownloadLightbox = useCallback(() => {
    if (lightbox === null) {
      return;
    }
    const isCarouselDoc = generated?.format === 'carousel' && Boolean(generated.carouselSlides?.length);
    const suffix = isCarouselDoc ? `v${lightbox + 1}` : `c${lightbox + 1}-layout-${selected + 1}`;
    void runPosterExport(lightboxExportRef.current, suffix);
  }, [lightbox, generated?.format, generated?.carouselSlides?.length, selected, runPosterExport]);

  const onCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      window.prompt('Copy caption', caption);
    }
  };

  const onUpdatePosterCopyRoute = useCallback(() => {
    setGenerated((prev) => {
      if (!prev || (prev.format === 'carousel' && prev.carouselSlides?.length)) {
        return prev;
      }
      return { ...prev, content: applyDraftToPosterCopyRoute(prev.content, ncCopyIdx, draft) };
    });
  }, [ncCopyIdx, draft]);

  useLayoutEffect(() => {
    document.body.classList.toggle('lightbox-open', lightbox !== null);
    return () => document.body.classList.remove('lightbox-open');
  }, [lightbox]);

  useEffect(() => {
    if (!carouselExportMenu) {
      return undefined;
    }
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (workspaceCarouselDownloadRef.current?.contains(t)) {
        return;
      }
      if (lightboxCarouselDownloadRef.current?.contains(t)) {
        return;
      }
      setCarouselExportMenu(null);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [carouselExportMenu]);

  useLayoutEffect(() => {
    if (lightbox !== null) {
      lightboxDialogRef.current?.focus();
    }
  }, [lightbox]);

  useLayoutEffect(() => {
    if (lightbox === null) {
      return;
    }
    const isCarouselDoc = generated?.format === 'carousel' && Boolean(generated.carouselSlides?.length);
    if (isCarouselDoc) {
      if (variations.length > 1) {
        document
          .querySelector<HTMLElement>(`[data-lightbox-thumb="${lightbox}"]`)
          ?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
      }
      return;
    }
    if (copyStripVariations.length > 1) {
      document
        .querySelector<HTMLElement>(`[data-lightbox-copy-thumb="${lightbox}"]`)
        ?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }
  }, [
    lightbox,
    variations.length,
    generated?.format,
    generated?.carouselSlides?.length,
    copyStripVariations.length,
  ]);

  useLayoutEffect(() => {
    if (lightbox === null || generated?.format !== 'carousel' || !generated.carouselSlides?.length) {
      return;
    }
    document
      .querySelector<HTMLElement>(`[data-lightbox-carousel-thumb="${carouselSlideIndex}"]`)
      ?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
  }, [lightbox, generated?.format, generated?.carouselSlides?.length, carouselSlideIndex]);

  const g = generated;
  const isCarouselDoc = Boolean(g?.format === 'carousel' && g.carouselSlides && g.carouselSlides.length > 0);

  useEffect(() => {
    if (lightbox === null || !g || variations.length === 0) {
      return;
    }
    const nVar = variations.length;
    const nSlides = g.carouselSlides?.length ?? 0;
    const isCarouselLightbox = g.format === 'carousel' && nSlides > 0;
    const nCopy = copyStripVariations.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightbox(null);
        return;
      }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
        return;
      }
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      if (isCarouselLightbox && nSlides > 1) {
        e.preventDefault();
        const nextIdx =
          e.key === 'ArrowLeft'
            ? (carouselSlideIndex - 1 + nSlides) % nSlides
            : (carouselSlideIndex + 1) % nSlides;
        goCarouselSlide(nextIdx);
        return;
      }
      if (!isCarouselLightbox) {
        if (nCopy <= 1) {
          return;
        }
        e.preventDefault();
        const current = lightbox;
        const next = e.key === 'ArrowLeft' ? (current - 1 + nCopy) % nCopy : (current + 1) % nCopy;
        setNcCopyIdx(next);
        setLightbox(next);
        return;
      }
      if (nVar <= 1) {
        return;
      }
      e.preventDefault();
      const current = lightbox;
      const next = e.key === 'ArrowLeft' ? (current - 1 + nVar) % nVar : (current + 1) % nVar;
      setSelected(next);
      setLightbox(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    lightbox,
    g,
    variations.length,
    carouselSlideIndex,
    goCarouselSlide,
    copyStripVariations.length,
  ]);

  useEffect(() => {
    if (!g || lightbox !== null || isCarouselDoc || copyStripVariations.length === 0) {
      return;
    }
    const grid = posterOptionsGridRef.current;
    if (!grid) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
        return;
      }
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) {
        return;
      }
      if (!grid.contains(document.activeElement)) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      e.preventDefault();
      const n = copyStripVariations.length;
      setNcCopyIdx((i) => (e.key === 'ArrowLeft' ? (i - 1 + n) % n : (i + 1) % n));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [g, lightbox, isCarouselDoc, copyStripVariations.length]);

  useEffect(() => {
    if (!g || lightbox !== null || variations.length === 0) {
      return;
    }
    const grid = variationGridRef.current;
    if (!grid) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
        return;
      }
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) {
        return;
      }
      if (!grid.contains(document.activeElement)) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      e.preventDefault();
      const n = variations.length;
      setSelected((i) => (e.key === 'ArrowLeft' ? (i - 1 + n) % n : (i + 1) % n));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [g, lightbox, variations.length]);

  const posterFormat = g?.format ?? 'landscape';
  const posterTheme = g?.theme ?? 'dark';
  const exportReady = Boolean(g && v);

  return (
    <>
      <div className="app-view">
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
          <div className="app-header__tools" role="group" aria-label="Workspace shortcuts">
            <button
              type="button"
              className="btn btn-cyber-ghost btn--header-tool"
              onClick={fillDemoCopy}
              disabled={isBooting || (studioVersion === 'v2' && v2FromPromptLoading)}
            >
              Prefill data
            </button>
            <button
              type="button"
              className="btn btn-cyber-ghost btn--header-tool"
              onClick={clearAll}
              disabled={isBooting}
              aria-label="Clear copy and generated creatives"
            >
              Clear
            </button>
          </div>
          <span className="app-header__sep" aria-hidden />
          <div className="studio-version-toggle" role="group" aria-label="Studio mode">
            <button
              type="button"
              className={`studio-version-toggle__btn${studioVersion === 'v1' ? ' is-active' : ''}`}
              aria-pressed={studioVersion === 'v1'}
              onClick={() => {
                setStudioVersion('v1');
                setFormat((f) => (f === 'carousel' ? 'landscape' : f));
                setGenerated((gen) => (gen?.format === 'carousel' ? null : gen));
                setCarouselSlideIndex(0);
                setV2ShowCopyEditor(false);
              }}
            >
              V1
            </button>
            <button
              type="button"
              className={`studio-version-toggle__btn${studioVersion === 'v2' ? ' is-active' : ''}`}
              aria-pressed={studioVersion === 'v2'}
              onClick={() => {
                setStudioVersion('v2');
                setV2Phase('prompt');
                setV2FromPromptError(null);
                setV2ShowCopyEditor(false);
              }}
            >
              V2
            </button>
          </div>
          <div className="app-header__tail">
            <div className="shell-theme-toggle" role="group" aria-label="Studio appearance">
              <button
                type="button"
                className={`shell-theme-toggle__btn${shellTheme === 'dark' ? ' is-active' : ''}`}
                aria-pressed={shellTheme === 'dark'}
                onClick={() => setShellTheme('dark')}
              >
                Dark
              </button>
              <button
                type="button"
                className={`shell-theme-toggle__btn${shellTheme === 'light' ? ' is-active' : ''}`}
                aria-pressed={shellTheme === 'light'}
                onClick={() => setShellTheme('light')}
              >
                Light
              </button>
            </div>
            <div className="app-header__profile-cluster" ref={profileClusterRef}>
            {user ? (
              <>
                <button
                  type="button"
                  className="app-header__profile-trigger"
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                  title={user.email}
                  onClick={() => setProfileMenuOpen((o) => !o)}
                >
                  {user.kind === 'google' && user.picture ? (
                    <img
                      className="app-header__user-avatar"
                      src={user.picture}
                      alt=""
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span
                      className="app-header__user-avatar app-header__user-avatar--placeholder"
                      aria-hidden
                    >
                      {displayInitialFromUser(user)}
                    </span>
                  )}
                  <span className="app-header__user-name">{displayShortNameFromUser(user)}</span>
                </button>
                {profileMenuOpen ? (
                  <div className="app-header__profile-menu" role="menu">
                    <button
                      type="button"
                      className="app-header__profile-menu-item"
                      role="menuitem"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onSignOut();
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
          </div>
        </div>
      </header>

      <div className="studio">
        <aside className="panel" aria-label="Ultron creative inputs">
        <div className="panel-body">
          <section className="panel-section panel-section--output" aria-labelledby="section-style">
            <h2 id="section-style" className="panel-group__title">
              Style
            </h2>
            <div className="field field--spaced field--compact">
              <span className="field-label">Format</span>
              <select
                className="select input--compact"
                value={format}
                onChange={(e) => {
                  const next = e.target.value as LinkedInFormatId;
                  setFormat(next);
                  if (next === 'carousel') {
                    setCarouselSlideIndex(0);
                    setCarouselSlideCount((c) => clampCarouselSlideCount(c));
                  }
                }}
                aria-label="LinkedIn image format"
              >
                {Object.entries(LINKEDIN_FORMATS)
                  .filter(([id]) => studioVersion === 'v2' || id !== 'carousel')
                  .map(([id, f]) => (
                    <option key={id} value={id}>
                      {f.label} — {f.width}×{f.height}px
                    </option>
                  ))}
              </select>
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
            </div>
          </section>

          <section className="panel-section panel-section--copy" aria-labelledby="section-content">
            <h2 id="section-content" className="panel-group__title panel-group__title--copy">
              Content
            </h2>
            {studioVersion === 'v2' && v2Phase === 'editing' && generated ? (
              <button
                type="button"
                className="v2-edit-copy-icon-btn"
                onClick={() => {
                  setV2ShowCopyEditor((show) => {
                    const opening = !show;
                    if (opening && generated && v2Phase === 'editing' && v) {
                      setDraft(draftSliceFromVariation(generated.content, v));
                    }
                    return opening;
                  });
                }}
                aria-pressed={v2ShowCopyEditor}
                aria-label={v2ShowCopyEditor ? 'Hide field editor' : 'Edit fields'}
                title={v2ShowCopyEditor ? 'Hide field editor' : 'Edit fields'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden focusable="false">
                  <path
                    fill="currentColor"
                    d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"
                  />
                </svg>
              </button>
            ) : null}
            {studioVersion === 'v2' ? (
              <>
                <div className="field field--compact">
                  <label htmlFor="v2-prompt">Campaign prompt</label>
                  <textarea
                    id="v2-prompt"
                    className="textarea textarea--v2-prompt"
                    value={v2UserPrompt}
                    onChange={(e) => setV2UserPrompt(e.target.value)}
                    rows={8}
                    placeholder="e.g. Launch ACKO motor floater for SMB fleets in NCR—confident, data-led, CFO-friendly."
                    disabled={v2FromPromptLoading}
                  />
                </div>
                {format === 'carousel' ? (
                  <div className="field field--compact">
                    <label htmlFor="carousel-slide-count">Carousel slides</label>
                    <input
                      id="carousel-slide-count"
                      className="input input--compact"
                      type="number"
                      min={CAROUSEL_SLIDE_COUNT.min}
                      max={CAROUSEL_SLIDE_COUNT.max}
                      value={carouselSlideCount}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isFinite(n)) {
                          return;
                        }
                        setCarouselSlideCount(
                          clampCarouselSlideCount(Math.round(n))
                        );
                      }}
                      disabled={v2FromPromptLoading}
                    />
                  </div>
                ) : null}
                {v2FromPromptError ? (
                  <p className="login-form__err" style={{ marginTop: 8 }}>
                    {v2FromPromptError}
                  </p>
                ) : null}
                {studioVersion === 'v2' && v2Phase === 'editing' && v2ShowCopyEditor ? (
                  <>
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
                        rows={1}
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
                        <label htmlFor="footnote">Footer</label>
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
                    </div>

                    {generated &&
                    generated.format !== 'carousel' &&
                    !(generated.carouselSlides && generated.carouselSlides.length) ? (
                      <div className="field field--compact">
                        <button
                          type="button"
                          className="btn btn-cyber btn--compact"
                          onClick={() => void onUpdatePosterCopyRoute()}
                        >
                          Update copy
                        </button>
                      </div>
                    ) : null}

                    {generated?.format === 'carousel' && generated.carouselSlides?.length ? (
                      <div className="carousel-slide-strip" role="tablist" aria-label="Carousel slides">
                        {generated.carouselSlides.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            role="tab"
                            aria-selected={carouselSlideIndex === idx}
                            className={`carousel-slide-strip__btn${carouselSlideIndex === idx ? ' is-active' : ''}`}
                            onClick={() => goCarouselSlide(idx)}
                          >
                            {idx + 1}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="v2-editing-toolbar">
                      <button
                        type="button"
                        className="btn btn-cyber-ghost btn--compact"
                        onClick={() => {
                          setV2Phase('prompt');
                          setGenerated(null);
                          setSelected(0);
                          setNcCopyIdx(0);
                          setLightbox(null);
                          setCarouselSlideIndex(0);
                          setV2ShowCopyEditor(false);
                          setHeroLibrary('default');
                          setHeroUiTab('default');
                          setHeroAiUrl(null);
                          setStaticHeroImageMap({});
                          setHeroAiError(null);
                          setHeroShieldPreferred(true);
                        }}
                      >
                        New campaign prompt
                      </button>
                    </div>
                  </>
                ) : null}
              </>
            ) : (
              <>
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
                    rows={1}
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
                    <label htmlFor="footnote">Footer</label>
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
                </div>
              </>
            )}
          </section>

          <section className="panel-section panel-section--output panel-section--visuals" aria-labelledby="section-visuals">
            <div className="visuals-section-header">
              <h2 id="section-visuals" className="panel-group__title">
                Visuals
              </h2>
              <button
                type="button"
                className={`visuals-toggle${includeVisual ? ' is-on' : ''}`}
                role="switch"
                aria-checked={includeVisual}
                onClick={() => setIncludeVisual((on) => !on)}
                aria-label="Show hero visual on poster"
              >
                <span className="visuals-toggle__track" aria-hidden>
                  <span className="visuals-toggle__thumb" />
                </span>
                <span className="visuals-toggle__label">{includeVisual ? 'On' : 'Off'}</span>
              </button>
            </div>

            {includeVisual ? (
              <div className="hero-source-panel" aria-labelledby="hero-artwork-label">
                <span className="field-label" id="hero-artwork-label">
                  Hero source
                </span>
                <div className="hero-source-tabs" role="tablist" aria-label="Hero artwork source">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={heroUiTab === 'default'}
                    className={`hero-source-tab${heroUiTab === 'default' ? ' is-active' : ''}`}
                    onClick={openDefaultHero}
                  >
                    Default
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={heroUiTab === 'library'}
                    className={`hero-source-tab${heroUiTab === 'library' ? ' is-active' : ''}`}
                    onClick={openLibraryHero}
                  >
                    Library
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={heroUiTab === 'ai'}
                    className={`hero-source-tab${heroUiTab === 'ai' ? ' is-active' : ''}`}
                    onClick={openAiHeroTab}
                  >
                    AI
                  </button>
                </div>
                <p className="hero-status-chip" aria-live="polite">
                  {heroStatusLabel}
                </p>

                {heroAiThumbPreviewUrl ? (
                  <div className="hero-ai-saved-row">
                    <div
                      className={`hero-ai-saved-row__thumb-wrap${heroImageLoading ? ' hero-ai-saved-row__thumb-wrap--shimmer' : ''}`}
                      aria-hidden
                    >
                      <img src={heroAiThumbPreviewUrl} alt="" className="hero-ai-saved-row__thumb" decoding="async" />
                    </div>
                  </div>
                ) : null}

                {heroUiTab === 'library' ? (
                  <div className="hero-source-body">
                    <div className="hero-visual-picker hero-visual-picker--library-only" role="radiogroup">
                      {HERO_LIBRARY_ENTRIES.map((entry) => (
                        <label
                          key={entry.id}
                          className={`hero-visual-option${heroLibrary === entry.id ? ' is-selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name="heroLibraryOnly"
                            value={entry.id}
                            className="hero-visual-option__input"
                            checked={heroLibrary === entry.id}
                            onChange={() => {
                              setHeroUiTab('library');
                              setHeroLibrary(entry.id);
                              setHeroShieldPreferred(false);
                              setHeroAiError(null);
                            }}
                          />
                          <span className="hero-visual-option__thumb">
                            <img src={heroLibraryAssetUrl(entry.id)} alt="" decoding="async" />
                          </span>
                          <span className="hero-visual-option__label">{entry.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                {heroUiTab === 'ai' ? (
                  <div className="hero-source-body">
                    {heroImageLoading ? (
                      <div
                        className="hero-ai-slot-preview hero-ai-slot-preview--shimmer"
                        aria-hidden
                        title="Generating hero preview"
                      />
                    ) : null}
                    <div className="row-2" style={{ marginTop: 6 }}>
                      <button
                        type="button"
                        className="btn btn-cyber-ghost btn--compact"
                        onClick={generateOpenAiHero}
                        disabled={
                          !g ||
                          !v ||
                          !includeVisual ||
                          heroAiLoading ||
                          carouselHeroBusy ||
                          isBooting ||
                          heroLibrary !== 'default'
                        }
                      >
                        {heroAiLoading || carouselHeroBusy ? 'Generating…' : 'Generate AI visual'}
                      </button>
                      {showClearAiVisual ? (
                        <button
                          type="button"
                          className="btn btn-cyber-ghost btn--compact"
                          onClick={() => {
                            if (g?.format === 'carousel' && g.carouselSlides?.length) {
                              setHeroAiUrl(null);
                              setHeroAiError(null);
                              setHeroShieldPreferred(true);
                              setHeroUiTab('ai');
                              setGenerated((prev) => {
                                if (!prev || prev.format !== 'carousel' || !prev.carouselSlides?.length) {
                                  return prev;
                                }
                                const idx = carouselSlideIndexRef.current;
                                const nextUrls = [...(prev.carouselHeroUrls ?? prev.carouselSlides.map(() => null))];
                                while (nextUrls.length < prev.carouselSlides.length) {
                                  nextUrls.push(null);
                                }
                                nextUrls[idx] = null;
                                return { ...prev, carouselHeroUrls: nextUrls };
                              });
                              return;
                            }
                            setHeroAiError(null);
                            setHeroShieldPreferred(true);
                            setHeroUiTab('ai');
                            setStaticHeroImageMap({});
                          }}
                          disabled={heroAiLoading || carouselHeroBusy}
                        >
                          Clear AI visual
                        </button>
                      ) : null}
                    </div>
                    {heroAiError ? (
                      <p className="login-form__err" style={{ marginTop: 8 }}>
                        {heroAiError}
                      </p>
                    ) : null}
                    {heroAiHistoryRows.length > 0 ? (
                      <div className="hero-ai-history">
                        <div className="hero-ai-history__head">
                          <span className="hero-ai-history__title">Recent AI heroes</span>
                          <button
                            type="button"
                            className="hero-ai-history__clear"
                            onClick={() => {
                              void (async () => {
                                try {
                                  await clearHeroAiHistory();
                                } catch {
                                  /* ignore */
                                }
                                await refreshHeroAiHistory();
                              })();
                            }}
                            disabled={heroAiLoading || carouselHeroBusy}
                          >
                            Clear list
                          </button>
                        </div>
                        <div className="hero-ai-history__strip" role="list" aria-label="Previously generated AI heroes">
                          {heroAiHistoryRows.map(({ entry, thumbUrl }) => (
                            <button
                              key={entry.id}
                              type="button"
                              className="hero-ai-history__item"
                              role="listitem"
                              title={`${entry.headlinePreview} · ${new Date(entry.createdAt).toLocaleString()}`}
                              onClick={() => void applyHeroAiFromHistory(entry)}
                              disabled={heroAiLoading || carouselHeroBusy}
                            >
                              <img src={thumbUrl} alt="" decoding="async" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>

        <div className="panel-footer">
          <button
            type="button"
            className="btn-cyber-generate"
            onClick={onPanelFooterPrimary}
            disabled={!canGenerate || footerPrimaryBusy}
            aria-busy={footerPrimaryBusy}
          >
            <span className="btn-cyber-generate__glow" aria-hidden />
            <span className="btn-cyber-generate__text">{footerPrimaryLabel}</span>
          </button>
        </div>
      </aside>

      <main className="out-main out-main--workspace" aria-label="Workspace — creative options and description">
        <div className={`workspace-stack${isCarouselDoc ? ' workspace-stack--carousel' : ''}`}>
          <section
            className={`workspace-section workspace-section--options${
              isCarouselDoc ? ' workspace-section--options--carousel' : ''
            }`}
            aria-labelledby={
              g
                ? 'workspace-poster-options-title workspace-options-title'
                : 'workspace-options-title'
            }
          >
            <div className={`preview-options${isCarouselDoc ? ' preview-options--carousel' : ''}`}>
              {isCarouselDoc && g ? (
                <>
                  <div className="workspace-carousel-poster-header-row">
                    <div className="workspace-carousel-poster-header-text">
                      <h2 id="workspace-poster-options-title" className="section-title">
                        Poster options
                      </h2>
                    </div>
                    <div className="workspace-carousel-download" ref={workspaceCarouselDownloadRef}>
                      <button
                        type="button"
                        className="btn btn-export-secondary btn--compact workspace-btn-download-carousel workspace-carousel-download__toggle"
                        aria-expanded={carouselExportMenu === 'workspace'}
                        aria-haspopup="menu"
                        disabled={downloading || !exportReady}
                        onClick={() =>
                          setCarouselExportMenu((m) => (m === 'workspace' ? null : 'workspace'))
                        }
                      >
                        {downloading ? 'Exporting…' : 'Download carousel'}
                        <span className="workspace-carousel-download__chev" aria-hidden>
                          ▾
                        </span>
                      </button>
                      {carouselExportMenu === 'workspace' ? (
                        <ul className="workspace-carousel-download__menu" role="menu">
                          <li>
                            <button
                              type="button"
                              role="menuitem"
                              className="carousel-export-menu__item"
                              disabled={downloading || !exportReady}
                              onClick={() => {
                                setCarouselExportMenu(null);
                                void runCarouselExportPdf();
                              }}
                            >
                              Download as PDF
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              role="menuitem"
                              className="carousel-export-menu__item"
                              disabled={downloading || !exportReady}
                              onClick={() => {
                                setCarouselExportMenu(null);
                                void runCarouselExportZip();
                              }}
                            >
                              Zipped PNGs (.zip)
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              role="menuitem"
                              className="carousel-export-menu__item"
                              disabled={downloading || !exportReady}
                              onClick={() => {
                                setCarouselExportMenu(null);
                                void runCarouselExportIndividualPngs();
                              }}
                            >
                              Individual PNG files
                            </button>
                          </li>
                        </ul>
                      ) : null}
                    </div>
                  </div>
                  <div className="workspace-carousel-story" aria-label="LinkedIn carousel — full document preview">
                    <div className="workspace-carousel-story__scroll" role="tablist" aria-label="Carousel slides">
                      {g.carouselSlides!.map((slideContent, idx) => {
                        const slideVars = buildVariations(slideContent);
                        const vv = slideVars[Math.min(selected, slideVars.length - 1)]!;
                        const heroUrl = heroUrlForExportSlide(idx);
                        const slideHeroBusy = Boolean(g.includeVisual && carouselHeroBusy && !heroUrl);
                        return (
                          <button
                            key={`ws-car-${idx}`}
                            type="button"
                            role="tab"
                            aria-selected={carouselSlideIndex === idx}
                            className={`workspace-carousel-story__panel${carouselSlideIndex === idx ? ' is-active' : ''}`}
                            onClick={() => {
                              if (idx !== carouselSlideIndex) {
                                goCarouselSlide(idx);
                              }
                              setLightbox(selected);
                            }}
                            aria-label={`Slide ${idx + 1} of ${g.carouselSlides!.length}: ${slideContent.headline.slice(0, 80)}`}
                          >
                            <span className="workspace-carousel-story__badge" aria-hidden>
                              {idx + 1} / {g.carouselSlides!.length}
                            </span>
                            <div
                              className={`workspace-carousel-story__frame${
                                workspaceCopyGenerating ? ' workspace-carousel-story__frame--busy' : ''
                              }`}
                            >
                              {workspaceCopyGenerating ? (
                                <div className="variation-card__thumb-shimmer" aria-hidden />
                              ) : null}
                              <ScaledPreview format="carousel" maxWidth={228} posterTheme={g.theme}>
                                <PosterCard
                                  format="carousel"
                                  theme={g.theme}
                                  content={slideContent}
                                  variation={vv}
                                  includeVisual={g.includeVisual}
                                  heroImageUrl={heroUrl}
                                  heroImageLoading={slideHeroBusy}
                                  heroImageObjectFit={resolvedHeroImageObjectFit}
                                  heroMatchPosterBackdrop={heroMatchPosterBackdrop}
                                  slidePager={{ current: idx + 1, total: g.carouselSlides!.length }}
                                />
                              </ScaledPreview>
                              <ThumbViewCta />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : null}

              {isCarouselDoc && g ? (
                <h2
                  id="workspace-options-title"
                  className="section-title section-title--after-carousel"
                >
                  Design options
                </h2>
              ) : !g ? (
                <h2 id="workspace-options-title" className="section-title">
                  Creative workspace
                </h2>
              ) : null}

              {!g && !workspaceCopyGenerating ? (
                <div className="empty-state" role="status">
                  <div className="empty-state__frame">
                    <p className="empty-state__line1">Ready when you are</p>
                  </div>
                </div>
              ) : null}

              {!g && workspaceCopyGenerating ? (
                <div
                  className="workspace-poster-options-band workspace-poster-options-band--generating"
                  aria-busy
                  aria-label="Generating copy and previews"
                >
                  <div className="workspace-poster-options-grid">
                    {[0, 1, 2, 3].map((i) => {
                      const fmt = LINKEDIN_FORMATS[format];
                      return (
                        <div
                          key={i}
                          className="workspace-poster-options-cell workspace-poster-options-cell--busy"
                          style={{ aspectRatio: `${fmt.width} / ${fmt.height}` }}
                          aria-hidden
                        >
                          <div
                            className="variation-card__thumb-shimmer"
                            style={{ animationDelay: `${i * 0.18}s` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {g ? (
                isCarouselDoc ? (
                  <div className="workspace-carousel-layout-shell">
                    <div
                      ref={variationGridRef}
                      className="variation-grid variation-grid--carousel-compact"
                      role="list"
                      tabIndex={0}
                      aria-label="Design options — use arrow keys when focused"
                    >
                      {variations.map((variation, index) => (
                        <div
                          key={variation.id}
                          className={`variation-card${selected === index ? ' is-selected' : ''}${
                            workspaceCarouselLayoutBusy ? ' variation-card--busy' : ''
                          }`}
                          role="listitem"
                        >
                          <div className="variation-card__thumb-wrap">
                            {workspaceCarouselLayoutBusy ? (
                              <div
                                className="variation-card__thumb-shimmer"
                                style={{ animationDelay: `${index * 0.18}s` }}
                                aria-hidden
                              />
                            ) : null}
                            {index === 0 ? (
                              <span className="variation-card__badge-rec variation-badge" aria-label="Recommended layout">
                                Recommended
                              </span>
                            ) : null}
                            <button
                              type="button"
                              className="preview-thumb-btn"
                              onClick={() => {
                                setSelected(index);
                              }}
                              aria-label={`Select layout ${variation.creativeName ?? `option ${index + 1}`}`}
                            >
                              <ScaledPreview
                                format={posterFormat}
                                className="preview-expand__inner"
                                posterTheme={posterTheme}
                              >
                                <PosterCard
                                  format={posterFormat}
                                  theme={posterTheme}
                                  content={previewContent}
                                  variation={variation}
                                  includeVisual={g.includeVisual}
                                  heroImageUrl={heroUrlForExportSlide(carouselSlideIndex)}
                                  heroImageLoading={false}
                                  heroImageObjectFit={resolvedHeroImageObjectFit}
                                  heroMatchPosterBackdrop={heroMatchPosterBackdrop}
                                  slidePager={carouselSlidePager}
                                />
                              </ScaledPreview>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="workspace-static-doc-shell">
                    <h2 id="workspace-poster-options-title" className="section-title">
                      Poster options
                    </h2>
                    <div className="workspace-poster-options-band">
                      <div
                        ref={posterOptionsGridRef}
                        className="workspace-poster-options-grid"
                        role="list"
                        tabIndex={0}
                        aria-label="Poster options — use arrow keys when focused"
                      >
                        {copyStripVariations.map((copyV, index) => {
                          const layoutSel =
                            variations[Math.min(selected, Math.max(0, variations.length - 1))];
                          const posterOptV =
                            layoutSel && copyV ? mergeCopyAndLayoutVariation(copyV, layoutSel) : copyV;
                          const fmt = LINKEDIN_FORMATS[posterFormat];
                          return (
                            <div
                              key={`po-${copyV.id}`}
                              className={`workspace-poster-options-cell${ncCopyIdx === index ? ' is-selected' : ''}${
                                workspaceCopyGenerating ? ' workspace-poster-options-cell--busy' : ''
                              }`}
                              style={{ aspectRatio: `${fmt.width} / ${fmt.height}` }}
                              role="listitem"
                            >
                              {workspaceCopyGenerating ? (
                                <div
                                  className="variation-card__thumb-shimmer"
                                  style={{ animationDelay: `${index * 0.2}s` }}
                                  aria-hidden
                                />
                              ) : null}
                              <button
                                type="button"
                                className="workspace-poster-options-hit"
                                onClick={() => {
                                  setNcCopyIdx(index);
                                  setLightbox(index);
                                }}
                                aria-label={`View poster option ${copyV.creativeName ?? `option ${index + 1}`}`}
                              >
                                <ScaledPreview
                                  format={posterFormat}
                                  className="preview-expand__inner workspace-poster-options-preview"
                                  posterTheme={posterTheme}
                                  maxWidth={720}
                                >
                                <PosterCard
                                  format={posterFormat}
                                  theme={posterTheme}
                                  content={previewContent}
                                  variation={posterOptV}
                                  includeVisual={g.includeVisual}
                                  heroImageUrl={staticAiHeroUrlForMerged(posterOptV, index)}
                                  heroImageLoading={thumbHeroLoading(index, posterOptV)}
                                    heroImageObjectFit={resolvedHeroImageObjectFit}
                                    heroMatchPosterBackdrop={heroMatchPosterBackdrop}
                                    slidePager={carouselSlidePager}
                                  />
                                </ScaledPreview>
                                <ThumbViewCta />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <h2
                      id="workspace-options-title"
                      className="section-title section-title--after-carousel workspace-static-layout-heading"
                    >
                      Design options
                    </h2>
                    <div className="workspace-carousel-layout-shell workspace-static-layout-shell">
                      <div
                        ref={variationGridRef}
                        className="variation-grid variation-grid--carousel-compact"
                        role="list"
                        tabIndex={0}
                        aria-label="Design options — use arrow keys when focused"
                      >
                        {variations.map((layoutVar, index) => {
                          const copyV =
                            copyStripVariations[
                              Math.min(ncCopyIdx, Math.max(0, copyStripVariations.length - 1))
                            ];
                          const stripVariation =
                            copyV && layoutVar ? mergeCopyAndLayoutVariation(copyV, layoutVar) : layoutVar;
                          return (
                          <div
                            key={layoutVar.id}
                            className={`variation-card${selected === index ? ' is-selected' : ''}${
                              workspaceCopyGenerating ? ' variation-card--busy' : ''
                            }`}
                            role="listitem"
                          >
                            <div className="variation-card__thumb-wrap">
                              {workspaceCopyGenerating ? (
                                <div
                                  className="variation-card__thumb-shimmer"
                                  style={{ animationDelay: `${index * 0.2}s` }}
                                  aria-hidden
                                />
                              ) : null}
                              <button
                                type="button"
                                className="preview-thumb-btn"
                                onClick={() => {
                                  setSelected(index);
                                }}
                                aria-label={`Select layout ${layoutVar.creativeName ?? `option ${index + 1}`}`}
                              >
                                <ScaledPreview
                                  format={posterFormat}
                                  className="preview-expand__inner"
                                  posterTheme={posterTheme}
                                >
                                  <PosterCard
                                    format={posterFormat}
                                    theme={posterTheme}
                                    content={previewContent}
                                    variation={stripVariation}
                                    includeVisual={g.includeVisual}
                                    heroImageUrl={staticAiHeroUrlForMerged(stripVariation, ncCopyIdx)}
                                    heroImageLoading={false}
                                    heroImageObjectFit={resolvedHeroImageObjectFit}
                                    heroMatchPosterBackdrop={heroMatchPosterBackdrop}
                                    slidePager={carouselSlidePager}
                                  />
                                </ScaledPreview>
                              </button>
                            </div>
                          </div>
                        );
                        })}
                      </div>
                    </div>
                  </div>
                )
              ) : null}
            </div>
          </section>

          <section
            className={`workspace-section workspace-section--caption${
              isCarouselDoc ? ' workspace-section--caption--carousel' : ''
            }`}
            aria-labelledby="workspace-description-title"
          >
            <div
              className={`caption-block caption-block--subtle${isCarouselDoc ? ' caption-block--carousel' : ''}`}
            >
              <header className="caption-block__toolbar">
                <div
                  className={`caption-block__title-row${isCarouselDoc ? ' caption-block__title-row--carousel' : ''}`}
                >
                  <h2 id="workspace-description-title" className="section-title">
                    Description
                  </h2>
                  <span className="chars" aria-live="polite">
                    {caption.length} chars
                  </span>
                  {isCarouselDoc ? (
                    <button
                      type="button"
                      className="btn-caption-copy-mini"
                      onClick={() => void onCopyCaption()}
                      disabled={!g}
                    >
                      Copy
                    </button>
                  ) : null}
                </div>
                {isCarouselDoc ? null : (
                  <div className="caption-block__actions">
                    <button
                      type="button"
                      className="btn btn-export-secondary btn--compact"
                      onClick={() => void onCopyCaption()}
                      disabled={!g}
                    >
                      Copy caption
                    </button>
                    {g?.format === 'carousel' && g.carouselSlides && g.carouselSlides.length > 1 ? (
                      <button
                        type="button"
                        className="btn btn-export-secondary btn--compact"
                        onClick={runCarouselExportIndividualPngs}
                        disabled={downloading || !exportReady}
                      >
                        {downloading ? 'Exporting…' : `Download all ${g.carouselSlides.length} slides`}
                      </button>
                    ) : null}
                  </div>
                )}
              </header>
              <p className="caption-text">{caption}</p>
              {g && !exportReady ? (
                <p className="caption-block__hint" role="note">
                  Generate creatives to enable export from the preview (download PNG).
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </main>
      </div>
      </div>

      {g && lightbox !== null && lightboxPosterVariation ? (
        <div
          className={`lightbox-backdrop${
            g.format === 'carousel' && g.carouselSlides && g.carouselSlides.length > 0
              ? ' lightbox-backdrop--carousel'
              : ''
          }`}
          onClick={() => setLightbox(null)}
          role="presentation"
        >
          <div
            ref={lightboxDialogRef}
            className={`lightbox-dialog${
              g.format === 'carousel' && g.carouselSlides && g.carouselSlides.length > 0
                ? ' lightbox-dialog--carousel'
                : ''
            }`}
            data-poster-format={g.format}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal
            aria-label="Creative preview"
          >
            <div className="lightbox-header">
              <h2 className="lightbox-header__title">Preview visuals</h2>
              <div className="lightbox-header__actions">
                {g.format === 'carousel' && g.carouselSlides && g.carouselSlides.length > 0 ? (
                  <div className="lightbox-carousel-download" ref={lightboxCarouselDownloadRef}>
                    <button
                      type="button"
                      className="lightbox-download lightbox-carousel-download__toggle"
                      aria-expanded={carouselExportMenu === 'lightbox'}
                      aria-haspopup="menu"
                      disabled={downloading || !g}
                      onClick={() =>
                        setCarouselExportMenu((m) => (m === 'lightbox' ? null : 'lightbox'))
                      }
                    >
                      {downloading ? 'Exporting…' : 'Download carousel'}
                      <span className="lightbox-carousel-download__chev" aria-hidden>
                        ▾
                      </span>
                    </button>
                    {carouselExportMenu === 'lightbox' ? (
                      <ul className="lightbox-carousel-download__menu" role="menu">
                        <li>
                          <button
                            type="button"
                            role="menuitem"
                            className="carousel-export-menu__item"
                            disabled={downloading || !g}
                            onClick={() => {
                              setCarouselExportMenu(null);
                              void runCarouselExportPdf();
                            }}
                          >
                            Download as PDF
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            role="menuitem"
                            className="carousel-export-menu__item"
                            disabled={downloading || !g}
                            onClick={() => {
                              setCarouselExportMenu(null);
                              void runCarouselExportZip();
                            }}
                          >
                            Zipped PNGs (.zip)
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            role="menuitem"
                            className="carousel-export-menu__item"
                            disabled={downloading || !g}
                            onClick={() => {
                              setCarouselExportMenu(null);
                              void runCarouselExportIndividualPngs();
                            }}
                          >
                            Individual PNG files
                          </button>
                        </li>
                      </ul>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="lightbox-download"
                    onClick={onDownloadLightbox}
                    disabled={downloading || !g}
                  >
                    {downloading ? 'Exporting…' : 'Download PNG'}
                  </button>
                )}
                <button
                  type="button"
                  className="lightbox-close lightbox-close--icon"
                  onClick={() => setLightbox(null)}
                  aria-label="Close preview"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden focusable="false">
                    <path
                      fill="currentColor"
                      d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"
                    />
                  </svg>
                </button>
              </div>
            </div>
            {g.format === 'carousel' && g.carouselSlides && g.carouselSlides.length > 0 ? (
              <div className="lightbox-body lightbox-body--carousel">
                <p className="lightbox-carousel-kicker lightbox-carousel-kicker--subtle" role="note">
                  Use the side arrows to change slides; the row below switches layout accent for every slide.
                </p>
                <div className="lightbox-carousel-main-with-nav">
                  {g.carouselSlides.length > 1 ? (
                    <button
                      type="button"
                      className="lightbox-nav lightbox-nav--carousel-edge lightbox-nav--prev"
                      onClick={() => {
                        const n = g.carouselSlides!.length;
                        goCarouselSlide((carouselSlideIndex - 1 + n) % n);
                      }}
                      aria-label="Previous slide"
                    >
                      ←
                    </button>
                  ) : (
                    <span className="lightbox-nav-placeholder lightbox-nav-placeholder--carousel-edge" aria-hidden />
                  )}
                  <div className="lightbox-carousel-main-wrap">
                    {g.includeVisual && carouselHeroBusy && !resolvedHeroImageUrl ? (
                      <div className="lightbox-carousel-main-skeleton" aria-busy aria-label="Generating slide artwork">
                        <div className="lightbox-carousel-main-skeleton__shimmer" />
                      </div>
                    ) : (
                      <div className="lightbox-carousel-main-stage">
                        <LightboxScaledPreview
                          format="carousel"
                          className="lightbox-fit lightbox-fit--carousel-main"
                          posterTheme={g.theme}
                        >
                          <PosterCard
                            format="carousel"
                            theme={g.theme}
                            content={previewContent}
                            variation={lightboxPosterVariation}
                            includeVisual={g.includeVisual}
                            heroImageUrl={resolvedHeroImageUrl}
                            heroImageLoading={heroImageLoading}
                            heroImageObjectFit={resolvedHeroImageObjectFit}
                            heroMatchPosterBackdrop={heroMatchPosterBackdrop}
                            slidePager={carouselSlidePager}
                          />
                        </LightboxScaledPreview>
                      </div>
                    )}
                  </div>
                  {g.carouselSlides.length > 1 ? (
                    <button
                      type="button"
                      className="lightbox-nav lightbox-nav--carousel-edge lightbox-nav--next"
                      onClick={() => {
                        const n = g.carouselSlides!.length;
                        goCarouselSlide((carouselSlideIndex + 1) % n);
                      }}
                      aria-label="Next slide"
                    >
                      →
                    </button>
                  ) : (
                    <span className="lightbox-nav-placeholder lightbox-nav-placeholder--carousel-edge" aria-hidden />
                  )}
                </div>
                <h3 className="lightbox-carousel-layout-heading">Design options</h3>
                <div className="lightbox-carousel-layout-row lightbox-carousel-layout-row--strip-only">
                  <div className="lightbox-carousel-variation-strip" role="listbox" aria-label="Design options">
                    {variations.map((variation, index) => (
                      <button
                        key={variation.id}
                        type="button"
                        role="option"
                        data-lightbox-thumb={index}
                        aria-selected={lightbox === index}
                        className={`lightbox-thumb lightbox-thumb--carousel-var${
                          lightbox === index ? ' is-active' : ''
                        }`}
                        onClick={() => {
                          setSelected(index);
                          setLightbox(index);
                        }}
                        aria-label={`Show ${variation.creativeName ?? `option ${index + 1}`}`}
                      >
                        <ScaledPreview
                          format={g.format}
                          className="lightbox-thumb__preview"
                          posterTheme={g.theme}
                          maxWidth={76}
                        >
                          <PosterCard
                            format={g.format}
                            theme={g.theme}
                            content={previewContent}
                            variation={variation}
                            includeVisual={g.includeVisual}
                            heroImageUrl={resolvedHeroImageUrl}
                            heroImageLoading={heroImageLoading}
                            heroImageObjectFit={resolvedHeroImageObjectFit}
                            heroMatchPosterBackdrop={heroMatchPosterBackdrop}
                            slidePager={carouselSlidePager}
                          />
                        </ScaledPreview>
                      </button>
                    ))}
                  </div>
                </div>
                <p className="lightbox-carousel-strip-kicker">All slides</p>
                <div
                  className="lightbox-carousel-slide-strip"
                  role="tablist"
                  aria-label="Carousel slides"
                  aria-busy={
                    g.includeVisual && carouselHeroBusy && g.carouselHeroUrls?.some((u) => !u)
                      ? true
                      : undefined
                  }
                >
                  {g.carouselSlides.map((slideContent, idx) => {
                    const slideVars = buildVariations(slideContent);
                    const vv = slideVars[Math.min(lightbox, slideVars.length - 1)]!;
                    const heroUrl = heroUrlForExportSlide(idx);
                    const slideHeroBusy = Boolean(g.includeVisual && carouselHeroBusy && !heroUrl);
                    return (
                      <button
                        key={`lb-slide-${idx}`}
                        type="button"
                        role="tab"
                        data-lightbox-carousel-thumb={idx}
                        aria-selected={carouselSlideIndex === idx}
                        className={`lightbox-carousel-slide-thumb${
                          carouselSlideIndex === idx ? ' is-active' : ''
                        }`}
                        onClick={() => goCarouselSlide(idx)}
                        aria-label={`Slide ${idx + 1} of ${g.carouselSlides!.length}`}
                      >
                        <ScaledPreview format="carousel" maxWidth={96} posterTheme={g.theme}>
                          <PosterCard
                            format="carousel"
                            theme={g.theme}
                            content={slideContent}
                            variation={vv}
                            includeVisual={g.includeVisual}
                            heroImageUrl={heroUrl}
                            heroImageLoading={slideHeroBusy}
                            heroImageObjectFit={resolvedHeroImageObjectFit}
                            heroMatchPosterBackdrop={heroMatchPosterBackdrop}
                            slidePager={{ current: idx + 1, total: g.carouselSlides!.length }}
                          />
                        </ScaledPreview>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div className="lightbox-stage">
                  {copyStripVariations.length > 1 ? (
                    <button
                      type="button"
                      className="lightbox-nav lightbox-nav--prev"
                      onClick={() => {
                        const n = copyStripVariations.length;
                        const next = (lightbox - 1 + n) % n;
                        setNcCopyIdx(next);
                        setLightbox(next);
                      }}
                      aria-label="Previous poster copy option"
                    >
                      ←
                    </button>
                  ) : (
                    <span className="lightbox-nav-placeholder" aria-hidden />
                  )}
                  <div className="lightbox-canvas">
                    <LightboxScaledPreview format={g.format} className="lightbox-fit" posterTheme={g.theme}>
                      <PosterCard
                        format={g.format}
                        theme={g.theme}
                        content={previewContent}
                        variation={lightboxPosterVariation}
                        includeVisual={g.includeVisual}
                        heroImageUrl={
                          g.format === 'carousel' && g.carouselSlides?.length
                            ? resolvedHeroImageUrl
                            : staticAiHeroUrlForMerged(lightboxPosterVariation, lightbox ?? 0)
                        }
                        heroImageLoading={heroImageLoading}
                        heroImageObjectFit={resolvedHeroImageObjectFit}
                        heroMatchPosterBackdrop={heroMatchPosterBackdrop}
                        slidePager={carouselSlidePager}
                      />
                    </LightboxScaledPreview>
                  </div>
                  {copyStripVariations.length > 1 ? (
                    <button
                      type="button"
                      className="lightbox-nav lightbox-nav--next"
                      onClick={() => {
                        const n = copyStripVariations.length;
                        const next = (lightbox + 1) % n;
                        setNcCopyIdx(next);
                        setLightbox(next);
                      }}
                      aria-label="Next poster copy option"
                    >
                      →
                    </button>
                  ) : (
                    <span className="lightbox-nav-placeholder" aria-hidden />
                  )}
                </div>
                {copyStripVariations.length > 1 ? (
                  <div className="lightbox-thumbs" role="listbox" aria-label="Poster copy options">
                    {copyStripVariations.map((copyV, index) => {
                      const layoutSel =
                        variations[Math.min(selected, Math.max(0, variations.length - 1))];
                      const thumbPosterVariation =
                        layoutSel && copyV
                          ? mergeCopyAndLayoutVariation(copyV, layoutSel)
                          : copyV;
                      return (
                        <button
                          key={copyV.id}
                          type="button"
                          role="option"
                          data-lightbox-copy-thumb={index}
                          aria-selected={lightbox === index}
                          className={`lightbox-thumb${lightbox === index ? ' is-active' : ''}`}
                          onClick={() => {
                            setNcCopyIdx(index);
                            setLightbox(index);
                          }}
                          aria-label={`Show copy option ${copyV.creativeName ?? `option ${index + 1}`}`}
                        >
                          <ScaledPreview
                            format={g.format}
                            className="lightbox-thumb__preview"
                            posterTheme={g.theme}
                            maxWidth={72}
                          >
                            <PosterCard
                              format={g.format}
                              theme={g.theme}
                              content={previewContent}
                              variation={thumbPosterVariation}
                              includeVisual={g.includeVisual}
                              heroImageUrl={staticAiHeroUrlForMerged(thumbPosterVariation, index)}
                              heroImageLoading={heroImageLoading}
                              heroImageObjectFit={resolvedHeroImageObjectFit}
                              heroMatchPosterBackdrop={heroMatchPosterBackdrop}
                              slidePager={carouselSlidePager}
                            />
                          </ScaledPreview>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </>
            )}
            <div className="lightbox-footer">
              {g.format === 'carousel' && g.carouselSlides && g.carouselSlides.length > 0 ? (
                variations.length > 1 ? (
                  <p className="lightbox-meta" aria-live="polite">
                    {lightbox + 1} <span className="lightbox-meta__of">/</span> {variations.length}
                  </p>
                ) : null
              ) : copyStripVariations.length > 1 ? (
                <p className="lightbox-meta" aria-live="polite">
                  {lightbox + 1} <span className="lightbox-meta__of">/</span> {copyStripVariations.length}
                </p>
              ) : null}
              <p className="lightbox-label">
                {lightboxPosterVariation.creativeName ?? `Option ${lightbox + 1}`}
                <span className="lightbox-label__detail"> — {lightboxPosterVariation.label}</span>
              </p>
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
            content={previewContent}
            variation={v}
            includeVisual={g.includeVisual}
            heroImageUrl={resolvedHeroImageUrl}
            heroImageLoading={false}
            heroImageObjectFit={resolvedHeroImageObjectFit}
            heroMatchPosterBackdrop={heroMatchPosterBackdrop}
            slidePager={carouselSlidePager}
          />
        ) : null}
        {g && lightbox !== null && lightboxPosterVariation ? (
          <PosterCard
            ref={lightboxExportRef}
            format={g.format}
            theme={g.theme}
            content={previewContent}
            variation={lightboxPosterVariation}
            includeVisual={g.includeVisual}
            heroImageUrl={
              g.format === 'carousel' && g.carouselSlides?.length
                ? resolvedHeroImageUrl
                : staticAiHeroUrlForMerged(lightboxPosterVariation, lightbox ?? 0)
            }
            heroImageLoading={false}
            heroImageObjectFit={resolvedHeroImageObjectFit}
            heroMatchPosterBackdrop={heroMatchPosterBackdrop}
            slidePager={carouselSlidePager}
          />
        ) : null}
      </div>
    </>
  );
}

export default App;
