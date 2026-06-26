import { Download, Loader2, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { t } from "../lib/i18n";
import { useAppStore } from "../store/useAppStore";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_STORAGE_KEY = "klausurplaner:install-prompt-dismissed";
// Re-show the banner after this many days even if the user dismissed it earlier.
const DISMISS_RESHOW_DAYS = 30;

function readDismissedAt(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function isDismissActive(): boolean {
  const dismissedAt = readDismissedAt();
  if (!dismissedAt) return false;
  const elapsedDays = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return elapsedDays < DISMISS_RESHOW_DAYS;
}

function persistDismissal(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  // iOS Safari exposes navigator.standalone.
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return Boolean(standalone || iosStandalone);
}

/**
 * Guided PWA install prompt. Listens for `beforeinstallprompt`, shows a
 * dismissible banner that is visible on mobile too, persists dismissal and
 * hides itself once the app was installed (`appinstalled`).
 */
export function InstallPromptBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(() => isDismissActive());
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const language = useAppStore((state) => state.settings.language);

  useEffect(() => {
    if (isStandaloneDisplay()) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      // Respect an active dismissal so we don't nag the user on every visit.
      if (isDismissActive()) return;
      setInstallPrompt(promptEvent);
      setDismissed(false);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setDismissed(true);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(DISMISS_STORAGE_KEY);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const visible = isAuthenticated && !dismissed && installPrompt !== null && !installing;
  if (!visible && !installing) return null;
  if (!installPrompt) return null;

  async function triggerInstall(): Promise<void> {
    if (!installPrompt || installing) return;
    setInstalling(true);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "dismissed") {
        persistDismissal();
        setDismissed(true);
      }
    } catch {
      // If the prompt fails, keep the banner hidden this session but don't persist.
      setDismissed(true);
    } finally {
      setInstallPrompt(null);
      setInstalling(false);
    }
  }

  function dismissBanner(): void {
    persistDismissal();
    setDismissed(true);
    setInstallPrompt(null);
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80" role="region" aria-label={t("install.title", language)}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-300">
          <Smartphone size={18} />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{t("install.title", language)}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t("install.body", language)}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => void triggerInstall()}
          disabled={installing}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-teal-500 dark:text-slate-950"
        >
          {installing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {t("install.action", language)}
        </button>
        <button
          type="button"
          onClick={dismissBanner}
          className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label={t("install.dismiss", language)}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
