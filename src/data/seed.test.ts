import { describe, it, expect, vi } from "vitest";
import { seedSnapshot } from "./seed";
import type { AppSnapshot } from "../types";

function collectIds(snapshot: AppSnapshot): string[] {
  return [
    ...snapshot.exams.map((entry) => entry.id),
    ...snapshot.topics.map((entry) => entry.id),
    ...snapshot.studyTasks.map((entry) => entry.id),
    ...snapshot.materials.map((entry) => entry.id),
    ...snapshot.learningGroups.map((entry) => entry.id)
  ];
}

async function freshSeed(): Promise<AppSnapshot> {
  vi.resetModules();
  const module = await import("./seed");
  return module.seedSnapshot;
}

describe("seedSnapshot", () => {
  it("uses ids that are unique within the snapshot", () => {
    const ids = collectIds(seedSnapshot);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * Seed data is pushed to Supabase like any other row. `exams.id`,
   * `learning_groups.id` and `learning_groups.invite_code` are globally unique
   * in Postgres, so a literal id shared by every install would let the first
   * account to sync claim it and make every later account's push fail.
   */
  it("mints different ids for each install", async () => {
    const first = collectIds(await freshSeed());
    const second = collectIds(await freshSeed());

    expect(first.length).toBeGreaterThan(0);
    expect(second.length).toBe(first.length);
    expect(first.some((id) => second.includes(id))).toBe(false);
  });

  it("mints a different learning group invite code for each install", async () => {
    const first = (await freshSeed()).learningGroups.map((group) => group.inviteCode);
    const second = (await freshSeed()).learningGroups.map((group) => group.inviteCode);

    expect(first.length).toBeGreaterThan(0);
    expect(first.some((code) => second.includes(code))).toBe(false);
  });

  it("no longer ships the shared literal ids that collided across accounts", () => {
    const ids = collectIds(seedSnapshot);
    for (const legacy of ["exam-mathe", "exam-bio", "group-demo", "mat-note-mathe", "mat-video-bio"]) {
      expect(ids).not.toContain(legacy);
    }
    expect(seedSnapshot.learningGroups.map((group) => group.inviteCode)).not.toContain("MATHE-1234");
  });

  it("keeps every reference pointing at a seeded exam", () => {
    const examIds = new Set(seedSnapshot.exams.map((exam) => exam.id));

    for (const topic of seedSnapshot.topics) expect(examIds).toContain(topic.examId);
    for (const task of seedSnapshot.studyTasks) expect(examIds).toContain(task.examId);
    for (const material of seedSnapshot.materials) expect(examIds).toContain(material.examId);
    for (const group of seedSnapshot.learningGroups) {
      for (const examId of group.examIds) expect(examIds).toContain(examId);
    }
  });
});
