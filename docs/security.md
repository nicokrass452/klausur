# Sicherheit

## Row Level Security (RLS)

- RLS ist auf allen App-Tabellen aktiviert.
- Jede Tabelle hat mindestens eine Policy.

### RLS-Verifizierung

Vor jedem Release sollte `supabase/migrations/20250101000006_verify_rls.sql` im SQL Editor ausgeführt werden. Die Assertionen prüfen, dass RLS auf allen App-Tabellen aktiviert ist und mindestens eine Policy existiert.

```sql
-- Führt die enthaltenen DO-Block-Assertionen aus
```

Dieser Schritt ist manuell durchzuführen, da er eine live Datenbank benötigt.

## Offline Read-Only Cache Access

Offline Read-Only Access ist browser-bound und dient nur dazu, zuvor synchronisierte Daten lokal zu lesen, wenn Supabase nicht erreichbar ist. Es ist **kein** Offline-Supabase-Auth, keine hardwaregebundene Device Identity und kein Ersatz für Revocation-Prüfungen im Online-Betrieb.

### Status

- Client-Flag: `VITE_ENABLE_OFFLINE_READONLY=false` per Default.
- Edge-Function-Flag: `OFFLINE_READONLY_ENABLED=false` per Default.
- Production bleibt deaktiviert, bis Staging-/Release-Readiness bestanden ist.

### Registrierung

1. Der Browser erzeugt ein exportierbares ECDSA-P-256 Device-Keypair in IndexedDB.
2. Die App berechnet `device_hash` als SHA-256 des SPKI Public Keys.
3. `get-device-challenge` erstellt eine 5-Minuten-Challenge für den angemeldeten Supabase-User.
4. `register-device` verifiziert Challenge-Signatur, Public-Key-Thumbprint und erstellt ein ES256 Offline Grant.
5. Der Offline Grant wird lokal gespeichert und verschlüsselt den letzten Sync-Snapshot.

### Cache-Schutz

- Snapshots werden mit AES-256-GCM verschlüsselt.
- Der Schlüssel wird aus dem Offline Grant via PBKDF2 SHA-256 mit 100.000 Iterationen abgeleitet.
- Das schützt gegen beiläufige Inspektion. Wenn Browser Storage inklusive Grant kopiert wird, kann der Cache weiterhin entschlüsselt werden.

### Supabase Edge Functions

```powershell
supabase secrets set OFFLINE_READONLY_ENABLED=false
supabase secrets set OFFLINE_SIGNING_KEY="<base64url-pkcs8-p256-private-key>"
supabase secrets set CLEANUP_CRON_KEY="<random-cron-secret>"
supabase functions deploy get-device-challenge
supabase functions deploy register-device
supabase functions deploy revalidate-grant
supabase functions deploy cleanup-expired-challenges
```

### Cron/Vault

```sql
select vault.create_secret('your-cleanup-cron-key', 'CLEANUP_CRON_KEY');
alter database postgres set app.settings.supabase_url = 'https://your-project-ref.supabase.co';
```

Manual cleanup test uses `net.http_post` directly or `select public.invoke_cleanup_expired_challenges();`; do not use `cron.schedule('now')`.

### Release-Readiness Checklist für Staging

- Registration success.
- Replayed challenge rejected.
- Device hash mismatch rejected.
- Tampered grant rejected.
- Wrong signature rejected.
- Properly signed expired grant rejected.
- Valid grant revalidates online.
- Revoked grant returns `valid: false`.
- Network failure returns `null` locally, not `false`.
- Encrypted cache decrypts with the correct grant.
- Encrypted cache fails with the wrong grant.
- Offline mutation attempts fail at the data layer.

## Key-Rotation

### Publishable/Anon Key

1. Neues Schlüsselpaar in Supabase **Project Settings → API** erzeugen.
2. Neuen `VITE_SUPABASE_ANON_KEY` in der Deployment-Umgebung setzen.
3. `npm run build` neu ausführen (die Variable wird statisch eingebettet).
4. Alten Key in Supabase widerrufen, nachdem das Deployment stabil läuft.

### Edge Function Secrets

```powershell
supabase secrets set GLM_API_KEY="<neuer-key>"
supabase secrets set DEEPSEEK_API_KEY="<neuer-key>"
supabase secrets set OFFLINE_SIGNING_KEY="<neuer-key>"
supabase secrets set VAPID_PRIVATE_KEY="<neuer-key>"
supabase secrets set VAPID_PUBLIC_KEY="<neuer-key>"
supabase functions deploy ai-coach get-device-challenge register-device revalidate-grant cleanup-expired-challenges subscribe-push send-push
```

### VAPID Key Pair

Bei Rotation müssen alle Push-Subscriptions neu abgeschlossen werden (User müssen Push erneut aktivieren), da der alte Public Key an den Endpoints hängt.

## Secrets & API Keys

- `GLM_API_KEY` und `DEEPSEEK_API_KEY` nie in `.env`, `.env.example` oder als `VITE_*` eintragen — nur als Supabase Edge Function Secrets.
- Server-only Werte gehören in Supabase Edge Function Secrets oder `.env.server`, nie in den Browser.

## Observability

- Optionale Integration von @sentry/react in `main.tsx` verfügbar, konfigurierbar über `VITE_SENTRY_DSN`.
