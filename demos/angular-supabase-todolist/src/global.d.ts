// Ambient declarations for webpack-injected environment variables.
// webpack's DefinePlugin injects `env` at build time.

declare global {
  const env: {
    WEBPACK_PUBLIC_SUPABASE_URL: string;
    WEBPACK_PUBLIC_SUPABASE_ANON_KEY: string;
    WEBPACK_PUBLIC_POWERSYNC_URL: string;
  };
}

export {};
