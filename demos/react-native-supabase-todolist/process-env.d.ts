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
      EXPO_PUBLIC_AWS_S3_REGION: string;
      EXPO_PUBLIC_AWS_S3_BUCKET_NAME: string;
      EXPO_PUBLIC_AWS_S3_ACCESS_KEY_ID: string;
      EXPO_PUBLIC_AWS_S3_ACCESS_SECRET_ACCESS_KEY: string;
      EXPO_PUBLIC_ATTACHMENT_STORAGE_OPTION: string;
    }
  }
}
