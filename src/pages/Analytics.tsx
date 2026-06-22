import { useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
import { formatMinutes } from "../utils/dateUtils";
import { getLearningMinutesForExam, getWeakestExam } from "../utils/examUtils";
import { xpToNextLevel } from "../utils/gamification";
import { ProgressBar } from "../components/ProgressBar";

export function AnalyticsPage() {
  const allExams = useAppStore((state) => state.exams);
  const allTopics = useAppStore((state) => state.topics);
  const allStudyTasks = useAppStore((state) => state.studyTasks);
  const stats = useAppStore((state) => state.stats);
  const exams = useMemo(() => allExams.filter((entry) => !entry.deletedAt), [allExams]);
  const topics = useMemo(() => allTopics.filter((entry) => !entry.deletedAt), [allTopics]);
  const studyTasks = useMemo(() => allStudyTasks.filter((entry) => !entry.deletedAt), [allStudyTasks]);
  const weakestExam = getWeakestExam(exams, topics);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[28px] border border-white/50 bg-white/80 p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-sm text-slate-500">Lernzeit</p>
          <p className="mt-3 font-display text-3xl text-slate-950 dark:text-white">{formatMinutes(stats.studyTime)}</p>
        </article>
        <article className="rounded-[28px] border border-white/50 bg-white/80 p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-sm text-slate-500">XP bis Level-Up</p>
          <p className="mt-3 font-display text-3xl text-slate-950 dark:text-white">{xpToNextLevel(stats.xp)}</p>
        </article>
        <article className="rounded-[28px] border border-white/50 bg-white/80 p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-sm text-slate-500">Schwächstes Fach</p>
          <p className="mt-3 font-display text-3xl text-slate-950 dark:text-white">{weakestExam?.subject ?? "-"}</p>
        </article>
        <article className="rounded-[28px] border border-white/50 bg-white/80 p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-sm text-slate-500">Badges</p>
          <p className="mt-3 font-display text-3xl text-slate-950 dark:text-white">{stats.badges.length}</p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <article className="rounded-[32px] border border-white/50 bg-white/80 p-6 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
          <h3 className="font-display text-2xl text-slate-950 dark:text-white">Lernzeit pro Fach</h3>
          <div className="mt-5 space-y-5">
            {exams.map((exam) => {
              const minutes = getLearningMinutesForExam(exam.id, studyTasks);
              return (
                <div key={exam.id}>
                  <ProgressBar
                    value={Math.min(100, Math.round((minutes / Math.max(60, exam.dailyMinutes * 4)) * 100))}
                    label={`${exam.subject} · ${formatMinutes(minutes)}`}
                    showValue
                  />
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-[32px] border border-white/50 bg-white/80 p-6 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
          <h3 className="font-display text-2xl text-slate-950 dark:text-white">XP-Verlauf</h3>
          <div className="mt-6 space-y-4">
            {stats.xpHistory.map((entry) => (
              <div key={entry.date}>
                <ProgressBar value={Math.min(100, entry.xp)} label={`${entry.date} · ${entry.xp} XP`} tone="coral" showValue />
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
