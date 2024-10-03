export const AppConfig = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  supabaseBucket: process.env.EXPO_PUBLIC_SUPABASE_BUCKET || '',
  powersyncUrl: process.env.EXPO_PUBLIC_POWERSYNC_URL
};
