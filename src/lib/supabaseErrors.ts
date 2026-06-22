export function formatSupabaseError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Unbekannter Supabase-Fehler";
  }

  const record = error as { message?: string; hint?: string; details?: string; code?: string };
  const message = record.message ?? "";
  const hint = record.hint ?? "";
  const combined = `${message} ${hint}`.toLowerCase();

  if (combined.includes("api key") || combined.includes("apikey")) {
    return "Supabase API-Key fehlt oder ist ungültig. Kopiere den anon/public Key aus Supabase → Settings → API nach VITE_SUPABASE_ANON_KEY in .env und starte den Dev-Server neu.";
  }

  if (record.code === "PGRST205" || combined.includes("could not find the table")) {
    return "Supabase-Datenbank fehlt noch. Führe supabase-schema.sql im Supabase SQL Editor aus, um Tabellen anzulegen.";
  }

  if (record.code === "PGRST301" || combined.includes("jwt")) {
    return "Supabase-Session ungültig. Bitte erneut anmelden.";
  }

  const parts = [message, record.details, record.hint].filter(Boolean);
  return parts.join(" — ") || "Supabase-Anfrage fehlgeschlagen";
}