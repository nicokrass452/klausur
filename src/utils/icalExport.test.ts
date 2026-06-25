import { describe, it, expect } from "vitest";
import { examsToIcal } from "./icalExport";
import type { Exam } from "../types";

function makeExam(overrides: Partial<Exam> = {}): Exam {
  return {
    id: "exam-1",
    subject: "Mathematik",
    date: "2025-02-15",
    time: "10:00",
    room: "Raum A1",
    notes: "Taschenrechner nicht vergessen!",
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

describe("examsToIcal", () => {
  it("produces a valid VCALENDAR wrapper", () => {
    const ics = examsToIcal([makeExam()]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
  });

  it("includes VEVENT fields", () => {
    const ics = examsToIcal([makeExam()]);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("SUMMARY:Mathematik");
    expect(ics).toContain("LOCATION:Raum A1");
    expect(ics).toContain("DESCRIPTION:Taschenrechner nicht vergessen!");
    expect(ics).toMatch(/DTSTART:20250215T100000Z/);
  });

  it("generates unique UIDs per exam", () => {
    const ics = examsToIcal([makeExam({ id: "a" }), makeExam({ id: "b" })]);
    const uids = ics.split("\r\n").filter((line) => line.startsWith("UID:"));
    expect(uids).toHaveLength(2);
    expect(new Set(uids).size).toBe(2);
  });

  it("escapes special characters in text", () => {
    const ics = examsToIcal([makeExam({ subject: "Bio; Chemie, Physik", notes: "Zeile 1\nZeile 2" })]);
    expect(ics).toContain("SUMMARY:Bio\\; Chemie\\, Physik");
    expect(ics).toContain("DESCRIPTION:Zeile 1\\nZeile 2");
  });

  it("uses a default time when exam time is empty", () => {
    const ics = examsToIcal([makeExam({ time: "" })]);
    expect(ics).toMatch(/DTSTART:20250215T080000Z/);
  });
});
