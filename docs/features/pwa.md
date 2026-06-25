# PWA, Push-Benachrichtigungen & Service Worker

## Progressive Web App

- Web App Manifest: `public/manifest.json`
- Service Worker: `public/service-worker.js`
- Shell-Caching via Stale-While-Revalidate

## Service Worker

- Caching-Strategie für App-Shell ist via Stale-While-Revalidate optimiert.
- Push-Event-Handler zeigt Benachrichtigungen an.
- Click-Handler auf Benachrichtigungen öffnet die App.

## Web Push (Hintergrund-Benachrichtigungen)

### Einrichtung

1. VAPID-Schlüsselpaar erzeugen (z. B. mit `web-push` CLI oder OpenSSL).
2. `VITE_VAPID_PUBLIC_KEY` in `.env` und `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` als Edge Function Secrets setzen.
3. Migration `20250101000005_push_subscriptions.sql` ausführen.
4. Edge Functions deployen:

```powershell
supabase functions deploy subscribe-push
supabase functions deploy send-push
```

### Frontend-Integration

- Der Aktivierungsbutton in Settings ruft `subscribeUserToPush()` auf.
- Der Service Worker zeigt Benachrichtigungen im `push`-Event und öffnet die App bei Klick.

## Browser-Benachrichtigungen

- Lokale Browser-Benachrichtigungen bei erteigter Permission.
- Web Push für Hintergrund-Benachrichtigungen (benötigt VAPID).

## Install-Prompt

- `beforeinstallprompt`-Event ist in `App.tsx` hinzugefügt.
- TODO section (not implemented yet): Geführter Install-Flow muss noch im UI angezeigt werden.

## VAPID Key Rotation

Bei Rotation müssen alle Push-Subscriptions neu abgeschlossen werden (User müssen Push erneut aktivieren), da der alte Public Key an den Endpoints hängt.
