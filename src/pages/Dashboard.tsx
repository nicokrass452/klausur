import { ArrowRight, CalendarClock, Flame, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ProgressBar } from "../components/ProgressBar";
import { StatCard } from "../components/StatCard";
import { TaskCard } from "../components/TaskCard";
import { ROUTES } from "../lib/constants";
import { t } from "../lib/i18n";
import { getCoachMessage } from "../services/aiService";
import { useAppStore } from "../store/useAppStore";
import type { CoachMessage } from "../types";
import { daysUntil, formatDateTime, formatMinutes, toIsoDate } from "../utils/dateUtils";
import { getExamProgress } from "../utils/examUtils";

export function DashboardPage() {
  const allExams = useAppStore((state) => state.exams);
  const allTopics = useAppStore((state) => state.topics);
  const allStudyTasks = useAppStore((state) => state.studyTasks);
  const stats = useAppStore((state) => state.stats);
  const setTaskStatus = useAppStore((state) => state.setTaskStatus);
  const language = useAppStore((state) => state.settings.language);
  const today = toIsoDate(new Date());
  const [coachMessage, setCoachMessage] = useState<CoachMessage | null>(null);

  const exams = useMemo(() => allExams.filter((entry) => !entry.deletedAt), [allExams]);
  const topics = useMemo(() => allTopics.filter((entry) => !entry.deletedAt), [allTopics]);
  const studyTasks = useMemo(() => allStudyTasks.filter((entry) => !entry.deletedAt), [allStudyTasks]);
  const nextExam = useMemo(() => [...exams].sort((a, b) => a.date.localeCompare(b.date))[0], [exams]);
  const todayTasks = useMemo(
    () => studyTasks.filter((task) => task.date === today && task.status === "open").slice(0, 4),
    [studyTasks, today]
  );

  useEffect(() => {
    void getCoachMessage(stats, studyTasks).then(setCoachMessage);
  }, [stats, studyTasks]);

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <article className="rounded-[28px] border border-teal-200/60 bg-gradient-to-br from-teal-500/95 via-cyan-400/90 to-orange-300/85 p-6 text-slate-950 shadow-panel md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-900/70">{t("dashboard.nextExam", language)}</p>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="font-display text-4xl">{nextExam ? nextExam.subject : t("dashboard.noExam", language)}</h3>
              <p className="mt-3 max-w-xl text-sm text-slate-900/75">
                {nextExam ? `${formatDateTime(nextExam.date, nextExam.time)} · ${t("common.room", language)} ${nextExam.room || "-"}` : t("dashboard.noExamHint", language)}
              </p>
            </div>
            <div className="rounded-[28px] bg-white/40 px-5 py-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-800/70">{t("dashboard.countdown", language)}</p>
              <p className="mt-2 font-display text-5xl">{nextExam ? `${daysUntil(nextExam.date)}d` : "--"}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={ROUTES.exams} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
              {t("dashboard.manageExams", language)}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link to={ROUTES.focus} className="inline-flex items-center gap-2 rounded-full border border-slate-900/20 px-4 py-3 text-sm font-semibold text-slate-900">
              {t("dashboard.startFocus", language)}
              <Timer size={16} aria-hidden="true" />
            </Link>
          </div>
        </article>

        <article className="surface-card p-6" role="status" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("dashboard.coach", language)}</p>
          <h3 className="mt-3 font-display text-2xl text-slate-950 dark:text-white">{coachMessage?.title ?? t("dashboard.coachLoading", language)}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{coachMessage?.body ?? t("dashboard.coachFallback", language)}</p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("dashboard.streak", language)} value={`${stats.streak} ${t("common.days", language)}`} icon={<Flame className="text-orange-500" size={18} aria-hidden="true" />} />
        <StatCard label={t("dashboard.focusTime", language)} value={formatMinutes(stats.studyTime)} icon={<Timer className="text-teal-500" size={18} aria-hidden="true" />} />
        <StatCard label={t("dashboard.nextExam", language)} value={nextExam ? `${daysUntil(nextExam.date)} ${t("common.days", language)}` : "-"} icon={<CalendarClock className="text-cyan-500" size={18} aria-hidden="true" />} />
        <StatCard label={t("dashboard.todayOpen", language)} value={`${todayTasks.length}`} detail={t("dashboard.todayTasks", language)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="surface-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-2xl text-slate-950 dark:text-white">{t("dashboard.todayLearn", language)}</h3>
            <Link to={ROUTES.studyPlan} className="text-sm font-semibold text-teal-700 dark:text-teal-300">{t("dashboard.allTasks", language)}</Link>
          </div>
          <div className="mt-5 space-y-4">
            {todayTasks.length ? todayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                exam={exams.find((exam) => exam.id === task.examId)}
                onComplete={() => setTaskStatus(task.id, task.status === "done" ? "open" : "done")}
              />
            )) : <p className="text-sm text-slate-500">{t("dashboard.emptyPlan", language)}</p>}
          </div>
        </article>

        <article className="surface-card p-6">
          <h3 className="font-display text-2xl text-slate-950 dark:text-white">{t("dashboard.examProgress", language)}</h3>
          <div className="mt-5 space-y-5">
            {exams.map((exam) => {
              const progress = getExamProgress(exam.id, topics);
              return (
                <div key={exam.id}>
                  <ProgressBar value={progress} label={exam.subject} showValue />
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </div>
  );
}
