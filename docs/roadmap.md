# Roadmap & Offene Punkte

Diese Liste beschreibt, was für ein **produktionsreifes Produkt jenseits des MVP** noch fehlt oder verbessert werden muss.

## Abgeschlossen in diesem Durchlauf

- Adaptive Lernplanung: Lernplan-Generator priorisiert Themen nach verpassten/ueberfaelligen Aufgaben, Schwierigkeit, Wissensstand, Abschlussstatus und Klausurtermin
- Lerngruppen / geteilte Plaene: lokale Lerngruppen mit Einladungscode, Mitgliedern, geteilten Klausuren, kopierbarer Plan-Zusammenfassung und Supabase-Snapshot-Sync
- KI-Kontext aus Materialien: Coach-Chat erhält Notizen (Inhalt), PDFs (Titel/Dateiname) und Videos (Titel/URL) als Kontext
- Geführter PWA Install-Prompt-Flow: dismissible Install-Banner, mobil sichtbar, mit `appinstalled`-Behandlung
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
| ✅ | Adaptive Lernplanung | Schwachstellenanalyse und dynamische Priorisierung aus Aufgabenstatus, Themen, Schwierigkeit, Wissensstand und Klausurtermin implementiert. |
| ✅ | Analytics | CSV-Export der Lernzeiten/XP sowie 7/14/30-Tage-XP-Trends in Analytics verfügbar. |
| ✅ | iCal Export | ICS-Export für einzelne Klausuren und alle aktiven Klausuren in `Exams` und `ExamDetail` verfügbar. |
| ✅ | Lerngruppen | Lokale Lerngruppen mit Einladungscode, Mitgliedern, geteilten Klausuren, kopierbarer Plan-Zusammenfassung und Cloud-Snapshot-Sync. |

### KI

| Status | Thema | Beschreibung |
|--------|-------|-------------|
| ✅ | Edge Function Pflicht | Proaktiver Hinweis auf aktiven KI-Modus (Edge Function vs. Mock-Fallback) in Coach, ExamDetail und StudyPlan. |
| ✅ | Rate-Limit-Feedback | HTTP-429 wird in `aiService` erkannt und als prominentes Rate-Limit-Feedback in Coach, ExamDetail und StudyPlan angezeigt. |
| ✅ | KI-Kontext aus Materialien | Coach-Chat erhält Notizen (Inhalt), PDFs (Titel/Dateiname) und Videos (Titel/URL) als Kontext. Echte PDF-Textextraktion bleibt zurückgestellt. |

### PWA & Benachrichtigungen

| Status | Thema | Beschreibung |
|--------|-------|-------------|
| ✅ | Service Worker | Caching-Strategie für App-Shell in public/service-worker.js via Stale-While-Revalidate optimiert. |
| ✅ | Web Push | `push_subscriptions` Tabelle, `subscribe-push` + `send-push` Edge Functions (VAPID-Signatur), Service-Worker Push/Click Handler und Aktivierungs-Button in Settings. |
| ✅ | Install-Prompt-Flow | Geführter Install-Banner (dismissible, persistent, mobil sichtbar) in `InstallPromptBanner`; `beforeinstallprompt` + `appinstalled` werden behandelt. |

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

Die verbleibenden Infrastruktur-Themen wie Realtime-Sync, echter Mehrbenutzerbetrieb und vollständige PDF-Textextraktion sind wichtig, aber sie sind große Umbauten mit vergleichsweise wenig sofort sichtbarer QoL-Verbesserung. Für die nächste Produktphase liegt der Fokus deshalb stärker auf KI-Funktionen, die direkt im Lernalltag spürbar sind.

1. KI-Chat als zentrale Lernoberfläche ausbauen
2. Chat-Historie mit Fach-/Klausur-Foldern, Suche und wiederverwendbarem Kontext
3. KI stärker in Dashboard, ExamDetail, StudyPlan, Materialien und Analytics integrieren
4. KI-generierte Mermaid-Diagramme für Lerninhalte, Concept Maps, Abläufe und Zeitlinien
5. KI-generierte Charts für Lernfortschritt, Workload, Themenbeherrschung und Exam-Readiness
6. File-aware AI: bessere Auswertung von Notizen, PDFs und Materialien
7. Realtime / inkrementeller Sync
8. Echte PDF-Textextraktion für KI-Kontext

## KI-Roadmap

### Stärkerer Chat

- Chat kennt aktuelle Klausuren, Themen, Lernplan, verpasste Aufgaben, Materialien, Fortschritt und Spracheinstellung.
- Chat kann zwischen Coach, Study Mode, Quiz, Flashcards, Plan-Optimierung und Erklären wechseln.
- Antworten sollen stärker handlungsorientiert sein: nicht nur erklären, sondern nächste Lernschritte vorschlagen.

### Chat-Historie & Folder-Management

- Chats werden dauerhaft gespeichert und können nach Fach, Klausur, Lerngruppe oder freiem Ordner organisiert werden.
- Jede Klausur kann eigene Chat-Threads haben, z. B. "Fragen", "Quiz", "Zusammenfassungen", "Fehleranalyse" oder "Lernplan".
- Chat-Verläufe sollen durchsuchbar, umbenennbar, archivierbar und löschbar sein.
- Threads behalten ihren Kontext: verknüpfte Klausur, relevante Themen, Materialien, generierte Diagramme, Charts, Quizfragen und Flashcards.
- Nutzer können alte Antworten erneut verwenden, in Materialien speichern oder in neue Aufgaben/Themen umwandeln.
- Später: automatische Vorschläge zum Einsortieren alter Chats in passende Fächer/Klausuren.

### KI-Aktionen

- KI darf strukturierte Änderungen vorschlagen, die erst nach Bestätigung angewendet werden.
- Mögliche Aktionen: Themen erstellen, Aufgaben verschieben, Lernplan anpassen, Quiz erzeugen, Flashcards erzeugen, schwache Themen markieren.
- Jede Aktion muss nachvollziehbar, rückfragbar und abbrechbar bleiben.

### Diagramme mit Mermaid

- KI kann Mermaid-Diagramme aus Themen, Notizen oder Chat-Antworten erzeugen.
- Geeignete Formate: Flowcharts, Mindmaps, Concept Maps, Timelines und einfache Abhängigkeitsgraphen.
- Frontend rendert Diagramme direkt im Chat und optional im ExamDetail-Kontext.
- Später: Diagramm-Knoten in Topics, Flashcards oder Quizfragen umwandeln.

### Charts & Visualisierungen

- Zuerst app-native Charts für Lernfortschritt, XP-Verlauf, Workload, erledigte/verpasste Aufgaben und Exam-Readiness.
- Danach KI-generierte Chart-Spezifikationen, die das Frontend sicher rendert.
- Matplotlib/Python-ähnliche Chart-Erzeugung bleibt eine spätere Ausbaustufe, weil dafür Sandbox, Limits und sichere Dateiverarbeitung nötig sind.
- Ziel ist nicht ein allgemeiner Code-Interpreter, sondern verständliche Lern- und Fortschrittsvisualisierungen.

### File-aware AI

- Materialien stärker in den KI-Kontext einbeziehen.
- Notizen direkt analysieren, PDFs zunächst über Metadaten und später über echte Textextraktion.
- Aus Materialien automatisch Zusammenfassungen, Themenlisten, Quizfragen, Flashcards und Diagramme erzeugen.

## Explizit zurückgestellt

- Echte Mehrbenutzer-Lerngruppen (Realtime-/Mehrbenutzerbeitritt, Invites)
- Realtime inkrementeller Sync (architektureller Umbau)
- Allgemeiner Python-/Matplotlib-Code-Interpreter ohne klaren Lernbezug
- Vollständiger Web-/Deep-Research-Agent
- Multi-Device Session Management
