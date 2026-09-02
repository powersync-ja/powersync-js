export const AppConfig = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  supabaseBucket: process.env.EXPO_PUBLIC_SUPABASE_BUCKET || '',
  powersyncUrl: process.env.EXPO_PUBLIC_POWERSYNC_URL,
  usePowerSyncCheckpointRequests: process.env.EXPO_PUBLIC_USE_POWERSYNC_CHECKPOINT_REQUESTS === 'true'
};
