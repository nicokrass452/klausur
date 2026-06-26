# Auth & Zugriffsmodell

## Zugriffsebenen

| Zustand | Verfügbar |
|--------|-----------|
| **Gast** (ohne Account) | Nur Kalender-Vorschau mit Terminen |
| **Eingeloggt** | Dashboard, Klausuren, Lernplan, Coach, Fokus, Analytics, Settings, Cloud-Sync |
| **Offline Read-Only** (Feature Flag) | Letzter verschlüsselter Snapshot, keine Bearbeitung, kein Supabase-Auth-Ersatz |

## Authentifizierung

- Registrierung: `/signup` (E-Mail oder Google)
- Anmeldung: `/login`
- Nach dem ersten Login: geführtes Onboarding-Tutorial (11 Schritte, alle Hauptfunktionen)
- Auth-Session wird bei jedem Start serverseitig über Supabase validiert (kein vertrauenswürdiger Cache)

## Session-Handling

- Die Auth-Session wird bei jedem App-Start serverseitig über Supabase validiert. Es gibt keinen vertrauenswürdigen lokalen Cache der Session.
- Offline Read-Only entsperrt nur lokal gespeicherte Daten und erzwingt Lesemodus an der Store-/Datenebene.

## Multi-Device Session Management

- TODO section (not implemented yet): Kein explizites Geräte-Management oder "überall abmelden" außer globalem Sign-out.
- Session-Handling auf mehreren Geräten ist noch nicht implementiert.

## E-Mail-Bestätigung

- Login erkennt unbestätigte E-Mail-Adressen und bietet "Erneut senden" an.
- `resendConfirmationEmail` ist in `syncService` implementiert.

## Passwort zurücksetzen

- "Passwort zurücksetzen"-Flow ist im Settings-Menü implementiert.

## Account löschen

- RPC Call zum Löschen des Accounts und aller Cloud-Daten ist vorhanden (Migration `20240101000001_delete_account.sql`).
