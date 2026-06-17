import { Link, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { Brain, Layers3, Loader2, Upload, WandSparkles } from "lucide-react";
import { ROUTES } from "../lib/constants";
import { generateFlashcardsFromTopicsResult, generateQuizFromTopicsResult, getCoachMessageResult, type AiResult } from "../services/aiService";
import { saveMaterialBlob } from "../services/storageService";
import { useAppStore } from "../store/useAppStore";
import type { CoachMessage, Flashcard, QuizQuestion } from "../types";
import { formatDateTime } from "../utils/dateUtils";
import { getExamProgress } from "../utils/examUtils";
import { ProgressBar } from "../components/ProgressBar";
import { TopicChecklist } from "../components/TopicChecklist";

type AiPanel = "quiz" | "flashcards" | "coach";

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
  const removeExam = useAppStore((state) => state.removeExam);
  const regenerateStudyPlan = useAppStore((state) => state.regenerateStudyPlan);
  const updateExam = useAppStore((state) => state.updateExam);
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
    return <p className="text-sm text-slate-500">Klausur nicht gefunden.</p>;
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
      } else if (panel === "flashcards") {
        const result = await generateFlashcardsFromTopicsResult(topics);
        setFlashcards(result.data);
        setAiSource(result.source);
        setAiError(result.error);
      } else {
        const result = await getCoachMessageResult(stats, examTasks);
        setCoachMessage(result.data);
        setAiSource(result.source);
        setAiError(result.error);
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Klausurdetail</p>
            <h3 className="mt-2 font-display text-3xl text-slate-950 dark:text-white">{exam.subject}</h3>
            <p className="mt-2 text-sm text-slate-500">{formatDateTime(exam.date, exam.time)} · Raum {exam.room || "-"}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => regenerateStudyPlan(exam.id)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
              Lernplan neu erzeugen
            </button>
            <Link to={ROUTES.exams} onClick={() => removeExam(exam.id)} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white">
              Loeschen
            </Link>
          </div>
        </div>
        <div className="mt-5">
          <ProgressBar value={progress} />
          <p className="mt-2 text-sm text-slate-500">{progress}% Themenfortschritt</p>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/50 bg-white/80 p-6 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Gemini Lernhilfe</p>
            <h4 className="mt-2 font-display text-2xl text-slate-950 dark:text-white">Quiz, Flashcards und Coach</h4>
            <p className="mt-2 text-sm text-slate-500">
              Die Anfrage laeuft ueber Supabase Edge Functions. Wenn Gemini nicht erreichbar ist, wird automatisch der Mock-Fallback genutzt.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void runAiAction("quiz")}
              disabled={aiLoading !== null || topics.length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-teal-500 dark:text-slate-950"
            >
              {aiLoading === "quiz" ? <Loader2 className="animate-spin" size={16} /> : <Brain size={16} />}
              Quiz
            </button>
            <button
              onClick={() => void runAiAction("flashcards")}
              disabled={aiLoading !== null || topics.length === 0}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
            >
              {aiLoading === "flashcards" ? <Loader2 className="animate-spin" size={16} /> : <Layers3 size={16} />}
              Flashcards
            </button>
            <button
              onClick={() => void runAiAction("coach")}
              disabled={aiLoading !== null}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
            >
              {aiLoading === "coach" ? <Loader2 className="animate-spin" size={16} /> : <WandSparkles size={16} />}
              Coach
            </button>
          </div>
        </div>

        {aiSource ? (
          <p className="mt-4 text-sm text-slate-500">
            Quelle: {aiSource === "gemini" ? "Gemini API" : "Mock-Fallback"}
            {aiError ? ` - ${aiError}` : ""}
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
              )) : <p className="text-sm text-slate-500">Noch kein Quiz generiert.</p>}
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
              )) : <p className="text-sm text-slate-500">Noch keine Flashcards generiert.</p>}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200/80 p-4 dark:border-slate-800">
            <h5 className="font-semibold text-slate-950 dark:text-white">Coach</h5>
            {coachMessage ? (
              <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-950">
                <p className="font-medium text-slate-900 dark:text-white">{coachMessage.title}</p>
                <p className="mt-2 text-slate-500">{coachMessage.body}</p>
              </div>
            ) : <p className="mt-3 text-sm text-slate-500">Noch keine Coach-Nachricht generiert.</p>}
          </article>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[32px] border border-white/50 bg-white/80 p-6 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
          <h4 className="font-display text-2xl text-slate-950 dark:text-white">Klausur bearbeiten</h4>
          <form
            className="mt-5 grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              updateExam(exam.id, { subject, date, time, room, notes, difficulty, knowledgeLevel });
              regenerateStudyPlan(exam.id);
            }}
          >
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" value={subject} onChange={(event) => setSubject(event.target.value)} />
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" value={room} onChange={(event) => setRoom(event.target.value)} />
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" type="number" min="1" max="5" value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value))} />
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" type="number" min="1" max="5" value={knowledgeLevel} onChange={(event) => setKnowledgeLevel(Number(event.target.value))} />
            <textarea className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950 md:col-span-2" value={notes} onChange={(event) => setNotes(event.target.value)} />
            <button className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-teal-500 dark:text-slate-950 md:col-span-2" type="submit">
              Klausur aktualisieren
            </button>
          </form>

          <h4 className="mt-8 font-display text-2xl text-slate-950 dark:text-white">Themen</h4>
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              addTopic({ examId: exam.id, name: topicName, difficulty: topicDifficulty, estimatedMinutes });
              setTopicName("");
              setTopicDifficulty(3);
              setEstimatedMinutes(30);
            }}
          >
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Neues Thema" value={topicName} onChange={(event) => setTopicName(event.target.value)} required />
            <div className="grid grid-cols-2 gap-4">
              <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" type="number" min="1" max="5" value={topicDifficulty} onChange={(event) => setTopicDifficulty(Number(event.target.value))} />
              <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" type="number" min="10" step="5" value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(Number(event.target.value))} />
            </div>
            <button className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-teal-500 dark:text-slate-950" type="submit">
              Thema hinzufuegen
            </button>
          </form>
          <div className="mt-6">
            <TopicChecklist topics={topics} onToggle={toggleTopic} />
          </div>
        </section>

        <section className="rounded-[32px] border border-white/50 bg-white/80 p-6 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
          <h4 className="font-display text-2xl text-slate-950 dark:text-white">Lernmaterial</h4>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <form
              className="space-y-3 rounded-3xl border border-dashed border-slate-300 p-4 dark:border-slate-700"
              onSubmit={(event) => {
                event.preventDefault();
                if (!noteDraft.trim()) return;
                addMaterial({ examId: exam.id, type: "note", title: "Notiz", content: noteDraft });
                setNoteDraft("");
              }}
            >
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Notiz speichern</p>
              <textarea className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} />
              <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-teal-500 dark:text-slate-950" type="submit">Notiz ablegen</button>
            </form>

            <form
              className="space-y-3 rounded-3xl border border-dashed border-slate-300 p-4 dark:border-slate-700"
              onSubmit={(event) => {
                event.preventDefault();
                if (!videoTitle.trim() || !videoUrl.trim()) return;
                addMaterial({ examId: exam.id, type: "video", title: videoTitle, url: videoUrl });
                setVideoTitle("");
                setVideoUrl("");
              }}
            >
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Video-Link speichern</p>
              <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Titel" value={videoTitle} onChange={(event) => setVideoTitle(event.target.value)} />
              <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" placeholder="https://youtube.com/..." value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} />
              <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-teal-500 dark:text-slate-950" type="submit">Link speichern</button>
            </form>

            <label className="space-y-3 rounded-3xl border border-dashed border-slate-300 p-4 dark:border-slate-700 md:col-span-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">PDF Upload vorbereiten</span>
              <input
                type="file"
                accept="application/pdf"
                className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:font-semibold file:text-white dark:file:bg-teal-500 dark:file:text-slate-950"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const id = addMaterial({ examId: exam.id, type: "pdf", title: file.name, fileName: file.name });
                  await saveMaterialBlob(id, file);
                  event.target.value = "";
                }}
              />
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Upload size={16} />
                Dateien werden fuer spaeteren Viewer in IndexedDB gespeichert.
              </div>
            </label>
          </div>

          <div className="mt-6 space-y-3">
            {materials.map((material) => (
              <div key={material.id} className="rounded-2xl border border-slate-200/80 px-4 py-3 dark:border-slate-800">
                <p className="font-medium text-slate-900 dark:text-white">{material.title}</p>
                <p className="text-sm text-slate-500">{material.type === "note" ? material.content : material.url ?? material.fileName}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
