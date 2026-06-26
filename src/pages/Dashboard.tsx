import { ArrowRight, CalendarClock, Flame, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { InstallPromptCard } from "../components/InstallPromptCard";
import { ProgressBar } from "../components/ProgressBar";
import { StatCard } from "../components/StatCard";
import { TaskCard } from "../components/TaskCard";
import { ROUTES } from "../lib/constants";
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
      <InstallPromptCard />
      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <article className="rounded-[28px] border border-teal-200/60 bg-gradient-to-br from-teal-500/95 via-cyan-400/90 to-orange-300/85 p-6 text-slate-950 shadow-panel md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-900/70">Nächste Klausur</p>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="font-display text-4xl">{nextExam ? nextExam.subject : "Noch keine Klausur"}</h3>
              <p className="mt-3 max-w-xl text-sm text-slate-900/75">
                {nextExam ? `${formatDateTime(nextExam.date, nextExam.time)} · Raum ${nextExam.room || "-"}` : "Lege deine erste Klausur an und starte direkt mit einem automatisch erzeugten Lernplan."}
              </p>
            </div>
            <div className="rounded-[28px] bg-white/40 px-5 py-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-800/70">Countdown</p>
              <p className="mt-2 font-display text-5xl">{nextExam ? `${daysUntil(nextExam.date)}d` : "--"}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={ROUTES.exams} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
              Klausuren verwalten
              <ArrowRight size={16} />
            </Link>
            <Link to={ROUTES.focus} className="inline-flex items-center gap-2 rounded-full border border-slate-900/20 px-4 py-3 text-sm font-semibold text-slate-900">
              Fokus starten
              <Timer size={16} />
            </Link>
          </div>
        </article>

        <article className="surface-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Lerncoach</p>
          <h3 className="mt-3 font-display text-2xl text-slate-950 dark:text-white">{coachMessage?.title ?? "Coach lädt..."}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{coachMessage?.body ?? "Analyse deiner offenen Aufgaben und Streak-Daten."}</p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Lernstreak" value={`${stats.streak} Tage`} icon={<Flame className="text-orange-500" size={18} />} />
        <StatCard label="Fokuszeit" value={formatMinutes(stats.studyTime)} icon={<Timer className="text-teal-500" size={18} />} />
        <StatCard label="Nächste Klausur" value={nextExam ? `${daysUntil(nextExam.date)} Tage` : "-"} icon={<CalendarClock className="text-cyan-500" size={18} />} />
        <StatCard label="Heute offen" value={`${todayTasks.length}`} detail="Aufgaben für heute" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="surface-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-2xl text-slate-950 dark:text-white">Heute lernen</h3>
            <Link to={ROUTES.studyPlan} className="text-sm font-semibold text-teal-700 dark:text-teal-300">Alle Aufgaben</Link>
          </div>
          <div className="mt-5 space-y-4">
            {todayTasks.length ? todayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                exam={exams.find((exam) => exam.id === task.examId)}
                onComplete={() => setTaskStatus(task.id, task.status === "done" ? "open" : "done")}
              />
            )) : <p className="text-sm text-slate-500">Heute ist dein Plan leer. Nutze den Fokusmodus für freie Wiederholung.</p>}
          </div>
        </article>

        <article className="surface-card p-6">
          <h3 className="font-display text-2xl text-slate-950 dark:text-white">Fortschritt pro Klausur</h3>
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
