/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POWERSYNC_URL: string;
  readonly VITE_STREAM_MODE?: string;
  readonly VITE_SMOOTH_TEXT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
