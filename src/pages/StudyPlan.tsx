import { WandSparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { TaskCard } from "../components/TaskCard";
import { generateFlashcardsFromTopicsResult, generateQuizFromTopicsResult, optimizeStudyPlanWithAiResult } from "../services/aiService";
import { useAppStore } from "../store/useAppStore";

export function StudyPlanPage() {
  const allExams = useAppStore((state) => state.exams);
  const allStudyTasks = useAppStore((state) => state.studyTasks);
  const allTopics = useAppStore((state) => state.topics);
  const setTaskStatus = useAppStore((state) => state.setTaskStatus);
  const redistributeMissed = useAppStore((state) => state.redistributeMissed);
  const [aiSummary, setAiSummary] = useState("Mock-Interfaces fuer KI-Optimierung, Quiz und Flashcards.");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | undefined>();

  const exams = useMemo(() => allExams.filter((entry) => !entry.deletedAt), [allExams]);
  const studyTasks = useMemo(() => allStudyTasks.filter((entry) => !entry.deletedAt), [allStudyTasks]);
  const topics = useMemo(() => allTopics.filter((entry) => !entry.deletedAt), [allTopics]);
  const sortedTasks = useMemo(() => [...studyTasks].sort((a, b) => a.date.localeCompare(b.date)), [studyTasks]);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/50 bg-white/80 p-6 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Lernplan Generator</p>
            <h3 className="mt-2 font-display text-2xl text-slate-950 dark:text-white">Automatische Verteilung mit Spaced Repetition</h3>
          </div>
          <button onClick={redistributeMissed} className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
            Verpasste neu verteilen
          </button>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={async () => {
              setAiLoading(true);
              setAiError(undefined);
              try {
                const result = await optimizeStudyPlanWithAiResult(sortedTasks);
                setAiError(result.error);
                setAiSummary(`${result.source === "gemini" ? "Gemini" : "Mock"} priorisiert ${result.data.slice(0, 3).map((task) => task.task).join(", ")}.`);
              } finally {
                setAiLoading(false);
              }
            }}
            disabled={aiLoading}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-teal-500 dark:text-slate-950"
          >
            <WandSparkles size={16} />
            {aiLoading ? "KI laedt..." : "KI-Plan optimieren"}
          </button>
          <button
            onClick={async () => {
              setAiLoading(true);
              setAiError(undefined);
              try {
                const result = await generateQuizFromTopicsResult(topics);
                setAiError(result.error);
                setAiSummary(`${result.source === "gemini" ? "Gemini" : "Mock"} hat ${result.data.length} Fragen aus deinen Themen erzeugt.`);
              } finally {
                setAiLoading(false);
              }
            }}
            disabled={aiLoading}
            className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            Quiz generieren
          </button>
          <button
            onClick={async () => {
              setAiLoading(true);
              setAiError(undefined);
              try {
                const result = await generateFlashcardsFromTopicsResult(topics);
                setAiError(result.error);
                setAiSummary(`${result.source === "gemini" ? "Gemini" : "Mock"} hat ${result.data.length} Karten vorbereitet.`);
              } finally {
                setAiLoading(false);
              }
            }}
            disabled={aiLoading}
            className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            Flashcards erzeugen
          </button>
        </div>
        <p className="mt-4 text-sm text-slate-500">{aiSummary}</p>
        {aiError ? <p className="mt-2 text-sm text-amber-600 dark:text-amber-300">Fallback aktiv: {aiError}</p> : null}
      </section>

      <section className="space-y-4">
        {sortedTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            exam={exams.find((exam) => exam.id === task.examId)}
            onComplete={() => setTaskStatus(task.id, task.status === "done" ? "open" : "done")}
            onMissed={() => setTaskStatus(task.id, "missed")}
          />
        ))}
      </section>
    </div>
  );
}
