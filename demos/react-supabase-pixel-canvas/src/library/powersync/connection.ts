export type SupabaseConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  powersyncUrl: string;
};

/**
 * The backend is only wired up when all three env vars are present. Without
 * them the app runs fully standalone (locally-seeded canvas, no uploads).
 */
export function isBackendConfigured(): boolean {
  return !!(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_POWERSYNC_URL
  );
}

export function getSupabaseConfig(): SupabaseConfig {
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL!,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
    powersyncUrl: import.meta.env.VITE_POWERSYNC_URL!
  };
}
