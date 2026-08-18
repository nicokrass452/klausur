import { SUBJECT_COLORS } from "../lib/constants";
import { generateStudyPlanForExam } from "../services/studyPlanGenerator";
import type { AppSnapshot, Exam, Topic } from "../types";

/**
 * Seed data is demo content, but it is real data as far as the sync layer is
 * concerned: it gets pushed to Supabase like anything else. Shared literal ids
 * would collide across accounts, because `exams.id`, `learning_groups.id` and
 * `learning_groups.invite_code` are all globally unique in Postgres — the
 * first account to sync would claim them and every later push would fail. Each
 * install therefore mints its own ids, which then persist with the store.
 */
function seedId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  return `${prefix}-${random}`;
}

function seedInviteCode(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

const MATHE_EXAM_ID = seedId("exam");
const BIO_EXAM_ID = seedId("exam");

const now = new Date();
const nextExamDate = new Date(now);
nextExamDate.setDate(now.getDate() + 8);

const secondExamDate = new Date(now);
secondExamDate.setDate(now.getDate() + 16);

const exams: Exam[] = [
  {
    id: MATHE_EXAM_ID,
    subject: "Mathematik",
    date: nextExamDate.toISOString().slice(0, 10),
    time: "09:00",
    room: "B112",
    notes: "Ableitungen, Kurvendiskussion, Extremwerte",
    difficulty: 4,
    knowledgeLevel: 2,
    color: SUBJECT_COLORS[0],
    createdAt: now.toISOString(),
    dailyMinutes: 45,
    updatedAt: now.toISOString(),
    deletedAt: null
  },
  {
    id: BIO_EXAM_ID,
    subject: "Biologie",
    date: secondExamDate.toISOString().slice(0, 10),
    time: "11:30",
    room: "C204",
    notes: "Genetik, DNA-Replikation, Proteinbiosynthese",
    difficulty: 3,
    knowledgeLevel: 3,
    color: SUBJECT_COLORS[1],
    createdAt: now.toISOString(),
    dailyMinutes: 35,
    updatedAt: now.toISOString(),
    deletedAt: null
  }
];

const topics: Topic[] = [
  { id: seedId("topic"), examId: MATHE_EXAM_ID, name: "Ableitungen", completed: false, difficulty: 4, estimatedMinutes: 45, updatedAt: now.toISOString(), deletedAt: null },
  { id: seedId("topic"), examId: MATHE_EXAM_ID, name: "Kurvendiskussion", completed: false, difficulty: 5, estimatedMinutes: 50, updatedAt: now.toISOString(), deletedAt: null },
  { id: seedId("topic"), examId: MATHE_EXAM_ID, name: "Extremwerte", completed: false, difficulty: 4, estimatedMinutes: 35, updatedAt: now.toISOString(), deletedAt: null },
  { id: seedId("topic"), examId: BIO_EXAM_ID, name: "Genetik", completed: true, difficulty: 3, estimatedMinutes: 25, updatedAt: now.toISOString(), deletedAt: null },
  { id: seedId("topic"), examId: BIO_EXAM_ID, name: "DNA-Replikation", completed: false, difficulty: 4, estimatedMinutes: 40, updatedAt: now.toISOString(), deletedAt: null },
  { id: seedId("topic"), examId: BIO_EXAM_ID, name: "Proteinbiosynthese", completed: false, difficulty: 4, estimatedMinutes: 40, updatedAt: now.toISOString(), deletedAt: null }
];

export const seedSnapshot: AppSnapshot = {
  exams,
  topics,
  studyTasks: exams.flatMap((exam) => generateStudyPlanForExam(exam, topics.filter((topic) => topic.examId === exam.id))),
  learningGroups: [
    {
      id: seedId("group"),
      name: "Lerngruppe Mathe",
      inviteCode: seedInviteCode("MATHE"),
      memberNames: ["Ich", "Lena"],
      examIds: [MATHE_EXAM_ID],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      deletedAt: null
    }
  ],
  materials: [
    {
      id: seedId("mat"),
      examId: MATHE_EXAM_ID,
      type: "note",
      title: "Formelsammlung Analysis",
      content: "Ableitungsregeln, Wendepunkte, Extremwertkriterien.",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      deletedAt: null
    },
    {
      id: seedId("mat"),
      examId: BIO_EXAM_ID,
      type: "video",
      title: "DNA-Replikation erklärt",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      deletedAt: null
    }
  ],
  chats: [],
  memories: [],
  stats: {
    studyTime: 165,
    streak: 3,
    xp: 180,
    level: 2,
    badges: [],
    focusSessions: [],
    lastStudyDate: now.toISOString().slice(0, 10),
    updatedAt: now.toISOString(),
    deletedAt: null,
    xpHistory: [
      { date: new Date(now.getTime() - 2 * 86400000).toISOString().slice(0, 10), xp: 40 },
      { date: new Date(now.getTime() - 86400000).toISOString().slice(0, 10), xp: 65 },
      { date: now.toISOString().slice(0, 10), xp: 75 }
    ]
  },
  settings: {
    theme: "system",
    calendarMode: "month",
    defaultDailyMinutes: 40,
    cloudSyncEnabled: false,
    tutorialCompleted: false,
    language: "de",
    reminders: {
      dailyReminder: true,
      todayLearningReminder: true,
      examReminderOffsets: [7, 3, 1],
      notificationsEnabled: false
    }
  },
  user: null,
  isAuthenticated: false,
  syncStatus: "idle",
  lastSyncedAt: undefined,
  syncError: undefined,
  pendingWriteCount: 0
};
