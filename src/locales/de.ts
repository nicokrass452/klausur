export const de = {
  // Navigation
  "nav.dashboard": "Dashboard",
  "nav.calendar": "Kalender",
  "nav.exams": "Klausuren",
  "nav.studyPlan": "Lernplan",
  "nav.coach": "AI Trainer",
  "nav.focus": "Fokusmodus",
  "nav.analytics": "Analytics",
  "nav.settings": "Einstellungen",

  // Common actions
  "action.save": "Speichern",
  "action.cancel": "Abbrechen",
  "action.delete": "Löschen",
  "action.edit": "Bearbeiten",
  "action.close": "Schließen",
  "action.back": "Zurück",
  "action.next": "Weiter",
  "action.skip": "Später",

  // Common labels
  "app.name": "Klausurplaner",
  "app.loading": "Klausurplaner lädt...",

  // Settings
  "settings.title": "Einstellungen",
  "settings.theme": "Darstellung",
  "settings.language": "Sprache",
  "settings.language.de": "Deutsch",
  "settings.language.en": "Englisch",
  "settings.reminders": "Erinnerungen",
  "settings.dailyReminder": "Tägliche Lernreminder",
  "settings.todayReminder": "Heute-lernen Hinweis",
  "settings.notifications": "Push Notifications aktivieren",
  "settings.enablePush": "Push-Benachrichtigungen aktivieren",
  "settings.disablePush": "Push-Benachrichtigungen deaktivieren",
  "settings.dataSync": "Daten & Sync",
  "settings.defaultDailyMinutes": "Standard-Lernzeit",
  "settings.cloudSync": "Supabase Cloud Sync",
  "settings.syncNow": "Jetzt synchronisieren",
  "settings.lastSync": "Letzter Sync",
  "settings.pendingWrites": "Vorgemerkte Offline-Änderungen",
  "settings.offline": "Offline: Änderungen werden lokal vorgemerkt und später synchronisiert.",

  // PWA install prompt
  "install.title": "App installieren",
  "install.body": "Installiere den Klausurplaner für schnelleren Zugriff und Offline-Nutzung — direkt vom Homescreen.",
  "install.action": "Installieren",
  "install.dismiss": "Später",

  // Sync status
  "sync.off": "Sync aus",
  "sync.offline": "Offline",
  "sync.syncing": "Sync läuft",
  "sync.queued": "wartet",
  "sync.error": "Sync Fehler",
  "sync.ready": "Sync bereit"
} as const;

export type TranslationKey = keyof typeof de;
