import { Download, Share, X } from "lucide-react";
import { useState } from "react";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { t } from "../lib/i18n";
import { useAppStore } from "../store/useAppStore";

/**
 * Install CTA for the PWA. Renders nothing when install is not applicable
 * (already installed, dismissed, or unsupported browser).
 *
 * - Chromium browsers: uses the deferred `beforeinstallprompt` event.
 * - iOS Safari: shows manual "Add to Home Screen" instructions (no native prompt).
 */
export function InstallPromptCard() {
  const { canInstall, isIOS, deferredPrompt, promptInstall, dismiss } = useInstallPrompt();
  const language = useAppStore((state) => state.settings.language);
  const [installing, setInstalling] = useState(false);

  if (!canInstall) return null;

  const hasNativePrompt = Boolean(deferredPrompt) && !isIOS;

  async function handleInstall() {
    if (installing) return;
    setInstalling(true);
    try {
      await promptInstall();
    } finally {
      setInstalling(false);
    }
  }

  return (
    <section
      className="relative rounded-[28px] border border-teal-200/70 bg-white/90 p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900/80"
      role="region"
      aria-label={t("install.title", language)}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("install.dismiss", language)}
        className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <X size={16} aria-hidden="true" />
      </button>

      <div className="flex items-start gap-4 pr-8">
        <div className="mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
          <Download size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl text-slate-950 dark:text-white">
            {isIOS ? t("install.iosTitle", language) : t("install.title", language)}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {isIOS ? t("install.iosDescription", language) : t("install.description", language)}
          </p>
        </div>
      </div>

      {isIOS ? (
        <ol className="mt-4 space-y-2 pl-2 text-sm text-slate-700 dark:text-slate-200">
          <li className="flex items-center gap-2">
            <Share size={15} className="text-teal-600 dark:text-teal-300" aria-hidden="true" />
            {t("install.iosStep1", language)}
          </li>
          <li className="pl-[1.15rem]">{t("install.iosStep2", language)}</li>
          <li className="pl-[1.15rem]">{t("install.iosStep3", language)}</li>
        </ol>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        {hasNativePrompt ? (
          <button
            type="button"
            onClick={() => void handleInstall()}
            disabled={installing}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 dark:bg-teal-500 dark:text-slate-950"
          >
            <Download size={16} aria-hidden="true" />
            {installing ? t("install.installing", language) : t("install.button", language)}
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
        >
          {t("install.dismiss", language)}
        </button>
      </div>
    </section>
  );
}
