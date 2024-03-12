export const AppConfig = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL as string,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string,
  supabaseBucket: '', // Optional. Only required when syncing attachments and using Supabase Storage. See packages/powersync-attachments.
  powersyncUrl: process.env.EXPO_PUBLIC_POWERSYNC_URL as string
};
