# Roadmap & Offene Punkte

Diese Liste beschreibt, was für ein **produktionsreifes Produkt jenseits des MVP** noch fehlt oder verbessert werden muss.

## Abgeschlossen in diesem Durchlauf

- Überspringbares Tutorial, Sync-Retry in der Hauptnavigation, automatische Neuverteilung verpasster Aufgaben
- iCal/Google-Calendar Export, Analytics CSV + XP-Trends
- KI Provider-Hinweis + Rate-Limit-Feedback
- PDF-Upload in Supabase Storage
- Web Push MVP (Subscribe/Send Edge Functions, VAPID, Service Worker)
- E-Mail-Bestätigungs-UX, Barrierefreiheits-Pass, i18n-Foundation
- RLS-Verifizierung + Key-Rotation-Doku

## Bekannte Probleme & Offene Punkte

### Infrastruktur & Backend

| Status | Thema | Beschreibung |
|--------|-------|-------------|
| ✅ | Datenbank-Setup manuell | Migrationen befinden sich in `supabase/migrations/`. |
| ✅ | CI/CD-Pipeline | CI/CD Pipeline (GitHub Actions) mit Test und Build eingerichtet. |
| ✅ | Unit-Tests | Unit-Tests (Vitest/Testing Library) für Store, Sync und Generator hinzugefügt. |
| ✅ | Deploy-Env | Production-Builds und Secrets in der GitHub Actions CI dokumentiert und eingepflegt. |

### Auth & Account

| Status | Thema | Beschreibung |
|--------|-------|-------------|
| ✅ | Passwort zurücksetzen | „Passwort zurücksetzen"-Flow im Settings-Menü implementiert. |
| ✅ | Account löschen | RPC Call zum Löschen des Accounts und aller Cloud-Daten vorhanden. |
| ✅ | E-Mail-Bestätigung | Login erkennt unbestätigte E-Mail-Adressen und bietet "Erneut senden" an; `resendConfirmationEmail` in syncService. |
| ⬜ | Multi-Device Session | Kein explizites Geräte-Management oder „überall abmelden" außer globalem Sign-out. |

### Sync & Daten

| Status | Thema | Beschreibung |
|--------|-------|-------------|
| ⬜ | Inkrementeller Sync | Vollständiger Push/Pull-Snapshot statt inkrementeller Änderungen oder Realtime-Subscriptions. |
| ✅ | Konfliktauflösung | Tests für Last-Write-Wins (updatedAt) hinzugefügt. |
| ✅ | Offline-Queue | Änderungen offline werden vermerkt (`pendingOfflineChanges`) und bei Wiederherstellung der Verbindung asynchron gesynct. |
| ✅ | Materialien / Dateien | PDF-Upload in privaten Supabase Storage Bucket (max. 10 MB) mit RLS; offline Fallback zu IndexedDB; Vorschau/Download-Link in ExamDetail. |
| ⬜ | Seed-Daten für Gäste | Kalender-Vorschau nutzt Demo-Daten; keine echte anonyme Cloud-Vorschau. |

### Lernlogik & Features

| Status | Thema | Beschreibung |
|--------|-------|-------------|
| ✅ | Verpasste Aufgaben | Automatische Neuverteilung verpasster offener Aufgaben beim App-Start (sofern online und nicht im Offline-Lesemodus). |
| ⬜ | Adaptive Lernplanung | Keine echte Schwachstellenanalyse oder dynamische Priorisierung aus Nutzungsdaten. |
| ✅ | Analytics | CSV-Export der Lernzeiten/XP sowie 7/14/30-Tage-XP-Trends in Analytics verfügbar. |
| ✅ | iCal Export | ICS-Export für einzelne Klausuren und alle aktiven Klausuren in `Exams` und `ExamDetail` verfügbar. |
| ⬜ | Lerngruppen | Kein Teilen von Plänen, keine gemeinsamen Klausuren. |

### KI

| Status | Thema | Beschreibung |
|--------|-------|-------------|
| ✅ | Edge Function Pflicht | Proaktiver Hinweis auf aktiven KI-Modus (Edge Function vs. Mock-Fallback) in Coach, ExamDetail und StudyPlan. |
| ✅ | Rate-Limit-Feedback | HTTP-429 wird in `aiService` erkannt und als prominentes Rate-Limit-Feedback in Coach, ExamDetail und StudyPlan angezeigt. |
| ⬜ | KI-Kontext aus Materialien | Coach kennt hochgeladene PDFs/Notizen noch nicht. |

### PWA & Benachrichtigungen

| Status | Thema | Beschreibung |
|--------|-------|-------------|
| ✅ | Service Worker | Caching-Strategie für App-Shell in public/service-worker.js via Stale-While-Revalidate optimiert. |
| ✅ | Web Push | `push_subscriptions` Tabelle, `subscribe-push` + `send-push` Edge Functions (VAPID-Signatur), Service-Worker Push/Click Handler und Aktivierungs-Button in Settings. |
| ⬜ | Install-Prompt-Flow | `beforeinstallprompt`-Event in `App.tsx` hinzugefügt, geführter Flow muss noch im UI angezeigt werden. |

### UI & UX

| Status | Thema | Beschreibung |
|--------|-------|-------------|
| ✅ | Tutorial überspringbar | Onboarding-Tutorial kann mit „Später" übersprungen werden; Neustart über Einstellungen möglich. |
| ✅ | Fehler-Feedback bei Sync | Sync-Status-Badge ist bei Fehlern klickbar und löst `syncNow()` aus; Tooltip zeigt die Fehlermeldung. |
| ✅ | Barrierefreiheit | Fokussierte Durchgänge: aria-labels für Icon-Buttons, aria-live Regionen für Sync-Fehler/Coach-Laden/XP-Toast, Escape schließt das Tutorial. Vollständige Audit bleibt offen. |
| ✅ | Internationalisierung | Leichtgewichtige i18n-Infrastruktur (`src/lib/i18n.ts`, `src/locales/de.ts`, `src/locales/en.ts`) mit Sprachumschaltung in Settings; nur hochsichtbare Strings extrahiert, Rest fallback zu Key. |

### Sicherheit & Betrieb

| Status | Thema | Beschreibung |
|--------|-------|-------------|
| ✅ | RLS Policies | `20250101000006_verify_rls.sql` prüft RLS + Policies vor Release im SQL Editor. |
| ✅ | API-Key-Rotation | Abschnitt "Key-Rotation" dokumentiert Rotation von Publishable/Anon Keys, Edge-Function-Secrets und VAPID-Keys. |
| ✅ | Observability | Optionale Integration von @sentry/react in `main.tsx` verfügbar, konfigurierbar über `VITE_SENTRY_DSN`. |

## Nächste Prioritäten

1. KI-Kontext aus Materialien (Storage → ai-coach)
2. Lerngruppen / geteilte Pläne
3. Vollständige i18n (EN) und Accessibility-Audit
4. Realtime / inkrementeller Sync
5. Adaptive Lernplanung

## Explizit zurückgestellt

- Lerngruppen / geteilte Pläne (Schema, Invites, RLS, UI — mehrere Tage)
- Vollständige i18n (nur Foundation; restliche Strings extrahieren)
- Echter KI-Kontext aus hochgeladenen Materialien
- Realtime inkrementeller Sync (architektureller Umbau)
- Multi-Device Session Management
