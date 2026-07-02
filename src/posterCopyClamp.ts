/**
 * Keeps the poster CTA to one modest line. Applied to model output and carousel plan rows.
 * (Headline/subhead are not hard-clamped here — layout shows full text; prompts enforce length.)
 */
export const POSTER_CTA_MAX_CHARS = 46;

export function normalizePosterCta(cta: string): string {
  const t = cta.replace(/\s+/g, ' ').trim();
  if (!t) {
    return t;
  }
  if (t.length <= POSTER_CTA_MAX_CHARS) {
    return t;
  }
  const cut = t.slice(0, POSTER_CTA_MAX_CHARS);
  const sp = cut.lastIndexOf(' ');
  return (sp > 16 ? cut.slice(0, sp) : cut).trim();
}
