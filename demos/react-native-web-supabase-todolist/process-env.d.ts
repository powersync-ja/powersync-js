export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
      EXPO_PUBLIC_SUPABASE_URL: string;
      EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
      EXPO_PUBLIC_SUPABASE_BUCKET: string;
      EXPO_PUBLIC_POWERSYNC_URL: string;
      EXPO_PUBLIC_EAS_PROJECT_ID: string;
    }
  }
}
