/**
 * Resolves a file served from Vite `public/` for any `base` (e.g. GitHub Pages subpath).
 * `import.meta.env.BASE_URL` is `/` in dev and `/repo-name/` in production on Pages.
 */
export function publicAsset(fileName: string): string {
  const name = fileName.startsWith('/') ? fileName.slice(1) : fileName;
  return `${import.meta.env.BASE_URL}${name}`;
}
