import { type ExpoConfig } from 'expo/config';

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// EAS doesn't load values from `.env` by default when consider the `app.config`
dotenvConfig({
  path: resolve(__dirname, '.env')
});

const config: ExpoConfig = {
  name: 'powersync-benchmarks',
  slug: 'powersync-benchmarks',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'powersync',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.powersync.benchmarks'
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    package: 'com.powersync.benchmarks'
  },
  web: {
    favicon: './assets/favicon.png'
  },
  plugins: [
    'expo-router',
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '13.4',
          // TODO: New architecture is currently not yet supported by @journeyapps/react-native-quick-sqlite
          newArchEnabled: false
        },
        android: {
          minSdkVersion: 23,
          compileSdkVersion: 34,
          targetSdkVersion: 34,
          buildToolsVersion: '34.0.0',
          // TODO: New architecture is currently not yet supported by @journeyapps/react-native-quick-sqlite
          newArchEnabled: false
        }
      }
    ]
  ]
};

export default config;
