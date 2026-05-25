import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.powersync.capacitor',
  appName: 'PowerSync Capacitor SDK example',
  // Native Vitest runs load the test server URL directly, so use an existing placeholder directory instead of requiring a web build.
  webDir: process.env.CAPACITOR_VITEST_SERVER_URL ? 'src' : 'dist',
  server: {
    cleartext: true,
    /**
     * We receive the Vitest URL as an environment variable, Capacitor should load this on boot.
     */
    url: process.env.CAPACITOR_VITEST_SERVER_URL
  }
};

export default config;
