import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function readEnv(name: string): string | undefined {
  const value = import.meta.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export const supabaseUrl = readEnv("VITE_SUPABASE_URL");
export const supabaseAnonKey = readEnv("VITE_SUPABASE_ANON_KEY");
const googleClientId = readEnv("VITE_GOOGLE_CLIENT_ID");
const authRedirectUrl = readEnv("VITE_AUTH_REDIRECT_URL");

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);
export const hasGoogleAuthEnv = hasSupabaseEnv && Boolean(googleClientId);

export function getSupabaseConfigIssue(): string | null {
  if (!supabaseUrl) return "VITE_SUPABASE_URL fehlt in .env";
  if (!supabaseAnonKey) return "VITE_SUPABASE_ANON_KEY fehlt in .env";
  if (!supabaseUrl.startsWith("https://") || !supabaseUrl.includes(".supabase.co")) {
    return "VITE_SUPABASE_URL sieht ungültig aus (erwartet https://<project>.supabase.co)";
  }
  const looksLikeJwt = supabaseAnonKey.startsWith("eyJ");
  const looksLikePublishable = supabaseAnonKey.startsWith("sb_publishable_");
  if (!looksLikeJwt && !looksLikePublishable) {
    return "VITE_SUPABASE_ANON_KEY: nutze den anon/public Key aus Supabase → Settings → API";
  }
  return null;
}

export function getAuthRedirectUrl(): string {
  if (authRedirectUrl) return authRedirectUrl;
  return `${window.location.origin}/dashboard`;
}

/** Headers required by Supabase gateway — always include apikey explicitly. */
export function getSupabaseRequestHeaders(accessToken?: string | null): Record<string, string> {
  if (!supabaseAnonKey) {
    throw new Error("Supabase API-Key fehlt. Setze VITE_SUPABASE_ANON_KEY in .env");
  }
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${accessToken ?? supabaseAnonKey}`
  };
}

/** Ensures every Supabase request carries a non-empty apikey header. */
function createSupabaseFetch(apiKey: string): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers);
    const currentKey = headers.get("apikey")?.trim();
    if (!currentKey) {
      headers.set("apikey", apiKey);
    }
    return fetch(input, { ...init, headers });
  };
}

function createSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: {
      fetch: createSupabaseFetch(supabaseAnonKey),
      headers: {
        "X-Client-Info": "klausurplaner"
      }
    }
  });
}

export const supabase = createSupabaseClient();