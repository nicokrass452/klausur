import { de, type TranslationKey } from "../locales/de";
import { en } from "../locales/en";

export type Language = "de" | "en";

const dictionaries: Record<Language, Record<TranslationKey, string>> = {
  de,
  en
};

const STORAGE_KEY = "klausurplaner:language";

export function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "de";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "en" ? "en" : "de";
}

export function setStoredLanguage(language: Language): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, language);
}

export function t(key: TranslationKey, language: Language = getStoredLanguage()): string {
  return dictionaries[language][key] ?? key;
}
