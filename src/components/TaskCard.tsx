import { CheckCircle2, Circle, RotateCcw } from "lucide-react";
import type { Exam, StudyTask } from "../types";
import { formatDate } from "../utils/dateUtils";

interface TaskCardProps {
  task: StudyTask;
  exam?: Exam;
  onComplete: () => void;
  onMissed?: () => void;
  disabled?: boolean;
}

export function TaskCard({ task, exam, onComplete, onMissed, disabled }: TaskCardProps) {
  return (
    <article className="surface-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{exam?.subject ?? "Lernen"}</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{task.task}</h3>
          <p className="mt-2 text-sm text-slate-500">{formatDate(task.date, false)} · {task.duration} min · {task.type}</p>
        </div>
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: exam?.color ?? "#0f766e" }} />
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={onComplete}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
        >
          {task.status === "done" ? <CheckCircle2 size={16} /> : <Circle size={16} />}
          {task.status === "done" ? "Erledigt" : "Abschließen"}
        </button>
        {onMissed ? (
          <button
            onClick={onMissed}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
          >
            <RotateCcw size={16} />
            Verpasst
          </button>
        ) : null}
      </div>
    </article>
  );
}
