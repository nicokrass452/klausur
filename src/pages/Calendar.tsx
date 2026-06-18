import { useMemo } from "react";
import { CalendarGrid } from "../components/CalendarGrid";
import { useAppStore } from "../store/useAppStore";

export function CalendarPage() {
  const allExams = useAppStore((state) => state.exams);
  const calendarMode = useAppStore((state) => state.settings.calendarMode);
  const setCalendarMode = useAppStore((state) => state.setCalendarMode);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const exams = useMemo(() => allExams.filter((entry) => !entry.deletedAt), [allExams]);

  return (
    <section className="space-y-5">
      <article className="surface-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Terminuebersicht</p>
          <h3 className="mt-1 font-display text-2xl text-slate-950 dark:text-white">
            {isAuthenticated ? "Deine Klausurtermine" : "Klausurtermine im Ueberblick"}
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            {isAuthenticated
              ? "Woche oder Monat – Fachfarben zeigen dir sofort, was ansteht."
              : "Vorschaumodus: Termine ansehen. Fuer Bearbeitung und Lernplan bitte anmelden."}
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200/80 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
          {(["week", "month"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setCalendarMode(mode)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                calendarMode === mode
                  ? "bg-slate-950 text-white dark:bg-teal-500 dark:text-slate-950"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {mode === "week" ? "Woche" : "Monat"}
            </button>
          ))}
        </div>
      </article>
      <CalendarGrid mode={calendarMode} exams={exams} />
    </section>
  );
}