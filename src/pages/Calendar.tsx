import { useMemo } from "react";
import { CalendarGrid } from "../components/CalendarGrid";
import { useAppStore } from "../store/useAppStore";

export function CalendarPage() {
  const allExams = useAppStore((state) => state.exams);
  const calendarMode = useAppStore((state) => state.settings.calendarMode);
  const setCalendarMode = useAppStore((state) => state.setCalendarMode);
  const exams = useMemo(() => allExams.filter((entry) => !entry.deletedAt), [allExams]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Woche oder Monat, mit Fachfarben direkt sichtbar.</p>
        </div>
        <div className="inline-flex rounded-full border border-white/50 bg-white/70 p-1 dark:border-slate-800 dark:bg-slate-900/70">
          {(["week", "month"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setCalendarMode(mode)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${calendarMode === mode ? "bg-slate-950 text-white dark:bg-teal-500 dark:text-slate-950" : "text-slate-500"}`}
            >
              {mode === "week" ? "Woche" : "Monat"}
            </button>
          ))}
        </div>
      </div>
      <CalendarGrid mode={calendarMode} exams={exams} />
    </section>
  );
}
