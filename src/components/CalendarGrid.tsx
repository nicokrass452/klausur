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
    <div className={clsx("grid gap-3", "md:grid-cols-7")}>
      {dates.map((date) => {
        const iso = toIsoDate(date);
        const items = exams.filter((exam) => exam.date === iso);
        const isToday = iso === today;
        const isOutsideMonth = mode === "month" && date.getMonth() !== currentMonth;

        return (
          <article
            key={iso}
            className={clsx(
              "surface-card min-h-32 p-3 transition",
              isToday && "ring-2 ring-teal-400/70 dark:ring-teal-500/60",
              isOutsideMonth && "opacity-45"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{humanWeekday(date)}</p>
              <span
                className={clsx(
                  "inline-flex size-7 items-center justify-center rounded-lg text-xs font-bold",
                  isToday
                    ? "bg-teal-500 text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                )}
              >
                {date.getDate()}
              </span>
            </div>
            <div className="mt-3 space-y-1.5">
              {items.length ? (
                items.map((exam) => (
                  <div
                    key={exam.id}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm"
                    style={{ backgroundColor: exam.color }}
                  >
                    {exam.subject}
                  </div>
                ))
              ) : (
                <p className="pt-2 text-xs text-slate-400">Keine Termine</p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}