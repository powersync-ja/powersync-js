import { Platform } from 'react-native';

const resolveHost = (url: string) => {
  if (Platform.OS === 'android') {
    // Android emulator maps host machine to 10.0.2.2
    return url.replace('127.0.0.1', '10.0.2.2').replace('localhost', '10.0.2.2');
  }

  // iOS simulator + web
  return url;
};

export const config = {
  brand1: '#a0f',
  brand2: '#00d5ff',
  supabaseUrl: resolveHost(
    process.env.EXPO_PUBLIC_SUPABASE_URL as string
  ),
  powerSyncUrl: resolveHost(
    process.env.EXPO_PUBLIC_POWERSYNC_URL as string
  ),
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string,
};