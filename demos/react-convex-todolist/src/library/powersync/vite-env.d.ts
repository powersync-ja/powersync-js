/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONVEX_SITE_URL: string;
  readonly VITE_POWERSYNC_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
