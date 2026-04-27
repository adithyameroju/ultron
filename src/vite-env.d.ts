/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ULTRON_EMAIL?: string;
  readonly VITE_ULTRON_PASSWORD?: string;
  /** OpenAI API key — DALL·E hero generation (optional; local/dev only in client bundle). */
  readonly VITE_OPENAI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
