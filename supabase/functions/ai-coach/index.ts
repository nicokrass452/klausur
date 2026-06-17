type AiAction = "generateQuiz" | "generateFlashcards" | "optimizeStudyPlan" | "coachMessage";

interface AuthUser {
  id: string;
}

interface TopicInput {
  id?: string;
  name: string;
  difficulty?: number;
  estimatedMinutes?: number;
  completed?: boolean;
}

interface StudyTaskInput {
  id: string;
  examId?: string;
  topicId?: string;
  date: string;
  task: string;
  duration: number;
  type: "learn" | "review" | "buffer";
  status: "open" | "done" | "missed";
}

interface UserStatsInput {
  studyTime: number;
  streak: number;
  xp: number;
  level: number;
}

interface AiRequest {
  action: AiAction;
  payload: Record<string, unknown>;
}

class PublicError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const MAX_BODY_BYTES = 24_000;

interface DebugInfo {
  action?: string;
  userId?: string;
  model?: string;
  hasGeminiApiKey?: boolean;
  geminiHttpStatus?: number;
  geminiErrorText?: string;
}

const rateLimitStore: Map<string, number[]> =
  (globalThis as typeof globalThis & { __aiRateLimitStore?: Map<string, number[]> }).__aiRateLimitStore ?? new Map();
(globalThis as typeof globalThis & { __aiRateLimitStore?: Map<string, number[]> }).__aiRateLimitStore = rateLimitStore;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function errorResponse(message: string, status: number, debug?: DebugInfo): Response {
  logDebug("ai-coach-error", debug);
  return jsonResponse(
    {
      error: message,
      source: "edge-function",
      geminiHttpStatus: debug?.geminiHttpStatus,
      geminiErrorText: debug?.geminiErrorText?.slice(0, 300),
      model: debug?.model,
      hasGeminiApiKey: debug?.hasGeminiApiKey
    },
    status
  );
}

function logDebug(event: string, debug?: DebugInfo): void {
  if (!debug) return;
  console.info(
    JSON.stringify({
      event,
      action: debug.action,
      userId: debug.userId,
      model: debug.model,
      hasGeminiApiKey: debug.hasGeminiApiKey,
      geminiHttpStatus: debug.geminiHttpStatus,
      geminiErrorText: debug.geminiErrorText?.slice(0, 300)
    })
  );
}

function assertString(value: unknown, field: string, maxLength = 300): string {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new Error(`Invalid ${field}`);
  }
  return value.trim();
}

function assertNumber(value: unknown, field: string, min = 0, max = 10_000): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Invalid ${field}`);
  }
  return value;
}

function assertTopic(value: unknown): TopicInput {
  if (!value || typeof value !== "object") throw new Error("Invalid topic");
  const entry = value as Record<string, unknown>;
  return {
    id: typeof entry.id === "string" ? entry.id.slice(0, 80) : undefined,
    name: assertString(entry.name, "topic.name", 140),
    difficulty: typeof entry.difficulty === "number" ? assertNumber(entry.difficulty, "topic.difficulty", 1, 5) : undefined,
    estimatedMinutes:
      typeof entry.estimatedMinutes === "number" ? assertNumber(entry.estimatedMinutes, "topic.estimatedMinutes", 1, 600) : undefined,
    completed: typeof entry.completed === "boolean" ? entry.completed : undefined
  };
}

function assertTask(value: unknown): StudyTaskInput {
  if (!value || typeof value !== "object") throw new Error("Invalid task");
  const entry = value as Record<string, unknown>;
  const type = entry.type;
  const status = entry.status;
  if (type !== "learn" && type !== "review" && type !== "buffer") throw new Error("Invalid task.type");
  if (status !== "open" && status !== "done" && status !== "missed") throw new Error("Invalid task.status");
  return {
    id: assertString(entry.id, "task.id", 100),
    examId: typeof entry.examId === "string" ? entry.examId.slice(0, 100) : undefined,
    topicId: typeof entry.topicId === "string" ? entry.topicId.slice(0, 100) : undefined,
    date: assertString(entry.date, "task.date", 20),
    task: assertString(entry.task, "task.task", 240),
    duration: assertNumber(entry.duration, "task.duration", 1, 600),
    type,
    status
  };
}

function assertTopics(payload: Record<string, unknown>): TopicInput[] {
  if (!Array.isArray(payload.topics)) throw new Error("Invalid topics");
  return payload.topics.slice(0, 30).map(assertTopic);
}

function assertTasks(payload: Record<string, unknown>): StudyTaskInput[] {
  if (!Array.isArray(payload.tasks)) throw new Error("Invalid tasks");
  return payload.tasks.slice(0, 80).map(assertTask);
}

function assertStats(payload: Record<string, unknown>): UserStatsInput {
  const stats = payload.stats;
  if (!stats || typeof stats !== "object") throw new Error("Invalid stats");
  const entry = stats as Record<string, unknown>;
  return {
    studyTime: assertNumber(entry.studyTime, "stats.studyTime", 0, 1_000_000),
    streak: assertNumber(entry.streak, "stats.streak", 0, 10_000),
    xp: assertNumber(entry.xp, "stats.xp", 0, 100_000_000),
    level: assertNumber(entry.level, "stats.level", 1, 10_000)
  };
}

async function getAuthUser(req: Request): Promise<AuthUser> {
  const authHeader = req.headers.get("authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!authHeader?.startsWith("Bearer ") || !supabaseUrl || !supabaseAnonKey) {
    throw new PublicError("Login erforderlich.", 401);
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      authorization: authHeader
    }
  });
  if (!response.ok) throw new PublicError("Login erforderlich.", 401);
  const data = await response.json();
  if (!data?.id || typeof data.id !== "string") throw new PublicError("Login erforderlich.", 401);
  return { id: data.id };
}

function assertRateLimit(userId: string): void {
  const now = Date.now();
  const recent = (rateLimitStore.get(userId) ?? []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    throw new PublicError("Zu viele KI-Anfragen. Bitte kurz warten.", 429);
  }
  recent.push(now);
  rateLimitStore.set(userId, recent);
}

function buildPrompt(action: AiAction, payload: Record<string, unknown>): string {
  if (action === "generateQuiz") {
    const topics = assertTopics(payload);
    return `Erstelle 5 kurze Multiple-Choice-Fragen fuer diese Klausurthemen. Antworte nur als JSON: {"questions":[{"id":"string","prompt":"string","options":["string","string","string","string"],"answer":"string"}]}\nThemen:\n${JSON.stringify(topics)}`;
  }

  if (action === "generateFlashcards") {
    const topics = assertTopics(payload);
    return `Erstelle 6 kompakte Lernkarten. Antworte nur als JSON: {"flashcards":[{"id":"string","front":"string","back":"string"}]}\nThemen:\n${JSON.stringify(topics)}`;
  }

  if (action === "optimizeStudyPlan") {
    const tasks = assertTasks(payload);
    return `Sortiere und optimiere diesen Lernplan. Behalte alle IDs und Felder bei, veraendere nur Reihenfolge, status nicht aendern. Antworte nur als JSON: {"tasks":[...]}.\nAufgaben:\n${JSON.stringify(tasks)}`;
  }

  const stats = assertStats(payload);
  const tasks = assertTasks(payload);
  return `Gib eine kurze motivierende Lerncoach-Nachricht auf Deutsch. Antworte nur als JSON: {"title":"string","body":"string"}.\nStats:\n${JSON.stringify(stats)}\nAufgaben:\n${JSON.stringify(tasks.slice(0, 20))}`;
}

function stripJsonCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced?.[1] ?? trimmed).trim();
}

function readGeminiText(data: unknown): string {
  const text = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }> })
    ?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new PublicError("Gemini API Antwort war leer.", 500);
  }
  return stripJsonCodeFence(text);
}

async function callGemini(prompt: string, debug: DebugInfo): Promise<unknown> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash";
  debug.model = model;
  debug.hasGeminiApiKey = Boolean(apiKey);
  if (!apiKey) throw new PublicError("GEMINI_API_KEY fehlt in der Edge Function.", 500);

  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1600,
          responseMimeType: "application/json"
        },
        systemInstruction: {
          parts: [{ text: "Du bist ein praeziser Lerncoach. Erzeuge ausschliesslich valides JSON ohne Markdown." }]
        }
      })
    });
  } catch {
    throw new PublicError("Gemini API Netzwerkfehler.", 500);
  }

  debug.geminiHttpStatus = response.status;
  if (!response.ok) {
    debug.geminiErrorText = (await response.text()).slice(0, 300);
    throw new PublicError("Gemini API Anfrage fehlgeschlagen.", 500);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new PublicError("Gemini API Antwort war kein valides JSON.", 500);
  }

  const text = readGeminiText(data);
  try {
    return JSON.parse(text);
  } catch {
    debug.geminiErrorText = text.slice(0, 300);
    throw new PublicError("Gemini Antwort konnte nicht als JSON gelesen werden.", 500);
  }
}

function validateAiResult(action: AiAction, result: unknown): unknown {
  if (!result || typeof result !== "object") throw new PublicError("Gemini Antwort hatte ein unerwartetes Format.", 500);
  const data = result as Record<string, unknown>;
  if (action === "generateQuiz") {
    if (!Array.isArray(data.questions)) throw new PublicError("Gemini Quiz-Antwort hatte ein unerwartetes Format.", 500);
    return { questions: data.questions.slice(0, 8) };
  }
  if (action === "generateFlashcards") {
    if (!Array.isArray(data.flashcards)) throw new PublicError("Gemini Flashcard-Antwort hatte ein unerwartetes Format.", 500);
    return { flashcards: data.flashcards.slice(0, 10) };
  }
  if (action === "optimizeStudyPlan") {
    if (!Array.isArray(data.tasks)) throw new PublicError("Gemini Lernplan-Antwort hatte ein unerwartetes Format.", 500);
    return { tasks: data.tasks.slice(0, 80) };
  }
  if (typeof data.title !== "string" || typeof data.body !== "string") {
    throw new PublicError("Gemini Coach-Antwort hatte ein unerwartetes Format.", 500);
  }
  return { title: data.title.slice(0, 120), body: data.body.slice(0, 600) };
}

Deno.serve(async (req) => {
  const debug: DebugInfo = {
    model: Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash",
    hasGeminiApiKey: Boolean(Deno.env.get("GEMINI_API_KEY"))
  };

  try {
    if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
    if (req.method !== "POST") return errorResponse("Nur POST ist erlaubt.", 400, debug);

    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) return errorResponse("Anfrage ist zu gross.", 400, debug);

    const user = await getAuthUser(req);
    debug.userId = user.id;
    assertRateLimit(user.id);

    let body: AiRequest;
    try {
      body = (await req.json()) as AiRequest;
    } catch {
      return errorResponse("Ungueltiger JSON-Body.", 400, debug);
    }

    if (!body || typeof body !== "object") return errorResponse("Ungueltige Anfrage.", 400, debug);
    debug.action = body.action;
    if (!["generateQuiz", "generateFlashcards", "optimizeStudyPlan", "coachMessage"].includes(body.action)) {
      return errorResponse("Unbekannte KI-Aktion.", 400, debug);
    }
    if (!body.payload || typeof body.payload !== "object") return errorResponse("Ungueltige Nutzdaten.", 400, debug);

    const prompt = buildPrompt(body.action, body.payload);
    const result = validateAiResult(body.action, await callGemini(prompt, debug));
    logDebug("ai-coach-success", debug);
    return jsonResponse({ data: result });
  } catch (error) {
    if (error instanceof PublicError) return errorResponse(error.message, error.status, debug);
    const invalidRequest = error instanceof SyntaxError || error instanceof Error && error.message.startsWith("Invalid");
    return errorResponse(invalidRequest ? "Ungueltige Anfrage." : "KI-Anfrage fehlgeschlagen.", invalidRequest ? 400 : 500, debug);
  }
});
