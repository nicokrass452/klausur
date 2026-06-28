import { useMemo, useState } from "react";
import { CalendarArrowDown } from "lucide-react";
import { ExamCard } from "../components/ExamCard";
import { t } from "../lib/i18n";
import { useAppStore } from "../store/useAppStore";
import { downloadIcalFile, examsToIcal } from "../utils/icalExport";

export function ExamsPage() {
  const addExam = useAppStore((state) => state.addExam);
  const allExams = useAppStore((state) => state.exams);
  const allTopics = useAppStore((state) => state.topics);
  const defaultDailyMinutes = useAppStore((state) => state.settings.defaultDailyMinutes);
  const isOfflineReadOnly = useAppStore((state) => state.authMode === "offline-readonly");
  const language = useAppStore((state) => state.settings.language);
  const exams = useMemo(() => allExams.filter((entry) => !entry.deletedAt), [allExams]);
  const topics = useMemo(() => allTopics.filter((entry) => !entry.deletedAt), [allTopics]);
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");
  const [room, setRoom] = useState("");
  const [notes, setNotes] = useState("");
  const [difficulty, setDifficulty] = useState(3);
  const [knowledgeLevel, setKnowledgeLevel] = useState(3);
  const [dailyMinutes, setDailyMinutes] = useState(defaultDailyMinutes);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[32px] border border-white/50 bg-white/80 p-6 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
        <h3 className="font-display text-2xl text-slate-950 dark:text-white">{t("exam.create", language)}</h3>
        <form
          className="mt-6 grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            addExam({ subject, date, time, room, notes, difficulty, knowledgeLevel, dailyMinutes });
            setSubject("");
            setDate("");
            setTime("08:00");
            setRoom("");
            setNotes("");
            setDifficulty(3);
            setKnowledgeLevel(3);
            setDailyMinutes(defaultDailyMinutes);
          }}
        >
          <fieldset disabled={isOfflineReadOnly} className="contents disabled:opacity-60">
          <label className="space-y-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            {t("exam.subject", language)}
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" value={subject} onChange={(event) => setSubject(event.target.value)} required />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            {t("exam.date", language)}
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            {t("exam.time", language)}
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            {t("common.room", language)}
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" value={room} onChange={(event) => setRoom(event.target.value)} />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            {t("exam.difficulty", language)}
            <input className="w-full" type="range" min="1" max="5" value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value))} />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            {t("exam.knowledgeLevel", language)}
            <input className="w-full" type="range" min="1" max="5" value={knowledgeLevel} onChange={(event) => setKnowledgeLevel(Number(event.target.value))} />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-600 dark:text-slate-300 md:col-span-2">
            {t("exam.dailyTime", language)}
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" type="number" min="15" step="5" value={dailyMinutes} onChange={(event) => setDailyMinutes(Number(event.target.value))} />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-600 dark:text-slate-300 md:col-span-2">
            {t("exam.notes", language)}
            <textarea className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white dark:bg-teal-500 dark:text-slate-950 md:col-span-2" type="submit">
            {t("exam.save", language)}
          </button>
          </fieldset>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-2xl text-slate-950 dark:text-white">{t("exam.yourExams", language)}</h3>
          {exams.length > 0 ? (
            <button
              type="button"
              onClick={() => downloadIcalFile(examsToIcal(exams), "klausurplaner-klausuren.ics")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              <CalendarArrowDown size={16} aria-hidden="true" />
              {t("exam.exportIcal", language)}
            </button>
          ) : null}
        </div>
        {exams.map((exam) => (
          <ExamCard key={exam.id} exam={exam} topics={topics} />
        ))}
      </section>
    </div>
  );
}
