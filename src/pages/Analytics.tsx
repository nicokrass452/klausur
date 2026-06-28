import { useMemo } from "react";
import { Download } from "lucide-react";
import { t } from "../lib/i18n";
import { useAppStore } from "../store/useAppStore";
import { formatMinutes } from "../utils/dateUtils";
import { getLearningMinutesForExam, getWeakestExam } from "../utils/examUtils";
import { xpToNextLevel } from "../utils/gamification";
import { buildAnalyticsCsv, downloadCsvFile, xpTrendSummary } from "../utils/analyticsExport";
import { ProgressBar } from "../components/ProgressBar";

export function AnalyticsPage() {
  const allExams = useAppStore((state) => state.exams);
  const allTopics = useAppStore((state) => state.topics);
  const allStudyTasks = useAppStore((state) => state.studyTasks);
  const stats = useAppStore((state) => state.stats);
  const language = useAppStore((state) => state.settings.language);
  const exams = useMemo(() => allExams.filter((entry) => !entry.deletedAt), [allExams]);
  const topics = useMemo(() => allTopics.filter((entry) => !entry.deletedAt), [allTopics]);
  const studyTasks = useMemo(() => allStudyTasks.filter((entry) => !entry.deletedAt), [allStudyTasks]);
  const weakestExam = getWeakestExam(exams, topics);

  const trend7 = useMemo(() => xpTrendSummary(stats, 7), [stats]);
  const trend14 = useMemo(() => xpTrendSummary(stats, 14), [stats]);
  const trend30 = useMemo(() => xpTrendSummary(stats, 30), [stats]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[28px] border border-white/50 bg-white/80 p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-sm text-slate-500">{t("analytics.studyTime", language)}</p>
          <p className="mt-3 font-display text-3xl text-slate-950 dark:text-white">{formatMinutes(stats.studyTime)}</p>
        </article>
        <article className="rounded-[28px] border border-white/50 bg-white/80 p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-sm text-slate-500">{t("analytics.xpToLevelUp", language)}</p>
          <p className="mt-3 font-display text-3xl text-slate-950 dark:text-white">{xpToNextLevel(stats.xp)}</p>
        </article>
        <article className="rounded-[28px] border border-white/50 bg-white/80 p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-sm text-slate-500">{t("analytics.weakestSubject", language)}</p>
          <p className="mt-3 font-display text-3xl text-slate-950 dark:text-white">{weakestExam?.subject ?? "-"}</p>
        </article>
        <article className="rounded-[28px] border border-white/50 bg-white/80 p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-sm text-slate-500">{t("analytics.badges", language)}</p>
          <p className="mt-3 font-display text-3xl text-slate-950 dark:text-white">{stats.badges.length}</p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <article className="rounded-[32px] border border-white/50 bg-white/80 p-6 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-2xl text-slate-950 dark:text-white">{t("analytics.studyTimePerSubject", language)}</h3>
            <button
              type="button"
              onClick={() => downloadCsvFile(buildAnalyticsCsv(stats, exams, studyTasks), "klausurplaner-analytics.csv")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              <Download size={16} aria-hidden="true" />
              {t("analytics.exportCsv", language)}
            </button>
          </div>
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
          <h3 className="font-display text-2xl text-slate-950 dark:text-white">{t("analytics.xpHistory", language)}</h3>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
            <span className="rounded-2xl border border-slate-200/80 px-3 py-1.5 dark:border-slate-800">{t("analytics.days7", language)} <strong>{trend7.totalXp} XP</strong></span>
            <span className="rounded-2xl border border-slate-200/80 px-3 py-1.5 dark:border-slate-800">{t("analytics.days14", language)} <strong>{trend14.totalXp} XP</strong></span>
            <span className="rounded-2xl border border-slate-200/80 px-3 py-1.5 dark:border-slate-800">{t("analytics.days30", language)} <strong>{trend30.totalXp} XP</strong></span>
          </div>
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
