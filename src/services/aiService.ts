import type { CoachMessage, Flashcard, QuizQuestion, StudyTask, Topic, UserStats } from "../types";
import { supabase } from "../lib/supabase";

type AiAction = "generateQuiz" | "generateFlashcards" | "optimizeStudyPlan" | "coachMessage";
type AiSource = "gemini" | "mock";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface AiResult<T> {
  data: T;
  source: AiSource;
  error?: string;
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
      `Hauefiger Fehler bei ${topic.name}`,
      `Zusammenhang von ${topic.name} mit dem Gesamtstoff`
    ],
    answer: index % 2 === 0 ? `Definition von ${topic.name}` : `${topic.name} in einer Beispielaufgabe`
  }));
}

async function mockGenerateFlashcards(topics: Topic[]): Promise<Flashcard[]> {
  await sleep(300);
  return topics.slice(0, 6).map((topic) => ({
    id: `flashcard-${topic.id}`,
    front: `Erklaere ${topic.name} in 2 Saetzen.`,
    back: `${topic.name} ist ein Schwerpunkt mit geschaetztem Aufwand von ${topic.estimatedMinutes} Minuten.`
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
        const detail = body as { geminiHttpStatus?: number; geminiErrorText?: string; model?: string; hasGeminiApiKey?: boolean };
        const parts = [flatError];
        if (detail.geminiHttpStatus) parts.push(`Gemini HTTP ${detail.geminiHttpStatus}`);
        if (detail.model) parts.push(`Modell ${detail.model}`);
        if (typeof detail.hasGeminiApiKey === "boolean") parts.push(`API-Key vorhanden: ${detail.hasGeminiApiKey}`);
        if (detail.geminiErrorText) parts.push(detail.geminiErrorText);
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
    if (!supabaseUrl) throw new Error("Supabase URL fehlt. KI nutzt den Mock-Fallback.");
    if (!supabaseAnonKey) throw new Error("Supabase Anon Key fehlt. KI nutzt den Mock-Fallback.");

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error("Kein Login vorhanden. KI nutzt den Mock-Fallback.");

    if (import.meta.env.DEV) {
      console.debug("AI auth header present", Boolean(accessToken), accessToken?.slice(0, 12));
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/ai-coach`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "apikey": supabaseAnonKey
      },
      body: JSON.stringify({ action, payload })
    });

    const text = await response.text();
    let parsed: unknown = null;
    if (text.trim()) {
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(`Edge Function HTTP ${response.status}: ${text.slice(0, 300)}`);
      }
    }

    if (!response.ok) {
      throw new Error(`Edge Function HTTP ${response.status}: ${text.slice(0, 300)}`);
    }

    return { data: pick((parsed as { data?: unknown } | null)?.data), source: "gemini" };
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
      if (!isStudyTasks(tasksResult)) throw new Error("Ungueltige KI-Antwort fuer Lernplan.");
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
      if (!isQuizQuestions(questions)) throw new Error("Ungueltige KI-Antwort fuer Quiz.");
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
      if (!isFlashcards(flashcards)) throw new Error("Ungueltige KI-Antwort fuer Flashcards.");
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
      if (!isCoachMessage(value)) throw new Error("Ungueltige KI-Antwort fuer Coach.");
      return value;
    },
    () => mockCoachMessage(stats, tasks)
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
