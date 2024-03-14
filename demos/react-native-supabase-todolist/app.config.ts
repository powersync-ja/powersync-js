import { type ExpoConfig } from "expo/config";

import { config as dotenvConfig} from 'dotenv'
import { resolve } from 'path'

// EAS doesn't load values from `.env` by default when considering the `app.config.ts` file
dotenvConfig({
  path: resolve(__dirname, '.env') || resolve(__dirname, '.env.local')
})

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
        backgroundColor: '#ffffff',
    },
    updates: {
        url: `https://u.expo.dev/${projectId}`,
    },
    assetBundlePatterns: ['**/*'],
    ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.powersync.example',
    },
    android: {
        adaptiveIcon: {
            foregroundImage: './assets/adaptive-icon.png',
            backgroundColor: '#ffffff',
        },
        package: 'com.powersync.example',
    },
    web: {
        favicon: './assets/favicon.png',
    },
    extra: {
        eas: {
            projectId
        },
    },
    plugins: [
        'expo-router',
        [
            'expo-camera',
            {
                cameraPermission: 'Allow $(PRODUCT_NAME) to access your camera.',
            },
        ],
        [
            'expo-build-properties',
            {
                ios: {
                    deploymentTarget: '13.4',
                },
            },
        ],
        'expo-secure-store',
    ],
};

export default config;
