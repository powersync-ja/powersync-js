import { type ExpoConfig } from 'expo/config';

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// EAS doesn't load values from `.env` by default when consider the `app.config`
dotenvConfig({
  path: resolve(__dirname, '.env')
});

const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

const config: ExpoConfig = {
  name: 'powersync-example',
  slug: 'powersync-example',
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
  updates: {
    url: `https://u.expo.dev/${projectId}`
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.powersync.example'
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    package: 'com.powersync.example'
  },

  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/favicon.png'
  },
  extra: {
    eas: {
      projectId
    }
  },
  plugins: [
    'expo-router',
    [
      'expo-camera',
      {
        cameraPermission: 'Allow $(PRODUCT_NAME) to access your camera.'
      }
    ],
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '15.1',
          // TODO: New architecture is currently not yet supported by @journeyapps/react-native-quick-sqlite
          newArchEnabled: false
        },
        android: {
          minSdkVersion: 24,
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          buildToolsVersion: '35.0.0',
          // TODO: New architecture is currently not yet supported by @journeyapps/react-native-quick-sqlite
          newArchEnabled: false
        }
      }
    ],
    'expo-secure-store'
  ]
};

export default config;
