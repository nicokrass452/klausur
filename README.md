# Klausurplaner PWA

Klausurplaner ist eine mobile-first Progressive Web App für Schülerinnen und Schüler. Die App organisiert Klausuren, generiert Lernpläne, trackt Fortschritt und kombiniert Fokusmodus, Analytics, Gamification und einen KI-Coach.

Die App ist **über das MVP hinaus gewachsen**: Supabase-Auth, Cloud-Sync, Gast-Vorschau und ein geführtes Onboarding sind implementiert. Für ein produktionsreifes Produkt fehlen noch Tests, echtes Offline-Verhalten, Push im Hintergrund und mehrere Backend-/Sync-Härtungen — siehe [Bekannte Probleme & offene Punkte](#bekannte-probleme--offene-punkte).

## Stack

- React 19 + TypeScript
- Vite 7
- Zustand (Persist via LocalStorage)
- Supabase Auth + Postgres (Cloud-Sync)
- Tailwind CSS 4, lucide-react
- PWA: Web App Manifest + Service Worker

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

Server-only Werte gehoeren in Supabase Edge Function Secrets oder `.env.server`, nie in den Browser und nie mit `VITE_`:

```text
OFFLINE_READONLY_ENABLED=false
OFFLINE_SIGNING_KEY=
CLEANUP_CRON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
# VAPID key pair for Web Push (server-only).
VAPID_PRIVATE_KEY=
VAPID_PUBLIC_KEY=
```

**Production Guardrail:** Offline Read-Only Access ist vorbereitet, bleibt aber bis zur Staging-/Release-Readiness-Pruefung deaktiviert. In Production vorerst nicht setzen:

```text
VITE_ENABLE_OFFLINE_READONLY=true
OFFLINE_READONLY_ENABLED=true
```

### Supabase einrichten

1. Neues Supabase-Projekt anlegen.
2. Die Migrationen im Ordner `supabase/migrations/` in Supabase ausführen. Das geht entweder über die Supabase CLI oder durch manuelles Ausführen der Dateien (erst `20240101000000_init.sql`, dann `20240101000001_delete_account.sql`) im **SQL Editor**.
3. Unter **Settings → API Keys** die Publishable Key (oder legacy anon JWT) nach `VITE_SUPABASE_ANON_KEY` kopieren.
4. Optional: **Authentication → Providers → Google** aktivieren und Client-ID/Secret eintragen.
5. Unter **Authentication → URL Configuration** die Redirect-URL erlauben (z. B. `http://localhost:5177/dashboard`).

### Google Login

1. In Supabase `Authentication` → `Providers` → `Google` öffnen.
2. Google Provider aktivieren und Client-ID plus Client Secret eintragen.
3. In Supabase `Authentication` → `URL Configuration` die Redirect-URL erlauben.
4. In der Google Cloud Console dieselbe Redirect-URL für den OAuth-Client freigeben.

## Auth & Zugriffsmodell

| Zustand | Verfügbar |
|--------|-----------|
| **Gast** (ohne Account) | Nur Kalender-Vorschau mit Terminen |
| **Eingeloggt** | Dashboard, Klausuren, Lernplan, Coach, Fokus, Analytics, Settings, Cloud-Sync |
| **Offline Read-Only** (Feature Flag) | Letzter verschluesselter Snapshot, keine Bearbeitung, kein Supabase-Auth-Ersatz |

- Registrierung: `/signup` (E-Mail oder Google)
- Anmeldung: `/login`
- Nach dem ersten Login: geführtes Onboarding-Tutorial (11 Schritte, alle Hauptfunktionen)
- Auth-Session wird bei jedem Start serverseitig über Supabase validiert (kein vertrauenswürdiger Cache)

- Offline Read-Only entsperrt nur lokal gespeicherte Daten und erzwingt Lesemodus an der Store-/Datenebene.

## Aktuelle Funktionen

### Lernen & Planung
- Klausuren mit Fach, Datum, Uhrzeit, Raum, Notizen, Schwierigkeit, Wissensstand, Tagesminuten
- Themen mit Fortschritt in Prozent
- Automatischer Lernplan (Prioritätsformel, 70/20/10, Spaced Repetition: Tag 1, 2, 5, 10, 18)
- Manuelle Neuverteilung verpasster Aufgaben
- Lernmaterialien (Notizen, Links, PDFs) pro Klausur — Upload in Supabase Storage mit offline Fallback

### Produktivität & Motivation
- Dashboard: nächste Klausur, Countdown, XP, Level, Streak, Fokuszeit
- Kalender (Woche/Monat)
- Pomodoro-Fokusmodus (25/5)
- Analytics: Lernzeit, Fortschritt, Schwachstellen (Basis)
- Gamification: XP, Level, Badges, Streak

### KI & Cloud
- KI-Coach mit Modi: Coach, Quiz, Karteikarten, Plan, Erklären
- GLM + DeepSeek über Supabase Edge Function `ai-coach` (Mock-Fallback lokal)
- Supabase Cloud-Sync (Push/Pull mit Konfliktauflösung nach `updatedAt`)
- Browser-Benachrichtigungen + Web Push (Hintergrund) bei erteilter Permission

### UI
- Mobile-first, Bottom-Navigation + Sidebar
- Dark Mode
- Überarbeitete Fortschrittsbalken, Segmented Controls, deutsche Umlaute

## GLM KI mit DeepSeek-Fallback (Edge Function)

Die GLM- und DeepSeek-APIs werden nicht direkt aus dem Browser aufgerufen. Das Frontend ruft `supabase.functions.invoke("ai-coach")` auf; die Edge Function prüft das Supabase-Auth-JWT, validiert Eingaben und ruft erst GLM, dann DeepSeek auf. Erst wenn beide Provider fehlschlagen, nutzt das Frontend den lokalen Mock-Fallback.

Edge Function deployen:

```powershell
supabase login
supabase link --project-ref <dein-project-ref>
supabase secrets set GLM_API_KEY="<dein-zhipu-api-key>"
supabase secrets set GLM_MODEL="glm-4.7-flash"
supabase secrets set DEEPSEEK_API_KEY="<dein-deepseek-api-key>"
supabase secrets set DEEPSEEK_MODEL="deepseek-v4-flash"
supabase functions deploy ai-coach
```

Lokal testen:

```powershell
supabase functions serve ai-coach --env-file ./supabase/.env.local
```

`supabase/.env.local` nur lokal verwenden — nicht ins Frontend oder Git:

```text
GLM_API_KEY=...
GLM_MODEL=glm-4.7-flash
DEEPSEEK_API_KEY=...
DEEPSEEK_MODEL=deepseek-v4-flash
```

**Wichtig:** `GLM_API_KEY` und `DEEPSEEK_API_KEY` nie in `.env`, `.env.example` oder als `VITE_*` eintragen.

## Datei-Upload (Supabase Storage)

Lernmaterialien (PDFs) werden in einen privaten `materials` Bucket hochgeladen. RLS erlaubt nur dem eigenen User Zugriff auf Dateien unter `<user_id>/<exam_id>/<material_id>/`.

Migration:

```sql
-- supabase/migrations/20250101000004_materials_storage.sql
```

Edge Function Secrets:

```powershell
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

## Web Push (Hintergrund-Benachrichtigungen)

1. VAPID-Schlüsselpaar erzeugen (z. B. mit `web-push` CLI oder OpenSSL).
2. `VITE_VAPID_PUBLIC_KEY` in `.env` und `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` als Edge Function Secrets setzen.
3. Migration `20250101000005_push_subscriptions.sql` ausführen.
4. Edge Functions deployen:

```powershell
supabase functions deploy subscribe-push
supabase functions deploy send-push
```

Frontend: Der Aktivierungsbutton in Settings ruft `subscribeUserToPush()` auf. Der Service Worker zeigt Benachrichtigungen im `push`-Event und öffnet die App bei Klick.

## Offline Read-Only Cache Access (Feature Flag)

Offline Read-Only Access ist browser-bound und dient nur dazu, zuvor synchronisierte Daten lokal zu lesen, wenn Supabase nicht erreichbar ist. Es ist **kein** Offline-Supabase-Auth, keine hardwaregebundene Device Identity und kein Ersatz fuer Revocation-Pruefungen im Online-Betrieb.

Status:

- Client-Flag: `VITE_ENABLE_OFFLINE_READONLY=false` per Default.
- Edge-Function-Flag: `OFFLINE_READONLY_ENABLED=false` per Default.
- Production bleibt deaktiviert, bis Staging-/Release-Readiness bestanden ist.

Registrierung:

1. Der Browser erzeugt ein exportierbares ECDSA-P-256 Device-Keypair in IndexedDB.
2. Die App berechnet `device_hash` als SHA-256 des SPKI Public Keys.
3. `get-device-challenge` erstellt eine 5-Minuten-Challenge fuer den angemeldeten Supabase-User.
4. `register-device` verifiziert Challenge-Signatur, Public-Key-Thumbprint und erstellt ein ES256 Offline Grant.
5. Der Offline Grant wird lokal gespeichert und verschluesselt den letzten Sync-Snapshot.

Cache-Schutz:

- Snapshots werden mit AES-256-GCM verschluesselt.
- Der Schluessel wird aus dem Offline Grant via PBKDF2 SHA-256 mit 100.000 Iterationen abgeleitet.
- Das schuetzt gegen beilaufige Inspektion. Wenn Browser Storage inklusive Grant kopiert wird, kann der Cache weiterhin entschluesselt werden.

Supabase Edge Functions:

```powershell
supabase secrets set OFFLINE_READONLY_ENABLED=false
supabase secrets set OFFLINE_SIGNING_KEY="<base64url-pkcs8-p256-private-key>"
supabase secrets set CLEANUP_CRON_KEY="<random-cron-secret>"
supabase functions deploy get-device-challenge
supabase functions deploy register-device
supabase functions deploy revalidate-grant
supabase functions deploy cleanup-expired-challenges
```

Cron/Vault:

```sql
select vault.create_secret('your-cleanup-cron-key', 'CLEANUP_CRON_KEY');
alter database postgres set app.settings.supabase_url = 'https://your-project-ref.supabase.co';
```

Manual cleanup test uses `net.http_post` directly or `select public.invoke_cleanup_expired_challenges();`; do not use `cron.schedule('now')`.

Release-readiness checklist for staging:

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

## RLS-Verifizierung

Vor jedem Release sollte `supabase/migrations/20250101000006_verify_rls.sql` im SQL Editor ausgeführt werden. Die Assertionen prüfen, dass RLS auf allen App-Tabellen aktiviert ist und mindestens eine Policy existiert.

```sql
-- Führt die enthaltenen DO-Block-Assertionen aus
```

Dieser Schritt ist manuell durchzuführen, da er eine live Datenbank benötigt.

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

## Projektstruktur

```text
index.html
package.json
vite.config.ts
supabase-schema.sql          # Postgres-Schema + RLS
supabase/functions/ai-coach/ # Edge Function für KI
src/
  main.tsx
  App.tsx
  routes/AppRouter.tsx
  pages/                     # Dashboard, Calendar, Exams, Coach, …
  components/                # UI, AuthGuard, Tutorial, Navigation
  store/useAppStore.ts       # Zustand + Persist
  services/                  # syncService, aiService, studyPlanGenerator
  lib/                       # supabase, constants, navigation
  styles/globals.css
public/
  manifest.json
  service-worker.js
  icons/
```

## Architektur

```text
React UI (pages + components)
  ↓
Zustand Store (LocalStorage-Persist für Lern-Daten)
  ↓
Domain Services (Lernplan, Gamification, Sync, KI)
  ↓
Supabase (Auth + Postgres)     Edge Functions (ai-coach)
  ↓
PWA Layer (Manifest, Service Worker — Shell-Cache)
```

**Online-first:** Volle Funktionen erfordern Login und eine aktive Verbindung. LocalStorage dient als schneller lokaler Cache; die autoritative Cloud-Kopie liegt in Supabase nach erfolgreichem Sync.

## Lernplan-Algorithmus

Priorität:

```text
priorität = (schwierigkeit × 2) + (6 − wissensstand)
```

Verteilung: 70 % neue Inhalte · 20 % Wiederholung · 10 % Puffer

Spaced Repetition: Tag 1, 2, 5, 10, 18

## User Flow

```mermaid
flowchart TD
  A[App öffnen] --> B{Eingeloggt?}
  B -->|Nein| C[Kalender-Vorschau / Registrieren]
  B -->|Ja| D[Onboarding-Tutorial]
  D --> E[Dashboard]
  E --> F[Klausur erstellen]
  F --> G[Themen hinzufügen]
  G --> H[Lernplan generieren]
  H --> I[Heute lernen / Fokusmodus]
  I --> J[Aufgabe abschließen]
  J --> K[XP, Streak, Sync]
  K --> L[Analytics / KI-Coach]
```

## Bekannte Probleme & offene Punkte

Diese Liste beschreibt, was für ein **produktionsreifes Produkt jenseits des MVP** noch fehlt oder verbessert werden muss.

### Infrastruktur & Backend
- [x] **Datenbank-Setup manuell** — Migrationen befinden sich in `supabase/migrations/`.
- [x] **Keine CI/CD-Pipeline** — CI/CD Pipeline (GitHub Actions) mit Test und Build eingerichtet.
- [x] **Keine automatisierten Tests** — Unit-Tests (Vitest/Testing Library) für Store, Sync und Generator hinzugefügt.
- [x] **Deploy-Env** — Production-Builds und Secrets in der GitHub Actions CI dokumentiert und eingepflegt.

### Auth & Account
- [x] **Passwort zurücksetzen** — „Passwort zurücksetzen“-Flow im Settings-Menü implementiert.
- [x] **Account löschen** — RPC Call zum Löschen des Accounts und aller Cloud-Daten vorhanden.
- [x] **E-Mail-Bestätigung** — Login erkennt unbestätigte E-Mail-Adressen und bietet "Erneut senden" an; `resendConfirmationEmail` in syncService.
- [ ] **Session-Handling auf mehreren Geräten** — kein explizites Geräte-Management oder „überall abmelden“ außer globalem Sign-out.

### Sync & Daten
- [ ] **Sync-Strategie grob** — vollständiger Push/Pull-Snapshot statt inkrementeller Änderungen oder Realtime-Subscriptions.
- [x] **Konfliktauflösung simpel** — Tests für Last-Write-Wins (updatedAt) hinzugefügt.
- [x] **Kein Offline-Queue** — Änderungen offline werden nun vermerkt (`pendingOfflineChanges`) und bei Wiederherstellung der Verbindung asynchron gesynct.
- [x] **Materialien / Dateien** — PDF-Upload in privaten Supabase Storage Bucket (max. 10 MB) mit RLS; offline Fallback zu IndexedDB; Vorschau/Download-Link in ExamDetail.
- [ ] **Seed-Daten für Gäste** — Kalender-Vorschau nutzt Demo-Daten; keine echte anonyme Cloud-Vorschau.

### Lernlogik & Features
- [x] **Verpasste Aufgaben** — Automatische Neuverteilung verpasster offener Aufgaben beim App-Start (sofern online und nicht im Offline-Lesemodus).
- [ ] **Lernplan nicht adaptiv** — keine echte Schwachstellenanalyse oder dynamische Priorisierung aus Nutzungsdaten.
- [x] **Analytics basic** — CSV-Export der Lernzeiten/XP sowie 7/14/30-Tage-XP-Trends in Analytics verfügbar.
- [x] **Kein iCal/Google-Calendar-Export** — ICS-Export für einzelne Klausuren und alle aktiven Klausuren in `Exams` und `ExamDetail` verfügbar.
- [ ] **Keine Lerngruppen** — kein Teilen von Plänen, keine gemeinsamen Klausuren.

### KI
- [x] **Edge Function Pflicht für echte KI** — Proaktiver Hinweis auf aktiven KI-Modus (Edge Function vs. Mock-Fallback) in Coach, ExamDetail und StudyPlan.
- [x] **Kein Rate-Limit-Feedback** — HTTP-429 wird in `aiService` erkannt und als prominentes Rate-Limit-Feedback in Coach, ExamDetail und StudyPlan angezeigt.
- [ ] **Kein Kontext aus Materialien** — Coach kennt hochgeladene PDFs/Notizen noch nicht.

### PWA & Benachrichtigungen
- [x] **Service Worker minimal** — Caching Strategie für App-Shell in public/service-worker.js via Stale-While-Revalidate optimiert.
- [x] **Kein Web Push im Hintergrund** — `push_subscriptions` Tabelle, `subscribe-push` + `send-push` Edge Functions (VAPID-Signatur), Service-Worker Push/Click Handler und Aktivierungs-Button in Settings.
- [x] **Kein Install-Prompt-Flow** — `beforeinstallprompt`-Event in `App.tsx` hinzugefügt, geführter Flow muss noch im UI angezeigt werden.

### UI & UX
- [x] **Tutorial nicht überspringbar** — Onboarding-Tutorial kann mit „Später“ übersprungen werden; Neustart über Einstellungen möglich.
- [x] **Fehler-Feedback bei Sync** — Sync-Status-Badge ist bei Fehlern klickbar und löst `syncNow()` aus; Tooltip zeigt die Fehlermeldung.
- [x] **Barrierefreiheit** — Fokussierte Durchgänge: aria-labels für Icon-Buttons, aria-live Regionen für Sync-Fehler/Coach-Laden/XP-Toast, Escape schließt das Tutorial. Vollständige Audit bleibt offen.
- [x] **Internationalisierung** — Leichtgewichtige i18n-Infrastruktur (`src/lib/i18n.ts`, `src/locales/de.ts`, `src/locales/en.ts`) mit Sprachumschaltung in Settings; nur hochsichtbare Strings extrahiert, Rest fallback zu Key.

### Sicherheit & Betrieb
- [x] **RLS Policies** — `20250101000006_verify_rls.sql` prüft RLS + Policies vor Release im SQL Editor.
- [x] **API-Key-Rotation** — Abschnitt "Key-Rotation" dokumentiert Rotation von Publishable/Anon Keys, Edge-Function-Secrets und VAPID-Keys.
- [x] **Observability** — optionale Integration von @sentry/react in `main.tsx` verfügbar, konfigurierbar über `VITE_SENTRY_DSN`.

## Roadmap (kurz)

In diesem Durchlauf abgeschlossen:

- Überspringbares Tutorial, Sync-Retry in der Hauptnavigation, automatische Neuverteilung verpasster Aufgaben
- iCal/Google-Calendar Export, Analytics CSV + XP-Trends
- KI Provider-Hinweis + Rate-Limit-Feedback
- PDF-Upload in Supabase Storage
- Web Push MVP (Subscribe/Send Edge Functions, VAPID, Service Worker)
- E-Mail-Bestätigungs-UX, Barrierefreiheits-Pass, i18n-Foundation
- RLS-Verifizierung + Key-Rotation-Doku

Explizit zurückgestellt (noch offen):

- Lerngruppen / geteilte Pläne (Schema, Invites, RLS, UI — mehrere Tage)
- Vollständige i18n (nur Foundation; restliche Strings extrahieren)
- Echter KI-Kontext aus hochgeladenen Materialien
- Realtime inkrementeller Sync (architektureller Umbau)
- Multi-Device Session Management

Nächste Prioritäten:

1. KI-Kontext aus Materialien (Storage → ai-coach)
2. Lerngruppen / geteilte Pläne
3. Vollständige i18n (EN) und Accessibility-Audit
4. Realtime / inkrementeller Sync
5. Adaptive Lernplanung

## Lizenz

Privates Projekt — siehe Repository-Inhaber.
