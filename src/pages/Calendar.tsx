import { useMemo } from "react";
import { CalendarGrid } from "../components/CalendarGrid";
import { SegmentedControl } from "../components/SegmentedControl";
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Terminübersicht</p>
          <h3 className="mt-1 font-display text-2xl text-slate-950 dark:text-white">
            {isAuthenticated ? "Deine Klausurtermine" : "Klausurtermine im Überblick"}
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            {isAuthenticated
              ? "Woche oder Monat – Fachfarben zeigen dir sofort, was ansteht."
              : "Vorschaumodus: Termine ansehen. Für Bearbeitung und Lernplan bitte anmelden."}
          </p>
        </div>
        <SegmentedControl
          value={calendarMode}
          onChange={setCalendarMode}
          options={[
            { value: "week", label: "Woche" },
            { value: "month", label: "Monat" }
          ]}
        />
      </article>
      <CalendarGrid mode={calendarMode} exams={exams} />
    </section>
  );
}