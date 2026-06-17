import { BADGE_CATALOG } from "../lib/constants";
import type { Exam, StudyTask, UserBadge, UserStats } from "../types";

export function calculateLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

export function xpToNextLevel(xp: number): number {
  return 100 - (xp % 100 || 100);
}

export function xpForTask(duration: number, type: StudyTask["type"]): number {
  const base = Math.max(8, Math.round(duration / 6));
  if (type === "review") return base + 3;
  if (type === "buffer") return Math.max(5, base - 2);
  return base;
}

export function xpForFocusSession(minutes: number): number {
  return minutes >= 25 ? 25 : Math.max(10, Math.round(minutes * 0.8));
}

export function resolveBadges(stats: UserStats, exams: Exam[], studyTasks: StudyTask[]): UserBadge[] {
  const unlocked = new Map(stats.badges.map((badge) => [badge.id, badge]));
  const now = new Date().toISOString();
  const completedExams = exams.filter((exam) => studyTasks.some((task) => task.examId === exam.id && task.status === "done"));

  const candidates = BADGE_CATALOG.filter((badge) => {
    if (badge.id === "first-focus") return stats.focusSessions.some((session) => session.completed);
    if (badge.id === "ten-hours") return stats.studyTime >= 600;
    if (badge.id === "streak-7") return stats.streak >= 7;
    if (badge.id === "exam-master") return completedExams.length > 0;
    return false;
  });

  candidates.forEach((candidate) => {
    if (!unlocked.has(candidate.id)) {
      unlocked.set(candidate.id, {
        ...candidate,
        unlockedAt: now,
        updatedAt: now,
        deletedAt: null
      });
    }
  });

  return Array.from(unlocked.values());
}
