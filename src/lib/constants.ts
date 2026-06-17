import type { UserBadge } from "../types";

export const APP_NAME = "Klausurplaner";
export const ROUTES = {
  login: "/login",
  dashboard: "/dashboard",
  calendar: "/calendar",
  exams: "/exams",
  studyPlan: "/study-plan",
  focus: "/focus",
  analytics: "/analytics",
  settings: "/settings"
} as const;

export const SUBJECT_COLORS = ["#0f766e", "#f97316", "#2563eb", "#dc2626", "#7c3aed", "#0891b2", "#65a30d"] as const;

export const SPACED_REPETITION_INTERVALS = [1, 2, 5, 10, 18];
export const POMODORO_FOCUS_MINUTES = 25;
export const POMODORO_BREAK_MINUTES = 5;

export const BADGE_CATALOG: Array<Pick<UserBadge, "id" | "label" | "description">> = [
  { id: "first-focus", label: "Fokusstart", description: "Die erste Fokus-Session abgeschlossen." },
  { id: "ten-hours", label: "10h gelernt", description: "Mindestens 10 Stunden Lernzeit gesammelt." },
  { id: "streak-7", label: "7er Streak", description: "Sieben Lerntage am Stueck erreicht." },
  { id: "exam-master", label: "Klausur geschafft", description: "Eine Klausur komplett durchgeplant." }
];
