# Tracked Issues

Lokaler Index der offenen Features als GitHub Issues. Quelle der Wahrheit für den Feature-Status bleibt [`docs/roadmap.md`](./roadmap.md); dieses Dokument verlinkt die daraus abgeleiteten tracked Issues und hält Akzeptanzkriterien bereit.

> Status-Legende: 🟢 done · 🟡 in progress · ⬜ open

| # | Milestone | Status | Priorität | Titel |
|---|-----------|--------|-----------|-------|
| [#2](https://github.com/nicokrass452/klausur/issues/2) | M1 | 🟢 implemented (manual browser test pending) | high | Finish PWA install prompt flow |
| [#3](https://github.com/nicokrass452/klausur/issues/3) | M2 | 🟢 implemented | high | Add AI context from uploaded materials |
| [#4](https://github.com/nicokrass452/klausur/issues/4) | M3 | ⬜ open | medium | Complete i18n and accessibility |
| [#5](https://github.com/nicokrass452/klausur/issues/5) | M4 | ⬜ open | medium | Implement adaptive learning plan |
| [#6](https://github.com/nicokrass452/klausur/issues/6) | M5 | ⬜ open | medium | Build incremental / realtime sync |
| [#7](https://github.com/nicokrass452/klausur/issues/7) | M6 | ⬜ open | medium | Add Lerngruppen / shared plans |
| [#8](https://github.com/nicokrass452/klausur/issues/8) | M7 | ⬜ open | medium | Add multi-device session management |
| [#9](https://github.com/nicokrass452/klausur/issues/9) | M7 | ⬜ open | medium | Add real guest seed data |

## Empfohlene Reihenfolge (Milestones)

1. **M1** — Docs cleanup + PWA install prompt (klein/schnell) → [#2](https://github.com/nicokrass452/klausur/issues/2)
2. **M2** — AI material context (höchster Wert, Top-Priorität) → [#3](https://github.com/nicokrass452/klausur/issues/3)
3. **M3** — i18n + Accessibility (Product Polish) → [#4](https://github.com/nicokrass452/klausur/issues/4)
4. **M4** — Adaptive Learning → [#5](https://github.com/nicokrass452/klausur/issues/5)
5. **M5** — Incremental/Realtime Sync (Architektur) → [#6](https://github.com/nicokrass452/klausur/issues/6)
6. **M6** — Lerngruppen/Shared Plans (nach stabilem Sync) → [#7](https://github.com/nicokrass452/klausur/issues/7)
7. **M7** — Multi-Device Sessions + Guest Seed Data → [#8](https://github.com/nicokrass452/klausur/issues/8), [#9](https://github.com/nicokrass452/klausur/issues/9)

## Akzeptanzkriterien je Issue

### #2 — Finish PWA install prompt flow 🟡
- Nutzer:innen können die App über einen klaren UI-Flow installieren.
- Nicht unterstützte Browser (z. B. iOS Safari) zeigen nützliche manuelle Anleitungen.
- CTA bleibt nach Installation oder Dismissal ausgeblendet.

### #3 — Add AI context from uploaded materials 🟢
- Der Coach kann Fragen auf Basis hochgeladener Notizen/PDFs beantworten.
- Er legt niemals Materialien eines anderen Nutzers offen (RLS serverseitig erzwungen).
- Die UI zeigt klar an, wann Materialkontext verwendet wird.

### #4 — Complete i18n and accessibility ⬜
- Haupt-Flows funktionieren auf Deutsch und Englisch.
- Tastatur-Nutzer:innen können Core-Flows abschließen.
- Keine kritischen Accessibility-Issues auf Schlüsselseiten.

### #5 — Implement adaptive learning plan ⬜
- Schwache Themen bekommen mehr Lernzeit.
- Kürzlich gemeisterte Themen werden depriorisiert.
- Tagesminuten und Spaced Repetition funktionieren weiterhin.

### #6 — Build incremental / realtime sync ⬜
- Zwei Geräte konvergieren ohne Full-Snapshot-Overwrite.
- Offline-Änderungen synchronisieren korrekt nach Reconnect.
- Deletes werden propagiert.
- Realtime-Updates erscheinen ohne Refresh.

### #7 — Add Lerngruppen / shared plans ⬜
- Nutzer:innen können eine Gruppe anlegen.
- Nutzer:innen können andere einladen.
- Geteilte Klausuren/Pläne erscheinen für Mitglieder.
- Nicht-Mitglieder werden durch RLS blockiert.

### #8 — Add multi-device session management ⬜
- Nutzer:innen sehen aktive/recente Geräte.
- Nutzer:innen können ein anderes Gerät widerrufen.
- Widerrufene Geräte können nicht syncen oder geschützte Edge Functions nutzen.

### #9 — Add real guest seed data ⬜
- Gast-Vorschau ist cloud-konfigurierbar.
- Es werden keine Nutzerdaten offengelegt.
- Die App funktioniert weiterhin, falls der Preview-Fetch fehlschlägt.

## Hinweis zur Issue-Erstellung

Die Issues wurden über die GitHub REST API angelegt (die `gh` CLI war in der Sandbox nicht verfügbar). Jede Issue enthält im Body die Tasks und Acceptance Criteria; Labels: `type:*`, `priority:*`, `milestone:*`. Status-Änderungen werden in diesem Dokument und in [`docs/roadmap.md`](./roadmap.md) nachgezogen.
