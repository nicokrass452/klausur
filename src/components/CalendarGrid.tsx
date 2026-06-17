import clsx from "clsx";
import type { CalendarMode, Exam } from "../types";
import { getMonthGrid, getWeekRange, humanWeekday, toIsoDate } from "../utils/dateUtils";

interface CalendarGridProps {
  mode: CalendarMode;
  exams: Exam[];
  baseDate?: Date;
}

export function CalendarGrid({ mode, exams, baseDate = new Date() }: CalendarGridProps) {
  const dates = mode === "week" ? getWeekRange(baseDate) : getMonthGrid(baseDate);
  const today = toIsoDate(new Date());
  const currentMonth = baseDate.getMonth();

  return (
    <div className={clsx("grid gap-3", mode === "week" ? "md:grid-cols-7" : "md:grid-cols-7")}>
      {dates.map((date) => {
        const iso = toIsoDate(date);
        const items = exams.filter((exam) => exam.date === iso);
        return (
          <article
            key={iso}
            className={clsx(
              "min-h-28 rounded-3xl border p-3",
              iso === today ? "border-teal-400 bg-teal-50/80 dark:border-teal-500 dark:bg-teal-500/10" : "border-white/50 bg-white/70 dark:border-slate-800 dark:bg-slate-900/70",
              mode === "month" && date.getMonth() !== currentMonth ? "opacity-50" : ""
            )}
          >
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{humanWeekday(date)}</p>
            <div className="mt-3 space-y-2">
              {items.map((exam) => (
                <div key={exam.id} className="rounded-2xl px-3 py-2 text-sm font-medium text-white" style={{ backgroundColor: exam.color }}>
                  {exam.subject}
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
