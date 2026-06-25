# Cloud-Sync & Offline-Handling

## Sync-Strategie

- Vollständiger Push/Pull-Snapshot statt inkrementeller Änderungen oder Realtime-Subscriptions.
- Konfliktauflösung nach Last-Write-Wins (`updatedAt`-Timestamp).
- Tests für Last-Write-Wins sind implementiert.

## Offline-Queue

- Änderungen offline werden vermerkt (`pendingOfflineChanges`) und bei Wiederherstellung der Verbindung asynchron gesynct.

## Sync-Status & Fehlerbehandlung

- Sync-Status-Badge ist bei Fehlern klickbar und löst `syncNow()` aus.
- Tooltip zeigt die Fehlermeldung.

## Offene Punkte

- TODO section (not implemented yet): **Realtime inkrementeller Sync** — architektureller Umbau von Snapshot-Sync zu echtzeitbasiertem, inkrementellem Sync.
- TODO section (not implemented yet): **Seed-Daten für Gäste** — Kalender-Vorschau nutzt Demo-Daten; keine echte anonyme Cloud-Vorschau.
