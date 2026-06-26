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

- `beforeinstallprompt`-Event wird in `App.tsx` abgefangen und der Prompt im `useInstallPrompt`-Hook gespeichert.
- Geführter Install-Flow: `InstallPromptCard`-CTA in Dashboard und Settings; iOS-Safari-Anleitung für „Zum Home-Bildschirm"; CTA wird nach Installation oder Dismissal ausgeblendet.
- Status: siehe [`docs/roadmap.md`](../roadmap.md) (PWA & Benachrichtigungen → Install-Prompt-Flow). Offene Punkte als tracked Issue in [`docs/issues.md`](../issues.md).

## VAPID Key Rotation

Bei Rotation müssen alle Push-Subscriptions neu abgeschlossen werden (User müssen Push erneut aktivieren), da der alte Public Key an den Endpoints hängt.
