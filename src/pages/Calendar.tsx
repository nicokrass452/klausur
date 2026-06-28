import { useMemo } from "react";
import { CalendarGrid } from "../components/CalendarGrid";
import { SegmentedControl } from "../components/SegmentedControl";
import { t } from "../lib/i18n";
import { useAppStore } from "../store/useAppStore";

export function CalendarPage() {
  const allExams = useAppStore((state) => state.exams);
  const calendarMode = useAppStore((state) => state.settings.calendarMode);
  const setCalendarMode = useAppStore((state) => state.setCalendarMode);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const language = useAppStore((state) => state.settings.language);
  const exams = useMemo(() => allExams.filter((entry) => !entry.deletedAt), [allExams]);

  return (
    <section className="space-y-5">
      <article className="surface-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("calendar.title", language)}</p>
          <h3 className="mt-1 font-display text-2xl text-slate-950 dark:text-white">
            {isAuthenticated ? t("calendar.subtitleAuth", language) : t("calendar.subtitleGuest", language)}
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            {isAuthenticated
              ? t("calendar.description", language)
              : t("calendar.previewMode", language)}
          </p>
        </div>
        <SegmentedControl
          value={calendarMode}
          onChange={setCalendarMode}
          options={[
            { value: "week", label: t("calendar.week", language) },
            { value: "month", label: t("calendar.month", language) }
          ]}
        />
      </article>
      <CalendarGrid mode={calendarMode} exams={exams} />
    </section>
  );
}