export type ThemeMode = "light" | "dark" | "system";
export type CalendarMode = "week" | "month";
export type TaskType = "learn" | "review" | "buffer";
export type TaskStatus = "open" | "done" | "missed";
export type MaterialType = "pdf" | "note" | "video";
export type SyncStatus = "idle" | "syncing" | "error" | "success" | "pending_offline";

export interface SyncableEntity {
  userId?: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Exam extends SyncableEntity {
  id: string;
  subject: string;
  date: string;
  time: string;
  room: string;
  notes: string;
  difficulty: number;
  knowledgeLevel: number;
  color: string;
  createdAt: string;
  dailyMinutes: number;
}

export interface Topic extends SyncableEntity {
  id: string;
  examId: string;
  name: string;
  completed: boolean;
  difficulty: number;
  estimatedMinutes: number;
}

export interface StudyTask extends SyncableEntity {
  id: string;
  examId: string;
  topicId?: string;
  date: string;
  task: string;
  duration: number;
  type: TaskType;
  status: TaskStatus;
}

export interface StudyMaterial extends SyncableEntity {
  id: string;
  examId: string;
  type: MaterialType;
  title: string;
  content?: string;
  url?: string;
  fileName?: string;
  createdAt: string;
}

export interface FocusSession extends SyncableEntity {
  id: string;
  startedAt: string;
  minutes: number;
  completed: boolean;
}

export interface UserBadge extends SyncableEntity {
  id: string;
  label: string;
  description: string;
  unlockedAt: string;
}

export interface UserStats extends SyncableEntity {
  studyTime: number;
  streak: number;
  xp: number;
  level: number;
  badges: UserBadge[];
  focusSessions: FocusSession[];
  lastStudyDate?: string;
  xpHistory: Array<{ date: string; xp: number }>;
}

export interface UserProfile {
  id: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
  provider?: string;
  cloudSyncEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderSettings {
  dailyReminder: boolean;
  todayLearningReminder: boolean;
  examReminderOffsets: number[];
  notificationsEnabled: boolean;
}

export interface AppSettings {
  theme: ThemeMode;
  calendarMode: CalendarMode;
  defaultDailyMinutes: number;
  reminders: ReminderSettings;
  cloudSyncEnabled: boolean;
  tutorialCompleted: boolean;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface CoachMessage {
  title: string;
  body: string;
}

export interface AppSnapshot {
  exams: Exam[];
  topics: Topic[];
  studyTasks: StudyTask[];
  materials: StudyMaterial[];
  stats: UserStats;
  settings: AppSettings;
  user: UserProfile | null;
  isAuthenticated: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt?: string;
  syncError?: string;
  pendingOfflineChanges?: boolean;
}

export interface CloudTableRow<T extends object> {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  payload: T;
}
