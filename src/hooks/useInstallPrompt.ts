import { useSyncExternalStore } from "react";

export type InstallPlatform = "chromium" | "ios" | "other";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallPromptState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  installed: boolean;
  dismissed: boolean;
}

const DISMISSED_KEY = "klausurplaner:install-dismissed";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = detectStandalone();
let dismissed = readDismissed();
let snapshot: InstallPromptState = { deferredPrompt, installed, dismissed };

const listeners = new Set<() => void>();

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(window.matchMedia?.("(display-mode: standalone)").matches) || standalone;
}

export function detectInstallPlatform(): InstallPlatform {
  if (typeof window === "undefined") return "other";
  const ua = window.navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  if (isIOS) return "ios";
  if ("BeforeInstallPromptEvent" in window) return "chromium";
  return "other";
}

function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function rebuildSnapshot(): void {
  snapshot = { deferredPrompt, installed, dismissed };
}

function emit(): void {
  rebuildSnapshot();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): InstallPromptState {
  return snapshot;
}

let initialized = false;
function ensureInitialized(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  window.addEventListener("beforeinstallprompt", (event: Event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  });

  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
    emit();
  });
}

export function useInstallPrompt() {
  ensureInitialized();
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const platform = detectInstallPlatform();
  const canInstall =
    !state.installed && !state.dismissed && (Boolean(state.deferredPrompt) || platform === "ios");

  return {
    ...state,
    platform,
    canInstall,
    isIOS: platform === "ios",
    async promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
      if (!deferredPrompt) return "unavailable";
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        installed = true;
      }
      deferredPrompt = null;
      emit();
      return choice.outcome;
    },
    dismiss(): void {
      dismissed = true;
      try {
        localStorage.setItem(DISMISSED_KEY, "1");
      } catch {
        // ignore storage errors (private mode)
      }
      emit();
    }
  };
}

/** Test-only helper to reset module state between tests (does NOT clear localStorage, so persistence can be tested). */
export function __resetInstallPromptStateForTests(): void {
  deferredPrompt = null;
  installed = false;
  dismissed = readDismissed();
  initialized = false;
  rebuildSnapshot();
  listeners.clear();
}

/** Test-only helper to inject a deferred prompt event. */
export function __setDeferredPromptForTests(event: BeforeInstallPromptEvent | null): void {
  deferredPrompt = event;
  emit();
}
