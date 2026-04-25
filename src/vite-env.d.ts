/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ULTRON_EMAIL?: string;
  readonly VITE_ULTRON_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
