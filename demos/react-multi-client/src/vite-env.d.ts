/// <reference types="vite/client" />

// Injected at build time from package.json via `define` in vite.config.mts
declare const APP_VERSION: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_POWERSYNC_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
