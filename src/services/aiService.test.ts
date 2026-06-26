import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateQuizFromTopicsResult, isRateLimitedError, sendCoachChatResult, type CoachChatMessage } from "./aiService";
import type { Topic } from "../types";

const topics: Topic[] = [
  { id: "topic-1", examId: "exam-1", name: "Analysis", completed: false, difficulty: 3, estimatedMinutes: 30, updatedAt: new Date().toISOString(), deletedAt: null }
];

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { access_token: "token" } }, error: null }))
    }
  },
  supabaseUrl: "https://test.supabase.co",
  supabaseAnonKey: "test-key",
  hasSupabaseEnv: true,
  getSupabaseRequestHeaders: vi.fn(() => ({ apikey: "test-key", Authorization: "Bearer token" }))
}));

describe("aiService rate limiting", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects 429 responses as rate limited", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: "Zu viele KI-Anfragen" })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateQuizFromTopicsResult(topics);
    expect(result.source).toBe("mock");
    expect(result.rateLimited).toBe(true);
    expect(result.error).toContain("Kontingent erschöpft");
  });

  it("falls back to mock for other errors without rateLimited flag", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal error" })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateQuizFromTopicsResult(topics);
    expect(result.source).toBe("mock");
    expect(result.rateLimited).toBeFalsy();
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("returns real data when edge function responds successfully", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        source: "glm",
        data: {
          questions: [
            { id: "q1", prompt: "Was ist 2+2?", options: ["3", "4"], answer: "4" }
          ]
        }
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateQuizFromTopicsResult(topics);
    expect(result.source).toBe("glm");
    expect(result.rateLimited).toBeFalsy();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].answer).toBe("4");
  });
});

describe("isRateLimitedError", () => {
  it("returns true for 429 response context", () => {
    const error = new Error("Edge Function HTTP 429") as Error & { context?: Response };
    error.context = { status: 429 } as Response;
    expect(isRateLimitedError(error)).toBe(true);
  });

  it("returns true for rate-limit messages", () => {
    expect(isRateLimitedError(new Error("Zu viele KI-Anfragen"))).toBe(true);
    expect(isRateLimitedError(new Error("Rate limit exceeded"))).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isRateLimitedError(new Error("Network error"))).toBe(false);
  });
});

describe("aiService material context", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("includes useMaterials and examId in the payload when options are set", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        source: "glm",
        data: {
          questions: [
            { id: "q1", prompt: "Was ist 2+2?", options: ["3", "4"], answer: "4" }
          ]
        },
        materialContext: { used: true, chunkCount: 5, examScoped: true }
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateQuizFromTopicsResult(topics, { useMaterials: true, examId: "exam-1" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(callBody.payload.useMaterials).toBe(true);
    expect(callBody.payload.examId).toBe("exam-1");

    expect(result.materialContext).toEqual({ used: true, chunkCount: 5, examScoped: true });
  });

  it("omits useMaterials when the option is not set (default behavior preserved)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        source: "glm",
        data: { questions: [] }
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    await generateQuizFromTopicsResult(topics);

    const callBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(callBody.payload.useMaterials).toBeUndefined();
    expect(callBody.payload.examId).toBeUndefined();
  });

  it("reports materialContext.used=false on rate-limit fallback (mock fallback path)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: "Zu viele KI-Anfragen" })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateQuizFromTopicsResult(topics, { useMaterials: true, examId: "exam-1" });

    expect(result.source).toBe("mock");
    expect(result.rateLimited).toBe(true);
    expect(result.materialContext).toEqual({ used: false, chunkCount: 0, examScoped: true });
  });

  it("reports materialContext.used=false when the edge function returns no chunks (empty material fallback)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        source: "glm",
        data: { questions: [] },
        materialContext: { used: false, chunkCount: 0, examScoped: false }
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateQuizFromTopicsResult(topics, { useMaterials: true });

    expect(result.source).toBe("glm");
    expect(result.materialContext?.used).toBe(false);
    expect(result.materialContext?.chunkCount).toBe(0);
  });

  it("propagates materialContext from coachChat responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        source: "glm",
        data: { message: "Laut deinen Notizen ist die Ableitung von x^2 gleich 2x." },
        materialContext: { used: true, chunkCount: 2, examScoped: false }
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const messages: CoachChatMessage[] = [
      { role: "user", content: "Was sagt meine Notiz zur Ableitung?" }
    ];
    const result = await sendCoachChatResult("coach", messages, {}, { useMaterials: true });

    expect(result.materialContext?.used).toBe(true);
    expect(result.materialContext?.chunkCount).toBe(2);
    expect(result.data.message).toContain("Ableitung");

    const callBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(callBody.payload.useMaterials).toBe(true);
    // The ranking query for coachChat is the last user message.
    expect(callBody.payload.messages).toEqual(messages);
  });

  it("preserves rate-limit detection when useMaterials is enabled (rate-limit behavior)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: "Zu viele KI-Anfragen" })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendCoachChatResult("coach", [{ role: "user", content: "Frage?" }], {}, { useMaterials: true });

    expect(result.source).toBe("mock");
    expect(result.rateLimited).toBe(true);
    expect(result.error).toContain("Kontingent erschöpft");
    // Material context is reported as not used so the UI does not falsely claim the coach consulted notes.
    expect(result.materialContext?.used).toBe(false);
  });
});
