import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const authRedirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL;

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);
export const hasGoogleAuthEnv = hasSupabaseEnv && Boolean(googleClientId);

export function getAuthRedirectUrl(): string {
  if (authRedirectUrl) return authRedirectUrl;
  return `${window.location.origin}/dashboard`;
}

export const supabase = hasSupabaseEnv
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;
