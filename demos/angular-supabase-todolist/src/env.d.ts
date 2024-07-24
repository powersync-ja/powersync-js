declare namespace NodeJS {
  // These are injected in the Webpack config
  interface ProcessEnv {
    WEBPACK_SUPABASE_URL: string;
    WEBPACK_SUPABASE_ANON_KEY: string;
    WEBPACK_POWERSYNC_URL: string;
  }
}
