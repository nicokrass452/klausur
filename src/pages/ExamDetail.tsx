import { Link, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { Brain, CalendarArrowDown, Layers3, Loader2, Upload, WandSparkles } from "lucide-react";
import { ROUTES } from "../lib/constants";
import { t } from "../lib/i18n";
import { generateFlashcardsFromTopicsResult, generateQuizFromTopicsResult, getCoachMessageResult, hasSupabaseEnv, type AiResult } from "../services/aiService";
import { uploadMaterialWithOfflineFallback } from "../services/materialStorageService";
import { useAppStore } from "../store/useAppStore";
import type { CoachMessage, Flashcard, QuizQuestion } from "../types";
import { formatDateTime } from "../utils/dateUtils";
import { downloadIcalFile, examsToIcal } from "../utils/icalExport";
import { getExamProgress } from "../utils/examUtils";
import { ProgressBar } from "../components/ProgressBar";
import { TopicChecklist } from "../components/TopicChecklist";

type AiPanel = "quiz" | "flashcards" | "coach";

function aiSourceLabel(source: AiResult<unknown>["source"]): string {
  if (source === "glm") return "GLM API";
  if (source === "deepseek") return "DeepSeek API";
  return "Mock-Fallback";
}

export function ExamDetailPage() {
  const { id = "" } = useParams();
  const exam = useAppStore((state) => state.exams.find((entry) => entry.id === id && !entry.deletedAt));
  const allTopics = useAppStore((state) => state.topics);
  const allMaterials = useAppStore((state) => state.materials);
  const allStudyTasks = useAppStore((state) => state.studyTasks);
  const stats = useAppStore((state) => state.stats);
  const addTopic = useAppStore((state) => state.addTopic);
  const toggleTopic = useAppStore((state) => state.toggleTopic);
  const addMaterial = useAppStore((state) => state.addMaterial);
  const updateMaterial = useAppStore((state) => state.updateMaterial);
  const removeExam = useAppStore((state) => state.removeExam);
  const regenerateStudyPlan = useAppStore((state) => state.regenerateStudyPlan);
  const updateExam = useAppStore((state) => state.updateExam);
  const user = useAppStore((state) => state.user);
  const isOnline = useAppStore((state) => state.isOnline);
  const cloudSyncEnabled = useAppStore((state) => state.settings.cloudSyncEnabled);
  const isOfflineReadOnly = useAppStore((state) => state.authMode === "offline-readonly");
  const language = useAppStore((state) => state.settings.language);
  const [topicName, setTopicName] = useState("");
  const [topicDifficulty, setTopicDifficulty] = useState(3);
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [noteDraft, setNoteDraft] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [subject, setSubject] = useState(exam?.subject ?? "");
  const [date, setDate] = useState(exam?.date ?? "");
  const [time, setTime] = useState(exam?.time ?? "08:00");
  const [room, setRoom] = useState(exam?.room ?? "");
  const [notes, setNotes] = useState(exam?.notes ?? "");
  const [difficulty, setDifficulty] = useState(exam?.difficulty ?? 3);
  const [knowledgeLevel, setKnowledgeLevel] = useState(exam?.knowledgeLevel ?? 3);
  const [aiLoading, setAiLoading] = useState<AiPanel | null>(null);
  const [aiError, setAiError] = useState<string | undefined>();
  const [aiRateLimited, setAiRateLimited] = useState(false);
  const [aiSource, setAiSource] = useState<AiResult<unknown>["source"] | undefined>();
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [coachMessage, setCoachMessage] = useState<CoachMessage | null>(null);
  const topics = useMemo(() => allTopics.filter((entry) => entry.examId === id && !entry.deletedAt), [allTopics, id]);
  const materials = useMemo(
    () => allMaterials.filter((entry) => entry.examId === id && !entry.deletedAt),
    [allMaterials, id]
  );
  const examTasks = useMemo(
    () => allStudyTasks.filter((entry) => entry.examId === id && !entry.deletedAt),
    [allStudyTasks, id]
  );

  if (!exam) {
    return <p className="text-sm text-slate-500">{t("exam.notFound", language)}</p>;
  }

  const progress = getExamProgress(exam.id, topics);

  async function runAiAction(panel: AiPanel): Promise<void> {
    setAiLoading(panel);
    setAiError(undefined);
    try {
      if (panel === "quiz") {
        const result = await generateQuizFromTopicsResult(topics);
        setQuizQuestions(result.data);
        setAiSource(result.source);
        setAiError(result.error);
        setAiRateLimited(result.rateLimited ?? false);
      } else if (panel === "flashcards") {
        const result = await generateFlashcardsFromTopicsResult(topics);
        setFlashcards(result.data);
        setAiSource(result.source);
        setAiError(result.error);
        setAiRateLimited(result.rateLimited ?? false);
      } else {
        const result = await getCoachMessageResult(stats, examTasks);
        setCoachMessage(result.data);
        setAiSource(result.source);
        setAiError(result.error);
        setAiRateLimited(result.rateLimited ?? false);
      }
    } finally {
      setAiLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/50 bg-white/80 p-6 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("exam.detail", language)}</p>
            <h3 className="mt-2 font-display text-3xl text-slate-950 dark:text-white">{exam.subject}</h3>
            <p className="mt-2 text-sm text-slate-500">{formatDateTime(exam.date, exam.time)} · {t("common.room", language)} {exam.room || "-"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => downloadIcalFile(examsToIcal([exam]), "klausurplaner-klausur.ics")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              <CalendarArrowDown size={16} aria-hidden="true" />
              {t("exam.exportIcal", language)}
            </button>
            <button disabled={isOfflineReadOnly} onClick={() => regenerateStudyPlan(exam.id)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">
              {t("exam.regeneratePlan", language)}
            </button>
            <Link
              to={ROUTES.exams}
              onClick={(event) => {
                if (isOfflineReadOnly) {
                  event.preventDefault();
                  return;
                }
                removeExam(exam.id);
              }}
              aria-disabled={isOfflineReadOnly}
              className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white aria-disabled:opacity-50"
            >
              {t("action.delete", language)}
            </Link>
          </div>
        </div>
        <div className="mt-5">
          <ProgressBar value={progress} label={t("exam.topicProgress", language)} showValue />
        </div>
      </section>

      <section className="rounded-[32px] border border-white/50 bg-white/80 p-6 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("exam.aiHelp", language)}</p>
            <h4 className="mt-2 font-display text-2xl text-slate-950 dark:text-white">{t("exam.aiHelpDesc", language)}</h4>
            <p className="mt-2 text-sm text-slate-500">
              Die Anfrage läuft über Supabase Edge Functions. Wenn GLM nicht erreichbar ist, wird DeepSeek als Fallback genutzt.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void runAiAction("quiz")}
              disabled={aiLoading !== null || topics.length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-teal-500 dark:text-slate-950"
            >
              {aiLoading === "quiz" ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <Brain size={16} aria-hidden="true" />}
              Quiz
            </button>
            <button
              onClick={() => void runAiAction("flashcards")}
              disabled={aiLoading !== null || topics.length === 0}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
            >
              {aiLoading === "flashcards" ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <Layers3 size={16} aria-hidden="true" />}
              Flashcards
            </button>
            <button
              onClick={() => void runAiAction("coach")}
              disabled={aiLoading !== null}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
            >
              {aiLoading === "coach" ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <WandSparkles size={16} aria-hidden="true" />}
              Coach
            </button>
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-500">
          {aiSource ? `${t("coach.source", language)}: ${aiSourceLabel(aiSource)}` : hasSupabaseEnv ? t("common.aiViaSupabase", language) : t("common.mockFallback", language)}
          {aiError ? ` — ${aiError}` : ""}
        </p>
        {aiRateLimited ? (
          <p className="mt-2 text-sm font-semibold text-rose-600 dark:text-rose-300" role="status" aria-live="polite">
            {t("common.rateLimitedWait", language)}
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <article className="rounded-3xl border border-slate-200/80 p-4 dark:border-slate-800">
            <h5 className="font-semibold text-slate-950 dark:text-white">Quiz</h5>
            <div className="mt-3 space-y-3">
              {quizQuestions.length ? quizQuestions.map((question) => (
                <div key={question.id} className="rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-950">
                  <p className="font-medium text-slate-900 dark:text-white">{question.prompt}</p>
                  <p className="mt-2 text-slate-500">Antwort: {question.answer}</p>
                </div>
              )) : <p className="text-sm text-slate-500">{t("exam.noQuiz", language)}</p>}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200/80 p-4 dark:border-slate-800">
            <h5 className="font-semibold text-slate-950 dark:text-white">Flashcards</h5>
            <div className="mt-3 space-y-3">
              {flashcards.length ? flashcards.map((card) => (
                <div key={card.id} className="rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-950">
                  <p className="font-medium text-slate-900 dark:text-white">{card.front}</p>
                  <p className="mt-2 text-slate-500">{card.back}</p>
                </div>
              )) : <p className="text-sm text-slate-500">{t("exam.noFlashcards", language)}</p>}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200/80 p-4 dark:border-slate-800">
            <h5 className="font-semibold text-slate-950 dark:text-white">Coach</h5>
            {coachMessage ? (
              <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-950">
                <p className="font-medium text-slate-900 dark:text-white">{coachMessage.title}</p>
                <p className="mt-2 text-slate-500">{coachMessage.body}</p>
              </div>
            ) : <p className="mt-3 text-sm text-slate-500">{t("exam.noCoachMsg", language)}</p>}
          </article>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[32px] border border-white/50 bg-white/80 p-6 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
          <h4 className="font-display text-2xl text-slate-950 dark:text-white">{t("exam.edit", language)}</h4>
          <form
            className="mt-5 grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (isOfflineReadOnly) return;
              updateExam(exam.id, { subject, date, time, room, notes, difficulty, knowledgeLevel });
              regenerateStudyPlan(exam.id);
            }}
          >
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" aria-label={t("exam.subject", language)} value={subject} onChange={(event) => setSubject(event.target.value)} />
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" type="date" aria-label={t("exam.date", language)} value={date} onChange={(event) => setDate(event.target.value)} />
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" type="time" aria-label={t("exam.time", language)} value={time} onChange={(event) => setTime(event.target.value)} />
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" aria-label={t("common.room", language)} value={room} onChange={(event) => setRoom(event.target.value)} />
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" type="number" min="1" max="5" aria-label={t("exam.difficulty", language)} value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value))} />
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" type="number" min="1" max="5" aria-label={t("exam.knowledgeLevel", language)} value={knowledgeLevel} onChange={(event) => setKnowledgeLevel(Number(event.target.value))} />
            <textarea className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950 md:col-span-2" aria-label={t("exam.notes", language)} value={notes} onChange={(event) => setNotes(event.target.value)} />
            <button disabled={isOfflineReadOnly} className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-teal-500 dark:text-slate-950 md:col-span-2" type="submit">
              {t("exam.update", language)}
            </button>
          </form>

          <h4 className="mt-8 font-display text-2xl text-slate-950 dark:text-white">{t("exam.topics", language)}</h4>
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (isOfflineReadOnly) return;
              addTopic({ examId: exam.id, name: topicName, difficulty: topicDifficulty, estimatedMinutes });
              setTopicName("");
              setTopicDifficulty(3);
              setEstimatedMinutes(30);
            }}
          >
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder={t("exam.newTopic", language)} aria-label={t("exam.newTopic", language)} value={topicName} onChange={(event) => setTopicName(event.target.value)} required />
            <div className="grid grid-cols-2 gap-4">
              <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" type="number" min="1" max="5" aria-label={t("exam.difficulty", language)} value={topicDifficulty} onChange={(event) => setTopicDifficulty(Number(event.target.value))} />
              <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" type="number" min="10" step="5" aria-label={t("common.minutes", language)} value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(Number(event.target.value))} />
            </div>
            <button disabled={isOfflineReadOnly} className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-teal-500 dark:text-slate-950" type="submit">
              {t("exam.addTopic", language)}
            </button>
          </form>
          <div className="mt-6">
            <TopicChecklist topics={topics} onToggle={toggleTopic} disabled={isOfflineReadOnly} />
          </div>
        </section>

        <section className="rounded-[32px] border border-white/50 bg-white/80 p-6 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
          <h4 className="font-display text-2xl text-slate-950 dark:text-white">{t("exam.material", language)}</h4>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <form
              className="space-y-3 rounded-3xl border border-dashed border-slate-300 p-4 dark:border-slate-700"
              onSubmit={(event) => {
                event.preventDefault();
                if (isOfflineReadOnly) return;
                if (!noteDraft.trim()) return;
                addMaterial({ examId: exam.id, type: "note", title: "Notiz", content: noteDraft });
                setNoteDraft("");
              }}
            >
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t("exam.saveNote", language)}</p>
              <textarea className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" aria-label={t("exam.saveNote", language)} value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} />
              <button disabled={isOfflineReadOnly} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-teal-500 dark:text-slate-950" type="submit">{t("exam.notePlaceholder", language)}</button>
            </form>

            <form
              className="space-y-3 rounded-3xl border border-dashed border-slate-300 p-4 dark:border-slate-700"
              onSubmit={(event) => {
                event.preventDefault();
                if (isOfflineReadOnly) return;
                if (!videoTitle.trim() || !videoUrl.trim()) return;
                addMaterial({ examId: exam.id, type: "video", title: videoTitle, url: videoUrl });
                setVideoTitle("");
                setVideoUrl("");
              }}
            >
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t("exam.videoLinkPlaceholder", language)}</p>
              <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Titel" aria-label="Titel" value={videoTitle} onChange={(event) => setVideoTitle(event.target.value)} />
              <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="https://youtube.com/..." aria-label="Video-URL" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} />
              <button disabled={isOfflineReadOnly} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-teal-500 dark:text-slate-950" type="submit">{t("exam.saveLink", language)}</button>
            </form>

            <label htmlFor="exam-pdf-upload" className="space-y-3 rounded-3xl border border-dashed border-slate-300 p-4 dark:border-slate-700 md:col-span-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t("exam.pdfUpload", language)}</span>
              <input
                id="exam-pdf-upload"
                type="file"
                accept="application/pdf"
                disabled={isOfflineReadOnly}
                className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:font-semibold file:text-white dark:file:bg-teal-500 dark:file:text-slate-950"
                onChange={async (event) => {
                  if (isOfflineReadOnly) return;
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const materialId = addMaterial({ examId: exam.id, type: "pdf", title: file.name, fileName: file.name });
                  try {
                    const result = await uploadMaterialWithOfflineFallback(
                      file,
                      exam.id,
                      materialId,
                      user?.id ?? "anonymous",
                      isOnline && cloudSyncEnabled
                    );
                    updateMaterial(materialId, { url: result.publicUrl ?? result.path, fileName: result.fileName });
                  } catch {
                    // IndexedDB fallback already handled inside uploadMaterialWithOfflineFallback.
                  }
                  event.target.value = "";
                }}
              />
              <div className="space-y-1 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Upload size={16} aria-hidden="true" />
                  {isOnline && cloudSyncEnabled ? "PDF wird nach Supabase Storage hochgeladen (max. 10 MB)." : "Offline: PDF wird lokal in IndexedDB zwischengespeichert."}
                </div>
                <p className="text-xs">Nur PDF-Dateien bis 10 MB werden unterstützt.</p>
              </div>
            </label>
          </div>

          <div className="mt-6 space-y-3">
            {materials.map((material) => (
              <div key={material.id} className="rounded-2xl border border-slate-200/80 px-4 py-3 dark:border-slate-800">
                <p className="font-medium text-slate-900 dark:text-white">{material.title}</p>
                {material.type === "note" ? (
                  <p className="text-sm text-slate-500">{material.content}</p>
                ) : material.type === "video" ? (
                  <a href={material.url} target="_blank" rel="noreferrer" className="text-sm text-teal-600 hover:underline dark:text-teal-400">
                    {material.url}
                  </a>
                ) : material.url ? (
                  <a href={material.url} target="_blank" rel="noreferrer" className="text-sm text-teal-600 hover:underline dark:text-teal-400">
                    {material.fileName ?? t("exam.openPdf", language)}
                  </a>
                ) : (
                  <p className="text-sm text-slate-500">{material.fileName}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
