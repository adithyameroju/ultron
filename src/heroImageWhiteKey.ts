/**
 * Turns near-white pixels transparent so DALL·E flat-white backgrounds approximate alpha.
 * Fails for remote URLs that taint the canvas (CORS); caller should fall back to the original.
 */
export async function flatWhiteToTransparentPng(
  dataUrl: string,
  opts?: { whiteCutoff?: number; feather?: number }
): Promise<string> {
  const whiteCutoff = opts?.whiteCutoff ?? 40;
  const feather = Math.max(4, opts?.feather ?? 32);

  const img = new Image();
  img.decoding = 'async';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Could not decode hero image'));
    img.src = dataUrl;
  });

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (w === 0 || h === 0) {
    throw new Error('Invalid image dimensions');
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  ctx.drawImage(img, 0, 0);
  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, w, h);
  } catch {
    throw new Error('Canvas is tainted (CORS) — cannot read pixels');
  }

  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]!;
    const g = d[i + 1]!;
    const b = d[i + 2]!;
    const dist = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);
    let a = 255;
    if (dist <= whiteCutoff) {
      a = 0;
    } else if (dist < whiteCutoff + feather) {
      a = Math.round((255 * (dist - whiteCutoff)) / feather);
    }
    d[i + 3] = a;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}
