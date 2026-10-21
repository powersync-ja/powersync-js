/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_POWERSYNC_URL: string;
  readonly VITE_STREAM_MODE?: string;
  readonly VITE_SMOOTH_TEXT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
