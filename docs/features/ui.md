# UI: Mobile-first, Dark Mode, i18n, Barrierefreiheit

## Mobile-first Design

- Optimiert für mobile Geräte als primäre Zielplattform.
- Bottom-Navigation + Sidebar für Desktop.

## Dark Mode

- Vollständiger Dark Mode Support.

## UI-Komponenten

- Überarbeitete Fortschrittsbalken.
- Segmented Controls.
- Deutsche Umlaute korrekt unterstützt.

## Internationalisierung (i18n)

- Leichtgewichtige i18n-Infrastruktur (`src/lib/i18n.ts`, `src/locales/de.ts`, `src/locales/en.ts`) mit Sprachumschaltung in Settings.
- Nur hochsichtbare Strings sind extrahiert; der Rest fällt auf den Key zurück.
- TODO section (not implemented yet): Vollständige i18n (EN) — restliche Strings extrahieren.

## Barrierefreiheit

- ARIA-Labels für Icon-Buttons.
- ARIA-Live-Regionen für Sync-Fehler, Coach-Laden, XP-Toast.
- Escape schließt das Tutorial.
- TODO section (not implemented yet): Vollständiger Accessibility-Audit.

## Onboarding-Tutorial

- Geführtes Onboarding-Tutorial mit 11 Schritten nach dem ersten Login.
- Alle Hauptfunktionen werden vorgestellt.
- Tutorial kann mit „Später" übersprungen werden; Neustart über Einstellungen möglich.
