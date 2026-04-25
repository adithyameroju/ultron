import type { AccentId, PosterContent, Variation } from './posterTypes';
import { ACCENTS } from './posterTypes';

const MAX_HEADLINE_LINES = 3;

function wordsOf(headline: string): string[] {
  return headline.trim().split(/\s+/).filter(Boolean);
}

/** Two lines: first chunk uses ~`ratio` of the words. */
function splitTwoLines(words: string[], ratio: number): string[] {
  if (words.length === 0) {
    return ['Your headline'];
  }
  if (words.length === 1) {
    return [words[0]!];
  }
  const k = Math.max(1, Math.min(words.length - 1, Math.round(words.length * ratio)));
  return [words.slice(0, k).join(' '), words.slice(k).join(' ')];
}

/** Up to three balanced lines (by word count). */
function splitThreeLines(words: string[]): string[] {
  if (words.length === 0) {
    return ['Your headline'];
  }
  if (words.length === 1) {
    return [words[0]!];
  }
  if (words.length === 2) {
    return [words[0]!, words[1]!];
  }
  const a = Math.ceil(words.length / 3);
  const b = Math.ceil((words.length - a) / 2);
  const l1 = words.slice(0, a).join(' ');
  const l2 = words.slice(a, a + b).join(' ');
  const l3 = words.slice(a + b).join(' ');
  return [l1, l2, l3].filter((x) => x.length > 0);
}

function capLines(lines: string[], max: number): string[] {
  const out = lines.filter((l) => l.trim().length > 0);
  if (out.length <= max) {
    return out;
  }
  const head = out.slice(0, max - 1);
  const tail = out.slice(max - 1).join(' ');
  return [...head, tail];
}

export function buildVariations(content: PosterContent): Variation[] {
  const words = wordsOf(content.headline);
  const balanced2 = capLines(splitTwoLines(words, 0.5), MAX_HEADLINE_LINES);
  const modes: Array<{
    lines: string[];
    label: string;
    headlineAllCaps?: boolean;
  }> = [
    {
      lines: balanced2,
      label: '2 lines · balanced',
    },
    {
      lines: capLines(splitTwoLines(words, 0.38), MAX_HEADLINE_LINES),
      label: '2 lines · short / long',
    },
    {
      lines: capLines(splitThreeLines(words), MAX_HEADLINE_LINES),
      label: 'Up to 3 lines',
    },
    {
      lines: balanced2,
      label: '2 lines · ALL CAPS',
      headlineAllCaps: true,
    },
  ];

  const accentOrder: AccentId[] = ['purple', 'picton', 'cerise', 'picton'];
  return modes.map((m, i) => {
    const accent = accentOrder[i % accentOrder.length] ?? 'purple';
    return {
      id: `v${i + 1}-${accent}`,
      label: `${ACCENTS[accent].label} · ${m.label}`,
      accent,
      headlineLines: m.lines,
      headlineAllCaps: m.headlineAllCaps,
    };
  });
}
