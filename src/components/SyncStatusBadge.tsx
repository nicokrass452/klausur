import { CloudAlert, CloudCheck, CloudCog, CloudOff } from "lucide-react";
import { useAppStore } from "../store/useAppStore";

export function SyncStatusBadge() {
  const syncStatus = useAppStore((state) => state.syncStatus);
  const isOnline = useAppStore((state) => state.isOnline);
  const cloudSyncEnabled = useAppStore((state) => state.settings.cloudSyncEnabled);
  const pendingWriteCount = useAppStore((state) => state.pendingWriteCount);

  if (!cloudSyncEnabled) {
    return (
      <div className="hidden items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 sm:inline-flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        <CloudOff size={15} />
        Sync aus
      </div>
    );
  }

  if (!isOnline && pendingWriteCount > 0) {
    return (
      <div className="hidden items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 sm:inline-flex dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
        <CloudOff size={15} />
        {pendingWriteCount} wartet
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="hidden items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 sm:inline-flex dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
        <CloudOff size={15} />
        Offline
      </div>
    );
  }

  if (syncStatus === "syncing") {
    return (
      <div className="hidden items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-700 sm:inline-flex dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-300">
        <CloudCog size={15} />
        Sync laeuft
      </div>
    );
  }

  if (syncStatus === "queued" || pendingWriteCount > 0) {
    return (
      <div className="hidden items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 sm:inline-flex dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
        <CloudCog size={15} />
        {pendingWriteCount || "Sync"} wartet
      </div>
    );
  }

  if (syncStatus === "error") {
    return (
      <div className="hidden items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 sm:inline-flex dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
        <CloudAlert size={15} />
        Sync Fehler
      </div>
    );
  }

  return (
    <div className="hidden items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 sm:inline-flex dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
      <CloudCheck size={15} />
      Sync bereit
    </div>
  );
}
