import type { CoachMessage, Flashcard, QuizQuestion, StudyTask, Topic, UserStats } from "../types";
import { getSupabaseRequestHeaders, supabase, supabaseAnonKey } from "../lib/supabase";

type AiAction = "generateQuiz" | "generateFlashcards" | "optimizeStudyPlan" | "coachMessage" | "coachChat";
type AiSource = "glm" | "deepseek" | "mock";
export type CoachChatMode = "coach" | "quiz" | "flashcards" | "plan" | "explain";
export interface CoachChatMessage {
  role: "user" | "assistant";
  content: string;
}


export interface AiResult<T> {
  data: T;
  source: AiSource;
  error?: string;
}

export interface CoachChatResponse {
  message: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function mockOptimizeStudyPlan(tasks: StudyTask[]): Promise<StudyTask[]> {
  await sleep(400);
  return [...tasks].sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    return b.duration - a.duration;
  });
}

async function mockGenerateQuiz(topics: Topic[]): Promise<QuizQuestion[]> {
  await sleep(300);
  return topics.slice(0, 5).map((topic, index) => ({
    id: `quiz-${topic.id}`,
    prompt: `Welche Aussage beschreibt das Thema "${topic.name}" am besten?`,
    options: [
      `Definition von ${topic.name}`,
      `${topic.name} in einer Beispielaufgabe`,
      `Häufiger Fehler bei ${topic.name}`,
      `Zusammenhang von ${topic.name} mit dem Gesamtstoff`
    ],
    answer: index % 2 === 0 ? `Definition von ${topic.name}` : `${topic.name} in einer Beispielaufgabe`
  }));
}

async function mockGenerateFlashcards(topics: Topic[]): Promise<Flashcard[]> {
  await sleep(300);
  return topics.slice(0, 6).map((topic) => ({
    id: `flashcard-${topic.id}`,
    front: `Erkläre ${topic.name} in 2 Sätzen.`,
    back: `${topic.name} ist ein Schwerpunkt mit geschätztem Aufwand von ${topic.estimatedMinutes} Minuten.`
  }));
}

async function mockCoachMessage(stats: UserStats, tasks: StudyTask[]): Promise<CoachMessage> {
  await sleep(200);
  const openTasks = tasks.filter((task) => task.status === "open").length;
  if (openTasks > 5) {
    return {
      title: "Fokus zuerst",
      body: "Zieh heute die drei schwersten offenen Aufgaben vor und sichere den Rest als Wiederholung."
    };
  }
  if (stats.streak >= 3) {
    return {
      title: "Streak halten",
      body: "Deine Serie ist stabil. Eine weitere 25-Minuten-Session reicht, um sie heute zu sichern."
    };
  }
  return {
    title: "Einfach anfangen",
    body: "Starte mit einer kurzen Wiederholung. Momentum ist gerade wichtiger als Perfektion."
  };
}

function isQuizQuestions(value: unknown): value is QuizQuestion[] {
  return Array.isArray(value) && value.every((entry) => {
    const item = entry as Partial<QuizQuestion>;
    return typeof item.id === "string" && typeof item.prompt === "string" && Array.isArray(item.options) && typeof item.answer === "string";
  });
}

function isFlashcards(value: unknown): value is Flashcard[] {
  return Array.isArray(value) && value.every((entry) => {
    const item = entry as Partial<Flashcard>;
    return typeof item.id === "string" && typeof item.front === "string" && typeof item.back === "string";
  });
}

function isStudyTasks(value: unknown): value is StudyTask[] {
  return Array.isArray(value) && value.every((entry) => {
    const item = entry as Partial<StudyTask>;
    return typeof item.id === "string" && typeof item.task === "string" && typeof item.date === "string";
  });
}

function isCoachMessage(value: unknown): value is CoachMessage {
  const item = value as Partial<CoachMessage>;
  return typeof item?.title === "string" && typeof item.body === "string";
}

async function errorMessage(error: unknown): Promise<string> {
  const context = (error as { context?: unknown })?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      const flatError = (body as { error?: unknown }).error;
      if (typeof flatError === "string") {
        const detail = body as { aiHttpStatus?: number; aiErrorText?: string; model?: string; hasAiApiKey?: boolean };
        const parts = [flatError];
        if (flatError === "Unbekannte KI-Aktion.") {
          parts.push("Edge Function neu deployen: supabase functions deploy ai-coach");
        }
        if (detail.aiHttpStatus) parts.push(`AI HTTP ${detail.aiHttpStatus}`);
        if (detail.model) parts.push(`Modell ${detail.model}`);
        if (typeof detail.hasAiApiKey === "boolean") parts.push(`API-Key vorhanden: ${detail.hasAiApiKey}`);
        if (detail.aiErrorText) parts.push(detail.aiErrorText);
        return parts.join(" - ");
      }
      const edgeError = flatError as { code?: string; message?: string } | undefined;
      if (edgeError?.message) return `${edgeError.code ?? context.status}: ${edgeError.message}`;
    } catch {
      return `Edge Function HTTP ${context.status}`;
    }
  }
  return error instanceof Error ? error.message : "KI-Service nicht erreichbar. Mock-Fallback wurde verwendet.";
}

async function invokeAiCoach<T>(
  action: AiAction,
  payload: Record<string, unknown>,
  pick: (value: unknown) => T,
  fallback: () => Promise<T>
): Promise<AiResult<T>> {
  try {
    if (!supabase) throw new Error("Supabase ist nicht konfiguriert.");
    if (!supabaseAnonKey) throw new Error("Supabase Anon Key fehlt. KI nutzt den Mock-Fallback.");

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const accessToken = sessionData.session?.access_token;

    const { data, error } = await supabase.functions.invoke("ai-coach", {
      body: { action, payload },
      headers: getSupabaseRequestHeaders(accessToken)
    });

    if (error) throw error;
    const parsed = data as { data?: unknown; error?: unknown; fallback?: boolean; source?: AiSource } | null;
    if (parsed?.fallback && typeof parsed.error === "string") console.warn(parsed.error);

    return { data: pick(parsed?.data), source: parsed?.fallback ? "mock" : parsed?.source ?? "glm" };
  } catch (error) {
    return { data: await fallback(), source: "mock", error: await errorMessage(error) };
  }
}

export async function optimizeStudyPlanWithAiResult(tasks: StudyTask[]): Promise<AiResult<StudyTask[]>> {
  return invokeAiCoach(
    "optimizeStudyPlan",
    { tasks },
    (value) => {
      const tasksResult = (value as { tasks?: unknown })?.tasks;
      if (!isStudyTasks(tasksResult)) throw new Error("Ungültige KI-Antwort für Lernplan.");
      return tasksResult;
    },
    () => mockOptimizeStudyPlan(tasks)
  );
}

export async function generateQuizFromTopicsResult(topics: Topic[]): Promise<AiResult<QuizQuestion[]>> {
  return invokeAiCoach(
    "generateQuiz",
    { topics },
    (value) => {
      const questions = (value as { questions?: unknown })?.questions;
      if (!isQuizQuestions(questions)) throw new Error("Ungültige KI-Antwort für Quiz.");
      return questions;
    },
    () => mockGenerateQuiz(topics)
  );
}

export async function generateFlashcardsFromTopicsResult(topics: Topic[]): Promise<AiResult<Flashcard[]>> {
  return invokeAiCoach(
    "generateFlashcards",
    { topics },
    (value) => {
      const flashcards = (value as { flashcards?: unknown })?.flashcards;
      if (!isFlashcards(flashcards)) throw new Error("Ungültige KI-Antwort für Flashcards.");
      return flashcards;
    },
    () => mockGenerateFlashcards(topics)
  );
}

export async function getCoachMessageResult(stats: UserStats, tasks: StudyTask[]): Promise<AiResult<CoachMessage>> {
  return invokeAiCoach(
    "coachMessage",
    { stats, tasks },
    (value) => {
      if (!isCoachMessage(value)) throw new Error("Ungültige KI-Antwort für Coach.");
      return value;
    },
    () => mockCoachMessage(stats, tasks)
  );
}

export async function sendCoachChatResult(
  mode: CoachChatMode,
  messages: CoachChatMessage[],
  context: Record<string, unknown>
): Promise<AiResult<CoachChatResponse>> {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const isGreeting = /^(hi|hallo|hey|moin|servus|hello)\b[!.?]*$/i.test(lastUserMessage.trim());
  return invokeAiCoach(
    "coachChat",
    { mode, messages, context },
    (value) => {
      const message = (value as { message?: unknown })?.message;
      if (typeof message !== "string") throw new Error("Ungültige KI-Antwort für Coach-Chat.");
      return { message };
    },
    async () => ({
      message: isGreeting
        ? "Hi. Wobei soll ich dir helfen: Thema erklären, Quiz abfragen, Flashcards erstellen oder den heutigen Lernplan sortieren?"
        : lastUserMessage
        ? `Ich kann den KI-Provider gerade nicht erreichen. Für "${lastUserMessage}" starte mit drei Punkten: Kernbegriffe sammeln, eine Beispielaufgabe lösen, offene Fragen notieren.`
        : "Ich kann den KI-Provider gerade nicht erreichen. Starte mit einer kurzen Wiederholung und formuliere danach eine konkrete Frage."
    })
  );
}

export async function optimizeStudyPlanWithAi(tasks: StudyTask[]): Promise<StudyTask[]> {
  return (await optimizeStudyPlanWithAiResult(tasks)).data;
}

export async function generateQuizFromTopics(topics: Topic[]): Promise<QuizQuestion[]> {
  return (await generateQuizFromTopicsResult(topics)).data;
}

export async function generateFlashcardsFromTopics(topics: Topic[]): Promise<Flashcard[]> {
  return (await generateFlashcardsFromTopicsResult(topics)).data;
}

export async function getCoachMessage(stats: UserStats, tasks: StudyTask[]): Promise<CoachMessage> {
  return (await getCoachMessageResult(stats, tasks)).data;
}
