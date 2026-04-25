import process from 'node:process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Subpath for GitHub Pages (must match the repo name). */
const PAGES_BASE = '/enterprise-socials-studio/';

// GITHUB_ACTIONS is set in CI; local `npm run build` keeps base `/` for preview.
const base = process.env.GITHUB_ACTIONS ? PAGES_BASE : '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: { port: 5180 },
});
