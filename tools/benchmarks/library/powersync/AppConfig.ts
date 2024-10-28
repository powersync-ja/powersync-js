export const AppConfig = {
  powersyncUrl: process.env.EXPO_PUBLIC_POWERSYNC_URL,
  powersyncToken: process.env.EXPO_PUBLIC_POWERSYNC_TOKEN,
  backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL,
  sizeBucket: process.env.EXPO_PUBLIC_SIZE_BUCKET ?? '10k'
};
