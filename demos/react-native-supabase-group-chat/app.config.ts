import { type ExpoConfig } from 'expo/config';

import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// EAS doesn't load values from `.env` by default when consider the `app.config`
dotenvConfig({
  path: path.resolve(__dirname, '.env')
});

const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

const config: ExpoConfig = {
  name: 'react-native-supabase-group-chat',
  slug: 'react-native-supabase-group-chat',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  scheme: 'powersync',
  newArchEnabled: true,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  updates: {
    url: `https://u.expo.dev/${projectId}`
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.powersync.powerchat'
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    package: 'com.powersync.powerchat'
  },
  extra: {
    eas: {
      projectId
    },
    updates: {
      assetPatternsToBeBundled: ['**/*']
    }
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '15.1'
        },
        android: {
          minSdkVersion: 24,
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          buildToolsVersion: '35.0.0'
        }
      }
    ],
    'expo-dev-client'
  ]
};

export default config;
