import type { PosterContent } from './posterTypes';

export function buildLinkedInCaption(content: PosterContent): string {
  const blocks: string[] = [];
  if (content.headline.trim()) {
    blocks.push(content.headline.trim());
  }
  if (content.subhead.trim()) {
    blocks.push(content.subhead.trim());
  }
  if (content.cta.trim()) {
    blocks.push(content.cta.trim());
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
