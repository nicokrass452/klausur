import { CloudAlert, CloudCheck, CloudCog, CloudOff } from "lucide-react";
import { t } from "../lib/i18n";
import { useAppStore } from "../store/useAppStore";

export function SyncStatusBadge() {
  const syncStatus = useAppStore((state) => state.syncStatus);
  const syncError = useAppStore((state) => state.syncError);
  const isOnline = useAppStore((state) => state.isOnline);
  const cloudSyncEnabled = useAppStore((state) => state.settings.cloudSyncEnabled);
  const pendingWriteCount = useAppStore((state) => state.pendingWriteCount);
  const syncNow = useAppStore((state) => state.syncNow);
  const language = useAppStore((state) => state.settings.language);

  if (!cloudSyncEnabled) {
    return (
      <div
        className="hidden items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 sm:inline-flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        role="status"
        aria-live="polite"
      >
        <CloudOff size={15} aria-hidden="true" />
        {t("sync.off", language)}
      </div>
    );
  }

  if (!isOnline && pendingWriteCount > 0) {
    return (
      <div
        className="hidden items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 sm:inline-flex dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
        role="status"
        aria-live="polite"
      >
        <CloudOff size={15} aria-hidden="true" />
        {pendingWriteCount} {t("sync.queued", language)}
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div
        className="hidden items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 sm:inline-flex dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
        role="status"
        aria-live="polite"
      >
        <CloudOff size={15} aria-hidden="true" />
        {t("sync.offline", language)}
      </div>
    );
  }

  if (syncStatus === "syncing") {
    return (
      <div
        className="hidden items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-700 sm:inline-flex dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-300"
        role="status"
        aria-live="polite"
      >
        <CloudCog size={15} aria-hidden="true" />
        {t("sync.syncing", language)}
      </div>
    );
  }

  if (syncStatus === "queued" || pendingWriteCount > 0) {
    return (
      <div
        className="hidden items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 sm:inline-flex dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
        role="status"
        aria-live="polite"
      >
        <CloudCog size={15} aria-hidden="true" />
        {pendingWriteCount || t("sync.queued", language)} {t("sync.queued", language)}
      </div>
    );
  }

  if (syncStatus === "error") {
    return (
      <button
        type="button"
        onClick={() => void syncNow()}
        className="hidden items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 sm:inline-flex dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50"
        aria-label={`${t("sync.error", language)}: ${syncError ?? t("action.skip", language)}`}
        title={syncError ?? t("sync.retry", language)}
      >
        <CloudAlert size={15} aria-hidden="true" />
        {t("sync.error", language)}
      </button>
    );
  }

  return (
    <div
      className="hidden items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 sm:inline-flex dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
      role="status"
      aria-live="polite"
    >
      <CloudCheck size={15} aria-hidden="true" />
      {t("sync.ready", language)}
    </div>
  );
}
