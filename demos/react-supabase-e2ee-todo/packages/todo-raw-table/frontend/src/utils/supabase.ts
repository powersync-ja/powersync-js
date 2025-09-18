import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  if (!client) client = createClient(url, key);

  return client;
}

export async function getAccessToken(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) {
    console.warn("Supabase client not configured");
    return null;
  }
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signInWithPassword(email: string, password: string) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithPassword(email: string, password: string) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signInAnonymously() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const anyAuth: any = (sb as any).auth;
  if (typeof anyAuth?.signInAnonymously !== "function") {
    const err: any = new Error(
      "Anonymous auth not available. Enable Anonymous provider in Supabase Auth.",
    );
    err.code = "ANON_UNAVAILABLE";
    throw err;
  }
  const { error } = await anyAuth.signInAnonymously();
  if (error) throw error;
}

export function isAnonymousSupported(): boolean {
  const sb = getSupabase();
  if (!sb) return false;
  return typeof (sb as any).auth?.signInAnonymously === "function";
}

export async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

export async function getCurrentUserId(
  fast: boolean = true,
): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  if (fast) {
    const { data: s } = await sb.auth.getSession();
    if (s.session?.user?.id) return s.session.user.id;
  }
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

export async function signInWithOtp(email: string) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signInWithOAuth(provider: "github" | "google") {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}
