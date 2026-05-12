import process from 'node:process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Subpath for GitHub Pages (must match the repo name). */
const PAGES_BASE = '/ultron/';

// GITHUB_ACTIONS is set in CI; local `npm run build` keeps base `/` for preview.
const base = process.env.GITHUB_ACTIONS ? PAGES_BASE : '/';

/**
 * Same-origin proxies avoid browser CORS when calling Freepik or OpenAI from the dev server or `vite preview`.
 *
 * `secure: false` on Freepik — Node’s TLS verify often fails with `unable to get local issuer certificate` while
 * curl/browsers succeed (system keychain vs Node CA bundle, or corporate SSL inspection). This proxy
 * is local-dev only; do not expose it as a public TLS bypass.
 */
const freepikProxy = {
  '/api/freepik': {
    target: 'https://api.freepik.com',
    changeOrigin: true,
    secure: false,
    rewrite: (path: string) => path.replace(/^\/api\/freepik/, ''),
  },
} as const;

/** Avoid browser CORS when calling OpenAI from `npm run dev` / `vite preview`. */
const openaiProxy = {
  '/api/openai': {
    target: 'https://api.openai.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/openai/, ''),
  },
} as const;

const devProxy = { ...freepikProxy, ...openaiProxy };

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5180,
    proxy: devProxy,
  },
  preview: {
    proxy: devProxy,
  },
});
