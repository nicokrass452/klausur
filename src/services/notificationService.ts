import type { AppSettings, Exam, StudyTask } from "../types";
import { daysUntil, toIsoDate } from "../utils/dateUtils";

const SEEN_KEY = "klausurplaner:notifications";

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  return Notification.requestPermission();
}

export function syncNotificationSchedule(exams: Exam[], tasks: StudyTask[], settings: AppSettings): void {
  if (!settings.reminders.notificationsEnabled || !("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const seen = readSeenMap();
  const today = toIsoDate(new Date());

  exams.filter((exam) => !exam.deletedAt).forEach((exam) => {
    const remaining = daysUntil(exam.date);
    if (settings.reminders.examReminderOffsets.includes(remaining)) {
      notifyOnce(`exam-${exam.id}-${remaining}`, `Klausur in ${remaining} Tagen`, `${exam.subject} am ${exam.date} um ${exam.time}`, seen);
    }
  });

  if (settings.reminders.dailyReminder) {
    notifyOnce(`daily-${today}`, "Tagesziel", "Plane heute 25 Minuten Fokuszeit für deine wichtigsten Themen ein.", seen);
  }

  if (settings.reminders.todayLearningReminder) {
    const dueTasks = tasks.filter((task) => !task.deletedAt && task.date === today && task.status === "open");
    if (dueTasks.length) {
      notifyOnce(`today-${today}`, "Heute lernen", `${dueTasks.length} Lernaufgaben warten auf dich.`, seen);
    }
  }

  writeSeenMap(seen);
}

function notifyOnce(key: string, title: string, body: string, seen: Record<string, boolean>): void {
  if (seen[key]) return;
  new Notification(title, { body });
  seen[key] = true;
}

function readSeenMap(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeSeenMap(payload: Record<string, boolean>): void {
  localStorage.setItem(SEEN_KEY, JSON.stringify(payload));
}
