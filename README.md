# Klausurplaner PWA

Klausurplaner ist eine mobile-first Progressive Web App für Schülerinnen und Schüler. Die App organisiert Klausuren, generiert Lernpläne, trackt Fortschritt und kombiniert Fokusmodus, Analytics, Gamification und einen KI-Coach.

Die App ist **über das MVP hinaus gewachsen**: Supabase-Auth, Cloud-Sync, Gast-Vorschau, geführtes Onboarding, Unit-Tests, Web-Push, Datei-Upload, Analytics-Export, iCal-Export, KI-Rate-Limit-Feedback und ein i18n-Grundgerüst sind implementiert. Für ein produktionsreifes Produkt bleiben noch größere Features wie Lerngruppen, vollständige i18n, KI-Kontext aus Materialien und Realtime-Sync.

## Stack

- React 19 + TypeScript
- Vite 7
- Zustand (Persist via LocalStorage)
- Supabase Auth + Postgres (Cloud-Sync)
- Tailwind CSS 4, lucide-react
- PWA: Web App Manifest + Service Worker

## Quickstart

```powershell
npm install
cp .env.example .env   # Werte eintragen, siehe docs/setup.md
npm run dev
```

App öffnet sich unter `http://localhost:5177` (Port konfigurierbar in `.env`).

Tests ausführen:

```powershell
npm test
```

Produktionsbuild:

```powershell
npm run build
npm run preview
```

## Dokumentation

| Thema | Datei |
|-------|-------|
| Installation & Setup | [docs/setup.md](docs/setup.md) |
| Auth & Zugriffsmodell | [docs/auth.md](docs/auth.md) |
| Architektur & Projektstruktur | [docs/architecture.md](docs/architecture.md) |
| Lernplan & Klausurverwaltung | [docs/features/learning-plan.md](docs/features/learning-plan.md) |
| Produktivität: Dashboard, Kalender, Fokus, Analytics, Gamification | [docs/features/productivity.md](docs/features/productivity.md) |
| KI-Coach (GLM + DeepSeek) | [docs/features/ai-coach.md](docs/features/ai-coach.md) |
| Cloud-Sync & Offline-Handling | [docs/features/sync.md](docs/features/sync.md) |
| Datei-Upload & Lernmaterialien | [docs/features/materials.md](docs/features/materials.md) |
| PWA, Push-Benachrichtigungen, Service Worker | [docs/features/pwa.md](docs/features/pwa.md) |
| UI: Mobile-first, Dark Mode, i18n, Barrierefreiheit | [docs/features/ui.md](docs/features/ui.md) |
| Sicherheit: RLS, Verschlüsselung, Key-Rotation | [docs/security.md](docs/security.md) |
| Deployment & Edge Functions | [docs/deployment.md](docs/deployment.md) |
| Roadmap & offene Punkte | [docs/roadmap.md](docs/roadmap.md) |

## Lizenz

Privates Projekt — siehe Repository-Inhaber.
