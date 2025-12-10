import type { PowerSyncNuxtModuleOptions } from '../module'

declare module 'nuxt/schema' {
  interface PublicRuntimeConfig {
    powerSyncModuleOptions: PowerSyncNuxtModuleOptions
  }
}
// It is always important to ensure you import/export something when augmenting a type
export {}
