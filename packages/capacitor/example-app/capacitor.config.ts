import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.powersync.capacitor',
  appName: 'PowerSync Capacitor SDK example',
  webDir: 'dist',
  server: {
    cleartext: true,
    /**
     * We receive the Vitest URL as an environment variable, Capacitor should load this on boot.
     */
    url: process.env.CAPACITOR_VITEST_SERVER_URL
  }
};

export default config;
