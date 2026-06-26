import type { TranslationKey } from "./de";

export const en: Record<TranslationKey, string> = {
  // Navigation
  "nav.dashboard": "Dashboard",
  "nav.calendar": "Calendar",
  "nav.exams": "Exams",
  "nav.studyPlan": "Study Plan",
  "nav.coach": "AI Trainer",
  "nav.focus": "Focus Mode",
  "nav.analytics": "Analytics",
  "nav.settings": "Settings",

  // Common actions
  "action.save": "Save",
  "action.cancel": "Cancel",
  "action.delete": "Delete",
  "action.edit": "Edit",
  "action.close": "Close",
  "action.back": "Back",
  "action.next": "Next",
  "action.skip": "Later",

  // Common labels
  "app.name": "Klausurplaner",
  "app.loading": "Klausurplaner is loading...",

  // Settings
  "settings.title": "Settings",
  "settings.theme": "Appearance",
  "settings.language": "Language",
  "settings.language.de": "German",
  "settings.language.en": "English",
  "settings.reminders": "Reminders",
  "settings.dailyReminder": "Daily learning reminder",
  "settings.todayReminder": "Today learning reminder",
  "settings.notifications": "Enable push notifications",
  "settings.enablePush": "Enable push notifications",
  "settings.disablePush": "Disable push notifications",
  "settings.dataSync": "Data & Sync",
  "settings.defaultDailyMinutes": "Default study time",
  "settings.cloudSync": "Supabase Cloud Sync",
  "settings.syncNow": "Sync now",
  "settings.lastSync": "Last sync",
  "settings.pendingWrites": "Pending offline changes",
  "settings.offline": "Offline: changes are queued locally and synced later.",

  // Sync status
  "sync.off": "Sync off",
  "sync.offline": "Offline",
  "sync.syncing": "Syncing",
  "sync.queued": "queued",
  "sync.error": "Sync error",
  "sync.ready": "Sync ready",

  // PWA install prompt
  "install.title": "Install app",
  "install.description": "Add Klausurplaner to your home screen for quick access and offline use.",
  "install.button": "Install",
  "install.dismiss": "Later",
  "install.installing": "Installing…",
  "install.iosTitle": "Add to Home Screen",
  "install.iosDescription": "iOS Safari does not support automatic install. Add the app manually:",
  "install.iosStep1": "Tap the Share icon at the bottom.",
  "install.iosStep2": "Select \"Add to Home Screen\".",
  "install.iosStep3": "Tap \"Add\".",
  "install.installed": "Klausurplaner is installed."
};
