import process from 'node:process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/** Subpath for GitHub Pages (must match the repo name). */
const PAGES_BASE = '/ultron/';

// GITHUB_ACTIONS is set in CI; local `npm run build` keeps base `/` for preview.
const base = process.env.GITHUB_ACTIONS ? PAGES_BASE : '/';

/**
 * Same-origin proxies avoid browser CORS when calling Freepik or OpenAI from the dev server or `vite preview`.
 * OpenAI proxy injects `OPENAI_API_KEY` from `.env.local` / shell — never sent from the browser.
 */
function buildDevProxy(openaiApiKey: string) {
  const openaiHeaders: Record<string, string> = {};
  if (openaiApiKey) {
    openaiHeaders.Authorization = `Bearer ${openaiApiKey}`;
  }

  const freepikProxy = {
    '/api/freepik': {
      target: 'https://api.freepik.com',
      changeOrigin: true,
      secure: false,
      rewrite: (path: string) => path.replace(/^\/api\/freepik/, ''),
    },
  } as const;

  const openaiProxy = {
    '/api/openai': {
      target: 'https://api.openai.com',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api\/openai/, ''),
      headers: openaiHeaders,
    },
  } as const;

  return { ...freepikProxy, ...openaiProxy };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const openaiApiKey = env.OPENAI_API_KEY ?? '';
  const devProxy = buildDevProxy(openaiApiKey);

  return {
    base,
    plugins: [react()],
    server: {
      port: 5180,
      proxy: devProxy,
    },
    preview: {
      proxy: devProxy,
    },
  };
});
