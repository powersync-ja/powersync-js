export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
      EXPO_PUBLIC_DJANGO_URL: string;
      EXPO_PUBLIC_POWERSYNC_URL: string;
    }
  }
}
