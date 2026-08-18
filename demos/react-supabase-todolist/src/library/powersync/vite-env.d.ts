/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_POWERSYNC_URL: string;
  readonly VITE_USE_POWERSYNC_CHECKPOINT_REQUESTS: 'true' | 'false';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
