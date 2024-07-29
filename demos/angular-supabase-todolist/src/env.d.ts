declare namespace NodeJS {
  // These are injected in the Webpack config
  interface ProcessEnv {
    WEBPACK_PUBLIC_SUPABASE_URL: string;
    WEBPACK_PUBLIC_SUPABASE_ANON_KEY: string;
    WEBPACK_PUBLIC_POWERSYNC_URL: string;
  }
}
