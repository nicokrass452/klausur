type AiAction = "generateQuiz" | "generateFlashcards" | "optimizeStudyPlan" | "coachMessage" | "coachChat";
type CoachMode = "coach" | "quiz" | "flashcards" | "plan" | "explain";

interface AuthUser {
  id: string;
  authenticated: boolean;
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
const ANONYMOUS_RATE_LIMIT_MAX_REQUESTS = 3;
const MAX_BODY_BYTES = 24_000;
const DEFAULT_GLM_MODEL = "glm-4-flash";
const DEFAULT_GLM_API_BASE = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash";
const DEFAULT_DEEPSEEK_API_BASE = "https://api.deepseek.com/chat/completions";

type AiProvider = "glm" | "deepseek";

interface DebugInfo {
  action?: string;
  userId?: string;
  provider?: AiProvider;
  model?: string;
  hasAiApiKey?: boolean;
  aiHttpStatus?: number;
  aiErrorText?: string;
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
      provider: debug?.provider,
      aiHttpStatus: debug?.aiHttpStatus,
      aiErrorText: debug?.aiErrorText?.slice(0, 300),
      model: debug?.model,
      hasAiApiKey: debug?.hasAiApiKey
    },
    status
  );
}

function aiFallbackResponse(action: AiAction, payload: Record<string, unknown>, message: string, debug?: DebugInfo): Response {
  logDebug("ai-coach-fallback", debug);
  return jsonResponse(
    {
      data: fallbackAiResult(action, payload),
      error: message,
      fallback: true,
      source: "edge-function",
      provider: debug?.provider,
      aiHttpStatus: debug?.aiHttpStatus,
      aiErrorText: debug?.aiErrorText?.slice(0, 300),
      model: debug?.model,
      hasAiApiKey: debug?.hasAiApiKey
    },
    200
  );
}

function logDebug(event: string, debug?: DebugInfo): void {
  if (!debug) return;
  console.info(
    JSON.stringify({
      event,
      action: debug.action,
      userId: debug.userId,
      provider: debug.provider,
      model: debug.model,
      hasAiApiKey: debug.hasAiApiKey,
      aiHttpStatus: debug.aiHttpStatus,
      aiErrorText: debug.aiErrorText?.slice(0, 300)
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

  if (!authHeader) {
    return { id: anonymousClientId(req), authenticated: false };
  }

  if (!authHeader.startsWith("Bearer ") || !supabaseUrl || !supabaseAnonKey) {
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
  return { id: data.id, authenticated: true };
}

function assertCoachMode(value: unknown): CoachMode {
  if (value === "quiz" || value === "flashcards" || value === "plan" || value === "explain") return value;
  return "coach";
}

function assertChatMessages(payload: Record<string, unknown>): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(payload.messages)) throw new Error("Invalid messages");
  return payload.messages.slice(-12).map((value) => {
    if (!value || typeof value !== "object") throw new Error("Invalid message");
    const entry = value as Record<string, unknown>;
    const role = entry.role;
    if (role !== "user" && role !== "assistant") throw new Error("Invalid message.role");
    return {
      role,
      content: assertString(entry.content, "message.content", 1200)
    };
  });
}

function anonymousClientId(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  return `anonymous:${forwardedFor || realIp || "unknown"}`;
}

function assertRateLimit(user: AuthUser): void {
  const now = Date.now();
  const maxRequests = user.authenticated ? RATE_LIMIT_MAX_REQUESTS : ANONYMOUS_RATE_LIMIT_MAX_REQUESTS;
  const recent = (rateLimitStore.get(user.id) ?? []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= maxRequests) {
    throw new PublicError("Zu viele KI-Anfragen. Bitte kurz warten.", 429);
  }
  recent.push(now);
  rateLimitStore.set(user.id, recent);
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

  if (action === "coachMessage") {
    const stats = assertStats(payload);
    const tasks = assertTasks(payload);
    return `Gib eine kurze motivierende Lerncoach-Nachricht auf Deutsch. Antworte nur als JSON: {"title":"string","body":"string"}.\nStats:\n${JSON.stringify(stats)}\nAufgaben:\n${JSON.stringify(tasks.slice(0, 20))}`;
  }

  return buildCoachChatPrompt(payload);
}

function modeInstruction(mode: CoachMode): string {
  if (mode === "quiz") {
    return "Quizmodus: Erstelle kurze Pruefungsfragen. Nutze fuer jede Karte exakt dieses Textformat: Frage: ... Antwort: ... Gib keine langen Vorlesungen.";
  }
  if (mode === "flashcards") {
    return "Flashcard-Modus: Erzeuge kompakte Karten. Nutze fuer jede Karte exakt dieses Textformat: Frage: ... Antwort: ... Fokussiere Definitionen, Formeln, typische Fehler und Beispiele.";
  }
  if (mode === "plan") {
    return "Planmodus: Priorisiere Aufgaben, schlage konkrete naechste Lernbloecke vor und begruende knapp nach Dringlichkeit, Schwierigkeit und Fortschritt.";
  }
  if (mode === "explain") {
    return "Erklaermodus: Erklaere Stoff schrittweise, mit einfachen Beispielen und einer kurzen Kontrollfrage am Ende.";
  }
  return "Coachmodus: Sei ein direkter Lerncoach. Gib konkrete naechste Schritte, halte Antworten kurz und motivierend, aber nicht oberflaechlich.";
}

function buildCoachChatPrompt(payload: Record<string, unknown>): string {
  const mode = assertCoachMode(payload.mode);
  const messages = assertChatMessages(payload);
  const context = payload.context && typeof payload.context === "object" ? payload.context : {};
  return `Du bist der KI-Trainer in einer Klausurplaner-App. Antworte auf Deutsch und nur als JSON: {"message":"string"}.
${modeInstruction(mode)}

App-Kontext:
${JSON.stringify(context).slice(0, 6000)}

Chatverlauf:
${JSON.stringify(messages)}

Antwortregeln:
- Nutze den App-Kontext, wenn er hilfreich ist.
- Erfinde keine gespeicherten Daten.
- Bei Begruessungen oder Smalltalk antworte kurz und natuerlich, ohne sofort einen Lernplan zu geben.
- Stelle eine knappe Rueckfrage, wenn der Nutzer noch kein konkretes Ziel genannt hat.
- Wenn der Nutzer Quiz oder Flashcards will, liefere direkt nutzbares Material.
- Antworte kompakt, konkret und lernorientiert.`;
}

function stripJsonCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced?.[1] ?? trimmed).trim();
}

function readChatCompletionText(data: unknown, providerLabel: string): string {
  const text = (data as { choices?: Array<{ message?: { content?: unknown } }> })
    ?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new PublicError(`${providerLabel} API Antwort war leer.`, 500);
  }
  return stripJsonCodeFence(text);
}

function getModelCandidates(modelsEnv: string, modelEnv: string, fallbackModel: string): string[] {
  const configuredModels = Deno.env.get(modelsEnv) ?? Deno.env.get(modelEnv) ?? fallbackModel;
  const models = configuredModels
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  return [...new Set(models.length ? models : [fallbackModel])];
}

async function callGlm(prompt: string, debug: DebugInfo): Promise<unknown> {
  const apiKey = Deno.env.get("GLM_API_KEY") ?? Deno.env.get("ZHIPU_API_KEY");
  const models = getModelCandidates("GLM_MODELS", "GLM_MODEL", DEFAULT_GLM_MODEL);
  debug.provider = "glm";
  if (!apiKey) throw new PublicError("GLM_API_KEY fehlt in der Edge Function.", 500);

  let lastError: PublicError | null = null;
  for (const model of models) {
    try {
      return await callOpenAiCompatibleModel({
        prompt,
        apiKey,
        apiBase: Deno.env.get("GLM_API_BASE") ?? DEFAULT_GLM_API_BASE,
        model,
        providerLabel: "GLM",
        debug
      });
    } catch (error) {
      if (!(error instanceof PublicError)) throw error;
      lastError = error;
      if (error.status < 500) throw error;
    }
  }

  throw lastError ?? new PublicError("GLM API Anfrage fehlgeschlagen.", 500);
}

async function callDeepSeek(prompt: string, debug: DebugInfo): Promise<unknown> {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  const models = getModelCandidates("DEEPSEEK_MODELS", "DEEPSEEK_MODEL", DEFAULT_DEEPSEEK_MODEL);
  debug.provider = "deepseek";
  if (!apiKey) throw new PublicError("DEEPSEEK_API_KEY fehlt in der Edge Function.", 500);

  let lastError: PublicError | null = null;
  for (const model of models) {
    try {
      return await callOpenAiCompatibleModel({
        prompt,
        apiKey,
        apiBase: Deno.env.get("DEEPSEEK_API_BASE") ?? DEFAULT_DEEPSEEK_API_BASE,
        model,
        providerLabel: "DeepSeek",
        debug
      });
    } catch (error) {
      if (!(error instanceof PublicError)) throw error;
      lastError = error;
      if (error.status < 500) throw error;
    }
  }

  throw lastError ?? new PublicError("DeepSeek API Anfrage fehlgeschlagen.", 500);
}

async function callOpenAiCompatibleModel(options: {
  prompt: string;
  apiKey: string;
  apiBase: string;
  model: string;
  providerLabel: string;
  debug: DebugInfo;
}): Promise<unknown> {
  const { prompt, apiKey, apiBase, model, providerLabel, debug } = options;
  debug.model = model;
  debug.hasAiApiKey = true;
  debug.aiHttpStatus = undefined;
  debug.aiErrorText = undefined;
  let response: Response;
  try {
    response = await fetch(apiBase, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "Du bist ein praeziser Lerncoach. Erzeuge ausschliesslich valides JSON ohne Markdown." },
          { role: "user", content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 1600,
        response_format: { type: "json_object" }
      })
    });
  } catch {
    throw new PublicError(`${providerLabel} API Netzwerkfehler fuer ${model}.`, 500);
  }

  debug.aiHttpStatus = response.status;
  if (!response.ok) {
    debug.aiErrorText = (await response.text()).slice(0, 300);
    throw new PublicError(`${providerLabel} API Anfrage fehlgeschlagen fuer ${model}.`, 500);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new PublicError(`${providerLabel} API Antwort von ${model} war kein valides JSON.`, 500);
  }

  const text = readChatCompletionText(data, providerLabel);
  try {
    return JSON.parse(text);
  } catch {
    debug.aiErrorText = text.slice(0, 300);
    throw new PublicError(`${providerLabel} Antwort von ${model} konnte nicht als JSON gelesen werden.`, 500);
  }
}

function validateAiResult(action: AiAction, result: unknown, providerLabel: string): unknown {
  if (!result || typeof result !== "object") throw new PublicError(`${providerLabel} Antwort hatte ein unerwartetes Format.`, 500);
  const data = result as Record<string, unknown>;
  if (action === "generateQuiz") {
    if (!Array.isArray(data.questions)) throw new PublicError(`${providerLabel} Quiz-Antwort hatte ein unerwartetes Format.`, 500);
    return { questions: data.questions.slice(0, 8) };
  }
  if (action === "generateFlashcards") {
    if (!Array.isArray(data.flashcards)) throw new PublicError(`${providerLabel} Flashcard-Antwort hatte ein unerwartetes Format.`, 500);
    return { flashcards: data.flashcards.slice(0, 10) };
  }
  if (action === "optimizeStudyPlan") {
    if (!Array.isArray(data.tasks)) throw new PublicError(`${providerLabel} Lernplan-Antwort hatte ein unerwartetes Format.`, 500);
    return { tasks: data.tasks.slice(0, 80) };
  }
  if (action === "coachChat") {
    if (typeof data.message !== "string") throw new PublicError(`${providerLabel} Chat-Antwort hatte ein unerwartetes Format.`, 500);
    return { message: data.message.slice(0, 4000) };
  }
  if (typeof data.title !== "string" || typeof data.body !== "string") {
    throw new PublicError(`${providerLabel} Coach-Antwort hatte ein unerwartetes Format.`, 500);
  }
  return { title: data.title.slice(0, 120), body: data.body.slice(0, 600) };
}

async function callPrimaryWithDeepSeekFallback(action: AiAction, prompt: string, debug: DebugInfo): Promise<{ data: unknown; provider: AiProvider }> {
  let primaryError: PublicError | null = null;
  try {
    const data = validateAiResult(action, await callGlm(prompt, debug), "GLM");
    return { data, provider: "glm" };
  } catch (error) {
    if (!(error instanceof PublicError) || error.status < 500) throw error;
    primaryError = error;
  }

  try {
    const data = validateAiResult(action, await callDeepSeek(prompt, debug), "DeepSeek");
    return { data, provider: "deepseek" };
  } catch (error) {
    if (!(error instanceof PublicError) || error.status < 500) throw error;
    const message = primaryError ? `${primaryError.message} DeepSeek-Fallback fehlgeschlagen: ${error.message}` : error.message;
    throw new PublicError(message, 500);
  }
}

function fallbackAiResult(action: AiAction, payload: Record<string, unknown>): unknown {
  const topics = Array.isArray(payload.topics) ? payload.topics : [];

  if (action === "generateQuiz") {
    const firstTopic = typeof (topics[0] as { name?: unknown } | undefined)?.name === "string"
      ? (topics[0] as { name: string }).name
      : "deinem aktuellen Thema";
    return {
      questions: [
        {
          id: "fallback-quiz-1",
          prompt: `Welche Aussage hilft dir beim Wiederholen von ${firstTopic}?`,
          options: ["Kernbegriffe aktiv abrufen", "Nur Material sammeln", "Alle Aufgaben verschieben", "Ohne Pausen durcharbeiten"],
          answer: "Kernbegriffe aktiv abrufen"
        }
      ]
    };
  }

  if (action === "generateFlashcards") {
    const firstTopic = typeof (topics[0] as { name?: unknown } | undefined)?.name === "string"
      ? (topics[0] as { name: string }).name
      : "das Thema";
    return {
      flashcards: [
        {
          id: "fallback-flashcard-1",
          front: `Was ist der naechste sinnvolle Lernschritt fuer ${firstTopic}?`,
          back: "Kernbegriffe abrufen, eine Beispielaufgabe loesen und offene Fragen notieren."
        }
      ]
    };
  }

  if (action === "optimizeStudyPlan") {
    return { tasks: Array.isArray(payload.tasks) ? payload.tasks.slice(0, 80) : [] };
  }

  if (action === "coachChat") {
    return {
      message: "Hi. Wobei soll ich dir helfen: Thema erklaeren, Quiz abfragen, Flashcards erstellen oder den heutigen Lernplan sortieren?"
    };
  }

  return {
    title: "Weiterlernen",
    body: "Der KI-Coach ist gerade nicht stabil erreichbar. Starte mit einer kurzen offenen Aufgabe und versuche es spaeter erneut."
  };
}

Deno.serve(async (req) => {
  const debug: DebugInfo = {
    model: getModelCandidates("GLM_MODELS", "GLM_MODEL", DEFAULT_GLM_MODEL).join(","),
    hasAiApiKey: Boolean(Deno.env.get("GLM_API_KEY") ?? Deno.env.get("ZHIPU_API_KEY") ?? Deno.env.get("DEEPSEEK_API_KEY"))
  };

  try {
    if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
    if (req.method !== "POST") return errorResponse("Nur POST ist erlaubt.", 400, debug);

    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) return errorResponse("Anfrage ist zu gross.", 400, debug);

    let body: AiRequest;
    try {
      body = (await req.json()) as AiRequest;
    } catch {
      return errorResponse("Ungueltiger JSON-Body.", 400, debug);
    }

    if (!body || typeof body !== "object") return errorResponse("Ungueltige Anfrage.", 400, debug);
    debug.action = body.action;
    if (!["generateQuiz", "generateFlashcards", "optimizeStudyPlan", "coachMessage", "coachChat"].includes(body.action)) {
      return errorResponse("Unbekannte KI-Aktion.", 400, debug);
    }
    if (!body.payload || typeof body.payload !== "object") return errorResponse("Ungueltige Nutzdaten.", 400, debug);

    const user = await getAuthUser(req);
    debug.userId = user.id;
    assertRateLimit(user);

    const prompt = buildPrompt(body.action, body.payload);
    let result: { data: unknown; provider: AiProvider };
    try {
      result = await callPrimaryWithDeepSeekFallback(body.action, prompt, debug);
    } catch (error) {
      if (error instanceof PublicError && error.status >= 500) {
        return aiFallbackResponse(body.action, body.payload, error.message, debug);
      }
      throw error;
    }
    logDebug("ai-coach-success", debug);
    return jsonResponse({ data: result.data, source: result.provider });
  } catch (error) {
    if (error instanceof PublicError) return errorResponse(error.message, error.status, debug);
    const invalidRequest = error instanceof SyntaxError || error instanceof Error && error.message.startsWith("Invalid");
    return errorResponse(invalidRequest ? "Ungueltige Anfrage." : "KI-Anfrage fehlgeschlagen.", invalidRequest ? 400 : 500, debug);
  }
});
