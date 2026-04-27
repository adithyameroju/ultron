/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ULTRON_EMAIL?: string;
  readonly VITE_ULTRON_PASSWORD?: string;
  /** Google AI Studio / Gemini API key (optional; used for Imagen hero generation). */
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
