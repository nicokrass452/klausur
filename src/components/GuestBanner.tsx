import { Cloud, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../lib/constants";

export function GuestBanner() {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-200/80 bg-teal-50/90 px-4 py-3 dark:border-teal-500/30 dark:bg-teal-500/10">
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-300">
          <Cloud size={18} />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Vorschaumodus</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Du kannst Termine im Kalender ansehen. Fuer Lernplan, KI-Coach und Sync ist ein Account noetig.
          </p>
        </div>
      </div>
      <Link
        to={ROUTES.login}
        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white dark:bg-teal-500 dark:text-slate-950"
      >
        <LogIn size={16} />
        Jetzt anmelden
      </Link>
    </div>
  );
}