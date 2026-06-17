import { CloudAlert, CloudCheck, CloudCog, CloudOff } from "lucide-react";
import { useAppStore } from "../store/useAppStore";

export function SyncStatusBadge() {
  const syncStatus = useAppStore((state) => state.syncStatus);
  const isOnline = useAppStore((state) => state.isOnline);
  const cloudSyncEnabled = useAppStore((state) => state.settings.cloudSyncEnabled);

  if (!cloudSyncEnabled) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
        <CloudOff size={15} />
        Sync aus
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
        <CloudOff size={15} />
        Offline
      </div>
    );
  }

  if (syncStatus === "syncing") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-300">
        <CloudCog size={15} />
        Sync laeuft
      </div>
    );
  }

  if (syncStatus === "error") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
        <CloudAlert size={15} />
        Sync Fehler
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
      <CloudCheck size={15} />
      Sync bereit
    </div>
  );
}
