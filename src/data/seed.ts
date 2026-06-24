import { SUBJECT_COLORS } from "../lib/constants";
import { generateStudyPlanForExam } from "../services/studyPlanGenerator";
import type { AppSnapshot, Exam, Topic } from "../types";

const now = new Date();
const nextExamDate = new Date(now);
nextExamDate.setDate(now.getDate() + 8);

const secondExamDate = new Date(now);
secondExamDate.setDate(now.getDate() + 16);

const exams: Exam[] = [
  {
    id: "exam-mathe",
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
    id: "exam-bio",
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
  { id: "topic-m1", examId: "exam-mathe", name: "Ableitungen", completed: false, difficulty: 4, estimatedMinutes: 45, updatedAt: now.toISOString(), deletedAt: null },
  { id: "topic-m2", examId: "exam-mathe", name: "Kurvendiskussion", completed: false, difficulty: 5, estimatedMinutes: 50, updatedAt: now.toISOString(), deletedAt: null },
  { id: "topic-m3", examId: "exam-mathe", name: "Extremwerte", completed: false, difficulty: 4, estimatedMinutes: 35, updatedAt: now.toISOString(), deletedAt: null },
  { id: "topic-b1", examId: "exam-bio", name: "Genetik", completed: true, difficulty: 3, estimatedMinutes: 25, updatedAt: now.toISOString(), deletedAt: null },
  { id: "topic-b2", examId: "exam-bio", name: "DNA-Replikation", completed: false, difficulty: 4, estimatedMinutes: 40, updatedAt: now.toISOString(), deletedAt: null },
  { id: "topic-b3", examId: "exam-bio", name: "Proteinbiosynthese", completed: false, difficulty: 4, estimatedMinutes: 40, updatedAt: now.toISOString(), deletedAt: null }
];

export const seedSnapshot: AppSnapshot = {
  exams,
  topics,
  studyTasks: exams.flatMap((exam) => generateStudyPlanForExam(exam, topics.filter((topic) => topic.examId === exam.id))),
  materials: [
    {
      id: "mat-note-mathe",
      examId: "exam-mathe",
      type: "note",
      title: "Formelsammlung Analysis",
      content: "Ableitungsregeln, Wendepunkte, Extremwertkriterien.",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      deletedAt: null
    },
    {
      id: "mat-video-bio",
      examId: "exam-bio",
      type: "video",
      title: "DNA-Replikation erklärt",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      deletedAt: null
    }
  ],
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
