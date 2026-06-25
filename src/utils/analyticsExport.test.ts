import { describe, it, expect } from "vitest";
import { buildAnalyticsCsv, xpTrendSummary } from "./analyticsExport";
import type { Exam, StudyTask, UserStats } from "../types";

function makeExam(overrides: Partial<Exam> = {}): Exam {
  return {
    id: "exam-1",
    subject: "Mathematik",
    date: "2025-02-15",
    time: "10:00",
    room: "A1",
    notes: "",
    difficulty: 3,
    knowledgeLevel: 2,
    color: "#0f766e",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    deletedAt: null,
    dailyMinutes: 30,
    ...overrides
  };
}

function makeStats(overrides: Partial<UserStats> = {}): UserStats {
  return {
    studyTime: 120,
    streak: 2,
    xp: 250,
    level: 3,
    badges: [],
    focusSessions: [],
    xpHistory: [
      { date: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10), xp: 40 },
      { date: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10), xp: 60 },
      { date: new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10), xp: 80 }
    ],
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

describe("buildAnalyticsCsv", () => {
  it("serializes per-exam learning minutes and xp history", () => {
    const tasks: StudyTask[] = [
      { id: "t1", examId: "exam-1", date: "2025-01-10", task: "Lernen", duration: 45, type: "learn", status: "done", updatedAt: new Date().toISOString(), deletedAt: null },
      { id: "t2", examId: "exam-1", date: "2025-01-11", task: "Wiederholen", duration: 30, type: "review", status: "done", updatedAt: new Date().toISOString(), deletedAt: null }
    ];
    const csv = buildAnalyticsCsv(makeStats(), [makeExam()], tasks);
    expect(csv).toContain("Fach,Lernminuten,Gesamt-Xp,Xp-verlauf-Datum,Xp-verlauf-Wert");
    expect(csv).toContain('"Mathematik",75,250,');
  });

  it("returns a fallback row when no exams exist", () => {
    const csv = buildAnalyticsCsv(makeStats(), [], []);
    expect(csv).toContain('"-",0,250,"-"');
  });
});

describe("xpTrendSummary", () => {
  it("sums xp within the requested window", () => {
    const summary = xpTrendSummary(makeStats(), 7);
    expect(summary.totalXp).toBe(100);
    expect(summary.average).toBe(50);
  });

  it("returns zero when no xp history exists in window", () => {
    const summary = xpTrendSummary(makeStats({ xpHistory: [] }), 7);
    expect(summary.totalXp).toBe(0);
    expect(summary.average).toBe(0);
  });
});
