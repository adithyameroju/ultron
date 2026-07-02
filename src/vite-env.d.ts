/// <reference types="vite/client" />

declare module '*.md?raw' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_ULTRON_EMAIL?: string;
  readonly VITE_ULTRON_PASSWORD?: string;
  /** Image model for AI hero: default `gpt-image-2`. Use `dall-e-3` for DALL·E 3, etc. */
  readonly VITE_OPENAI_IMAGE_MODEL?: string;
  /** Freepik AI image API key — text-to-image hero (optional; exposed in client bundle for local/dev). */
  readonly VITE_FREEPIK_API_KEY?: string;
  /** Set to `true` when using `vite preview` so Freepik uses the Vite proxy (rebuild after changing). */
  readonly VITE_FREEPIK_USE_DEV_PROXY?: string;
  /** Google Identity Services OAuth client ID (web client) for “Continue with Google”. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** Alias for the same OAuth web client ID (optional). */
  readonly VITE_GOOGLE_OAUTH_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
