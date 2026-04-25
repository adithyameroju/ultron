/** Apply alpha to a #RRGGBB brand hex for CSS/SVG. */
export function hexWithAlpha(hex: string, alpha: number): string {
  const m = hex.replace('#', '');
  if (m.length !== 6) {
    return hex;
  }
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Darken hex for gradient stops. */
export function adjustHexBrightness(hex: string, factor: number): string {
  const m = hex.replace('#', '');
  if (m.length !== 6) {
    return hex;
  }
  const r = Math.min(255, Math.round(parseInt(m.slice(0, 2), 16) * factor));
  const g = Math.min(255, Math.round(parseInt(m.slice(2, 4), 16) * factor));
  const b = Math.min(255, Math.round(parseInt(m.slice(4, 6), 16) * factor));
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}
