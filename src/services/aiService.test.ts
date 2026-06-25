import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateQuizFromTopicsResult, isRateLimitedError } from "./aiService";
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
