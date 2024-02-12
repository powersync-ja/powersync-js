export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
      META_LOGO_URL: string;
      ALGOLIA_APP_ID: string;
      ALGOLIA_API_KEY: string;
      GH_URL: string;
      GH_ORG: string;
    }
  }
}
