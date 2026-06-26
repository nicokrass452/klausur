# Deployment & Edge Functions

## Build

```powershell
npm run build
npm run preview
```

**Wichtig:** `VITE_*`-Variablen werden beim Build eingebettet. Für Deployments müssen sie in der CI/CD-Umgebung **vor** `npm run build` gesetzt sein.

## CI/CD

- CI/CD Pipeline (GitHub Actions) ist eingerichtet mit Test und Build (`.github/workflows/ci.yml`: Typecheck, Tests, Build).
- Production-Builds und Secrets sind in der GitHub Actions CI dokumentiert und eingepflegt (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_CLIENT_ID`, `VITE_AUTH_REDIRECT_URL`, `VITE_SENTRY_DSN`).

> Quelle der Wahrheit für den Feature-Status ist [`docs/roadmap.md`](./roadmap.md). Status ✅/⬜ dort gilt auch für dieses Dokument. Offene TODOs werden als tracked Issues geführt (siehe [`docs/issues.md`](./issues.md)).

## Edge Functions deployen

### AI-Coach

```powershell
supabase login
supabase link --project-ref <dein-project-ref>
supabase secrets set GLM_API_KEY="<dein-zhipu-api-key>"
supabase secrets set GLM_MODEL="glm-4.7-flash"
supabase secrets set DEEPSEEK_API_KEY="<dein-deepseek-api-key>"
supabase secrets set DEEPSEEK_MODEL="deepseek-v4-flash"
supabase functions deploy ai-coach
```

### Web Push

```powershell
supabase functions deploy subscribe-push
supabase functions deploy send-push
```

### Offline Read-Only

```powershell
supabase secrets set OFFLINE_READONLY_ENABLED=false
supabase secrets set OFFLINE_SIGNING_KEY="<base64url-pkcs8-p256-private-key>"
supabase secrets set CLEANUP_CRON_KEY="<random-cron-secret>"
supabase functions deploy get-device-challenge
supabase functions deploy register-device
supabase functions deploy revalidate-grant
supabase functions deploy cleanup-expired-challenges
```

### Alle Edge Functions auf einmal

```powershell
supabase functions deploy ai-coach get-device-challenge register-device revalidate-grant cleanup-expired-challenges subscribe-push send-push
```

## Supabase Deployment

1. Migrationen in `supabase/migrations/` ausführen (erst `20240101000000_init.sql`, dann `20240101000001_delete_account.sql`, dann weitere in chronologischer Reihenfolge).
2. Edge Functions deployen (siehe oben).
3. Edge Function Secrets setzen.
4. Optional: Google Provider in Authentication aktivieren.
5. Redirect-URLs in URL Configuration erlauben.

## Umgebungsvariablen für Production

Alle `VITE_*`-Variablen müssen **vor** `npm run build` in der CI/CD-Umgebung gesetzt sein. Sie werden statisch in den Build eingebettet.

Server-only Secrets gehören in Supabase Edge Function Secrets, nie mit `VITE_`-Präfix.

## Typ-Check vor Build

```powershell
npm run typecheck
```
