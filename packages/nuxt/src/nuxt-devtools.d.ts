declare module 'nuxt/schema' {
  interface NuxtHooks {
    'devtools:customTabs': (tabs: any[]) => void;
  }
}

export {};
