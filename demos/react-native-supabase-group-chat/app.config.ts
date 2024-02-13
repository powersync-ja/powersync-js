import { type ExpoConfig } from "expo/config";

const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

const config: ExpoConfig = {
  name: "PowerChat",
  slug: "powerchat",
  scheme: "powerchat",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#cb62ff",
  },
  updates: {
    url: `https://u.expo.dev/${projectId}`,
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.powerchat",
    config: {
      usesNonExemptEncryption: false,
    },
    jsEngine: "jsc",
  },
  experiments: {
    tsconfigPaths: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro",
  },
  extra: {
    eas: {
      projectId,
    },
  },
  runtimeVersion: {
    policy: "sdkVersion",
  },
  plugins: [
    "expo-router"
  ]
};

export default config;
