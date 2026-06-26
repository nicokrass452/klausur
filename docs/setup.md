# Installation & Setup

## Lokal starten

```powershell
npm install
cp .env.example .env   # Werte eintragen, siehe unten
npm run dev
```

Standard-URL (Port aus `.env`, Default `5177`):

```text
http://localhost:5177
```

Anderen Port erzwingen:

```powershell
npm run dev -- --port 5174
```

Produktionsbuild:

```powershell
npm run build
npm run preview
```

Tests ausführen:

```powershell
npm test
```

Typ-Check:

```powershell
npm run typecheck
```

**Wichtig:** `VITE_*`-Variablen werden beim Build eingebettet. Für Deployments müssen sie in der CI/CD-Umgebung **vor** `npm run build` gesetzt sein. Nach Änderungen an `.env` den Dev-Server neu starten.

## Umgebungsvariablen

Kopiere `.env.example` nach `.env` und trage deine Werte ein:

```text
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_your-key-here
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_AUTH_REDIRECT_URL=http://localhost:5177/dashboard
VITE_DEV_SERVER_PORT=5177
VITE_DEV_HMR_CLIENT_PORT=5177
VITE_SENTRY_DSN=optional-sentry-dsn

# Offline Read-Only Cache Access (Feature Flag, default: off)
VITE_ENABLE_OFFLINE_READONLY=false
VITE_OFFLINE_PUBLIC_KEY=

# Web Push VAPID public key (base64url). Required for background push notifications.
VITE_VAPID_PUBLIC_KEY=
```

Server-only Werte gehören in Supabase Edge Function Secrets oder `.env.server`, nie in den Browser und nie mit `VITE_`:

```text
OFFLINE_READONLY_ENABLED=false
OFFLINE_SIGNING_KEY=
CLEANUP_CRON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
# VAPID key pair for Web Push (server-only).
VAPID_PRIVATE_KEY=
VAPID_PUBLIC_KEY=
```

**Production Guardrail:** Offline Read-Only Access ist vorbereitet, bleibt aber bis zur Staging-/Release-Readiness-Prüfung deaktiviert. In Production vorerst nicht setzen:

```text
VITE_ENABLE_OFFLINE_READONLY=true
OFFLINE_READONLY_ENABLED=true
```

## Supabase einrichten

1. Neues Supabase-Projekt anlegen.
2. Die Migrationen im Ordner `supabase/migrations/` in Supabase ausführen. Das geht entweder über die Supabase CLI oder durch manuelles Ausführen der Dateien (erst `20240101000000_init.sql`, dann `20240101000001_delete_account.sql`) im **SQL Editor**.
3. Unter **Settings → API Keys** die Publishable Key (oder legacy anon JWT) nach `VITE_SUPABASE_ANON_KEY` kopieren.
4. Optional: **Authentication → Providers → Google** aktivieren und Client-ID/Secret eintragen.
5. Unter **Authentication → URL Configuration** die Redirect-URL erlauben (z. B. `http://localhost:5177/dashboard`).

## Google Login

1. In Supabase `Authentication` → `Providers` → `Google` öffnen.
2. Google Provider aktivieren und Client-ID plus Client Secret eintragen.
3. In Supabase `Authentication` → `URL Configuration` die Redirect-URL erlauben.
4. In der Google Cloud Console dieselbe Redirect-URL für den OAuth-Client freigeben.
