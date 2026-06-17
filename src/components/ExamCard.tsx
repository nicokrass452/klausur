import { Link } from "react-router-dom";
import type { Exam, Topic } from "../types";
import { formatDateTime } from "../utils/dateUtils";
import { getExamProgress } from "../utils/examUtils";
import { ProgressBar } from "./ProgressBar";

interface ExamCardProps {
  exam: Exam;
  topics: Topic[];
}

export function ExamCard({ exam, topics }: ExamCardProps) {
  const progress = getExamProgress(exam.id, topics);

  return (
    <Link
      to={`/exams/${exam.id}`}
      className="block rounded-[28px] border border-white/50 bg-white/80 p-5 shadow-panel transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900/80"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Klausur</p>
          <h3 className="mt-2 font-display text-2xl text-slate-950 dark:text-white">{exam.subject}</h3>
          <p className="mt-2 text-sm text-slate-500">{formatDateTime(exam.date, exam.time)}</p>
        </div>
        <span className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: exam.color }}>
          {progress}%
        </span>
      </div>
      <div className="mt-5">
        <ProgressBar value={progress} />
      </div>
      <p className="mt-4 text-sm text-slate-500">{topics.filter((topic) => topic.examId === exam.id).length} Themen erfasst</p>
    </Link>
  );
}
