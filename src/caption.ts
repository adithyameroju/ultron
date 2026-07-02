import type { PosterContent } from './posterTypes';
import { normalizePosterCta } from './posterCopyClamp';

export function buildLinkedInCaption(content: PosterContent): string {
  const blocks: string[] = [];
  if (content.headline.trim()) {
    blocks.push(content.headline.trim());
  }
  if (content.subhead.trim()) {
    blocks.push(content.subhead.trim());
  }
  const ctaNorm = normalizePosterCta(content.cta);
  if (ctaNorm) {
    blocks.push(ctaNorm);
  }
  if (content.footnote.trim()) {
    blocks.push(content.footnote.trim());
  }
  const tags = content.hashtags
    .split(/[,\s]+/)
    .map((t) => t.replace(/^#/, '').trim())
    .filter(Boolean)
    .map((t) => `#${t}`);
  const body = blocks.join('\n\n');
  if (!tags.length) {
    return body;
  }
  return `${body}\n\n${tags.join(' ')}`;
}
