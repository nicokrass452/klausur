import { Brain, CheckCircle2, ClipboardList, Eye, GraduationCap, Layers3, Loader2, Send, Sparkles } from "lucide-react";
import { FormEvent, useMemo, useRef, useState, useId } from "react";
import { t } from "../lib/i18n";
import { hasSupabaseEnv, sendCoachChatResult, type CoachChatMessage, type CoachChatMode } from "../services/aiService";
import { useAppStore } from "../store/useAppStore";

const modes: Array<{ id: CoachChatMode; label: string; icon: typeof Sparkles }> = [
  { id: "coach", label: "Coach", icon: Sparkles },
  { id: "quiz", label: "Quiz", icon: Brain },
  { id: "flashcards", label: "Flashcards", icon: Layers3 },
  { id: "plan", label: "Plan", icon: ClipboardList },
  { id: "explain", label: "Erklären", icon: GraduationCap }
];

function sourceLabel(source: "glm" | "deepseek" | "mock"): string {
  if (source === "glm") return "GLM";
  if (source === "deepseek") return "DeepSeek";
  return "Mock";
}

interface ParsedStudyCard {
  question: string;
  answer: string;
}

function parseStudyCards(content: string): ParsedStudyCard[] {
  const pattern = /Frage:\s*([\s\S]*?)(?:\n|\s)Antwort:\s*([\s\S]*?)(?=(?:\n\s*Frage:)|$)/gi;
  const cards: ParsedStudyCard[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    const question = match[1]?.trim();
    const answer = match[2]?.trim();
    if (question && answer) cards.push({ question, answer });
  }
  return cards;
}

function StudyCard({ card, language }: { card: ParsedStudyCard; language: "de" | "en" }) {
  const [answerDraft, setAnswerDraft] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const answerId = useId();

  return (
    <article className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start gap-3">
        <div className="mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
          <Brain size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t("coach.question", language)}</p>
          <p className="mt-2 text-base font-semibold leading-7 text-slate-950 dark:text-white">{card.question}</p>
        </div>
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("coach.yourAnswer", language)}</span>
        <textarea
          value={answerDraft}
          onChange={(event) => setAnswerDraft(event.target.value)}
          className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition focus:border-teal-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:focus:bg-slate-950"
          placeholder={t("coach.answerPlaceholder", language)}
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowAnswer((value) => !value)}
          aria-expanded={showAnswer}
          aria-controls={answerId}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-teal-500 dark:text-slate-950"
        >
          <Eye size={16} aria-hidden="true" />
          {showAnswer ? t("coach.hideAnswer", language) : t("coach.showAnswer", language)}
        </button>
        {answerDraft.trim() ? (
          <span className="inline-flex items-center gap-2 text-sm text-slate-500">
            <CheckCircle2 size={16} aria-hidden="true" />
            {t("coach.answerNoted", language)}
          </span>
        ) : null}
      </div>

      {showAnswer ? (
        <div
          id={answerId}
          role="region"
          className="mt-4 rounded-2xl bg-teal-50 px-4 py-3 text-sm leading-6 text-slate-800 dark:bg-teal-500/10 dark:text-slate-100"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">{t("coach.modelAnswer", language)}</p>
          <p className="mt-2">{card.answer}</p>
        </div>
      ) : null}
    </article>
  );
}

function AssistantMessage({ content, language }: { content: string; language: "de" | "en" }) {
  const cards = parseStudyCards(content);
  if (cards.length) {
    return (
      <div className="space-y-3">
        {cards.map((card, index) => (
          <StudyCard key={`${card.question}-${index}`} card={card} language={language} />
        ))}
      </div>
    );
  }
  return <>{content}</>;
}

export function CoachPage() {
  const exams = useAppStore((state) => state.exams);
  const topics = useAppStore((state) => state.topics);
  const studyTasks = useAppStore((state) => state.studyTasks);
  const materials = useAppStore((state) => state.materials);
  const stats = useAppStore((state) => state.stats);
  const language = useAppStore((state) => state.settings.language);
  const [mode, setMode] = useState<CoachChatMode>("coach");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<CoachChatMessage[]>([
    {
      role: "assistant",
      content: t("coach.greeting", language)
    }
  ]);
  const [source, setSource] = useState<"glm" | "deepseek" | "mock" | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [rateLimited, setRateLimited] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeExams = useMemo(() => exams.filter((exam) => !exam.deletedAt), [exams]);
  const activeTopics = useMemo(() => topics.filter((topic) => !topic.deletedAt), [topics]);
  const activeTasks = useMemo(() => studyTasks.filter((task) => !task.deletedAt), [studyTasks]);
  const activeMaterials = useMemo(() => materials.filter((material) => !material.deletedAt), [materials]);
  const openTasks = useMemo(() => activeTasks.filter((task) => task.status === "open"), [activeTasks]);

  const context = useMemo(
    () => ({
      stats: {
        studyTime: stats.studyTime,
        streak: stats.streak,
        xp: stats.xp,
        level: stats.level
      },
      exams: activeExams.slice(0, 8).map((exam) => ({
        id: exam.id,
        subject: exam.subject,
        date: exam.date,
        difficulty: exam.difficulty,
        knowledgeLevel: exam.knowledgeLevel,
        dailyMinutes: exam.dailyMinutes,
        notes: exam.notes
      })),
      topics: activeTopics.slice(0, 40).map((topic) => ({
        examId: topic.examId,
        name: topic.name,
        completed: topic.completed,
        difficulty: topic.difficulty,
        estimatedMinutes: topic.estimatedMinutes
      })),
      tasks: activeTasks.slice(0, 60).map((task) => ({
        examId: task.examId,
        topicId: task.topicId,
        date: task.date,
        task: task.task,
        duration: task.duration,
        type: task.type,
        status: task.status
      })),
      materials: activeMaterials.slice(0, 20).map((material) => {
        if (material.type === "note") {
          return {
            examId: material.examId,
            type: material.type,
            title: material.title,
            content: (material.content ?? "").slice(0, 800)
          };
        }
        if (material.type === "video") {
          return {
            examId: material.examId,
            type: material.type,
            title: material.title,
            url: material.url
          };
        }
        return {
          examId: material.examId,
          type: material.type,
          title: material.title,
          fileName: material.fileName
        };
      })
    }),
    [activeExams, activeTasks, activeTopics, activeMaterials, stats]
  );

  async function submitMessage(event?: FormEvent<HTMLFormElement>): Promise<void> {
    event?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(undefined);

    try {
      const result = await sendCoachChatResult(mode, nextMessages, context);
      setSource(result.source);
      setError(result.error);
      setRateLimited(result.rateLimited ?? false);
      setMessages([...nextMessages, { role: "assistant", content: result.data.message }]);
    } finally {
      setLoading(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-8rem)] gap-6 xl:grid-cols-[18rem_1fr]">
      <aside className="space-y-5 rounded-[32px] border border-white/50 bg-white/80 p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("coach.title", language)}</p>
          <h3 className="mt-2 font-display text-2xl text-slate-950 dark:text-white">{t("coach.chatTitle", language)}</h3>
        </div>

        <div className="grid gap-2" role="group" aria-label={t("coach.title", language)}>
          {modes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              aria-pressed={mode === id}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                mode === id
                  ? "bg-slate-950 text-white dark:bg-teal-500 dark:text-slate-950"
                  : "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-950"
              }`}
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-3xl border border-slate-200/80 p-4 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">{t("coach.context", language)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-500">
            <span>{activeExams.length} {t("common.exams", language)}</span>
            <span>{activeTopics.length} {t("common.topics", language)}</span>
            <span>{openTasks.length} {t("common.open", language)}</span>
            <span>{stats.streak} {t("common.streak", language)}</span>
            <span>{activeMaterials.length} {t("coach.materials", language)}</span>
          </div>
          {activeMaterials.length > 0 ? (
            <p className="mt-2 text-xs text-slate-400">
              {t("coach.materialHint", language)}
            </p>
          ) : null}
        </div>
      </aside>

      <section className="flex min-h-[34rem] flex-col overflow-hidden rounded-[32px] border border-white/50 bg-white/80 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-white">{modes.find((entry) => entry.id === mode)?.label}</p>
            <p className="text-sm text-slate-500">
              {source ? `${t("coach.source", language)}: ${sourceLabel(source)}` : hasSupabaseEnv ? t("common.aiViaSupabase", language) : t("common.mockFallback", language)}
            </p>
          </div>
          <button
            onClick={() => {
              setMessages([{ role: "assistant", content: t("coach.greeting", language) }]);
              setError(undefined);
              setSource(undefined);
            }}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            {t("coach.restart", language)}
          </button>
        </div>

        <div
          className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
          role="log"
          aria-live="polite"
          aria-label={t("coach.chatTitle", language)}
        >
          {messages.map((message, index) => {
            const hasStudyCards = message.role === "assistant" && parseStudyCards(message.content).length > 0;
            return (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={
                    hasStudyCards
                      ? "w-full max-w-[min(42rem,100%)]"
                      : `max-w-[min(42rem,85%)] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm leading-6 ${
                          message.role === "user"
                            ? "bg-slate-950 text-white dark:bg-teal-500 dark:text-slate-950"
                            : "bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        }`
                  }
                >
                  {message.role === "assistant" ? <AssistantMessage content={message.content} language={language} /> : message.content}
                </div>
              </div>
            );
          })}
          {loading ? (
            <div className="flex justify-start" role="status" aria-live="polite">
              <div className="inline-flex items-center gap-2 rounded-3xl bg-slate-100 px-4 py-3 text-sm text-slate-500 dark:bg-slate-950">
                <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                {t("coach.thinking", language)}
              </div>
            </div>
          ) : null}
          {rateLimited ? (
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-300" role="status" aria-live="polite">
              {t("common.rateLimitedWait", language)}
            </p>
          ) : null}
          {error ? <p className="text-sm text-amber-600 dark:text-amber-300">{error}</p> : null}
        </div>

        <form onSubmit={(event) => void submitMessage(event)} className="border-t border-slate-200/70 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t("coach.inputPlaceholder", language)}
              aria-label={t("coach.inputPlaceholder", language)}
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="inline-flex size-10 items-center justify-center rounded-full bg-slate-950 text-white disabled:opacity-50 dark:bg-teal-500 dark:text-slate-950"
              aria-label={t("coach.send", language)}
            >
              {loading ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
