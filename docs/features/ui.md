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
- Vollständige i18n (EN): Alle UI-Strings in Pages und Components sind über `t(key, language)` angebunden; `en.ts` deckt alle Keys aus `de.ts` ab.

## Barrierefreiheit

- ARIA-Labels für Icon-Buttons.
- ARIA-Live-Regionen für Sync-Fehler, Coach-Laden, XP-Toast, Offline-Status, Kopier-Feedback.
- Escape schließt das Tutorial und das Mobile-More-Menü (mit Fokus-Rückkehr zum Trigger).
- Vollständiger Accessibility-Audit: `:focus-visible` Global-Style, Skip-Link, `role="progressbar"`/`role="timer"`/`role="log"`/`role="group"`/`role="menu"`, `aria-pressed`/`aria-expanded`/`aria-controls` für Toggles und Disclosures, Tab-Containment im Menü, `aria-hidden` auf dekorativen Icons, Label-Input-Verknüpfungen.

## Onboarding-Tutorial

- Geführtes Onboarding-Tutorial mit 11 Schritten nach dem ersten Login.
- Alle Hauptfunktionen werden vorgestellt.
- Tutorial kann mit „Später" übersprungen werden; Neustart über Einstellungen möglich.
