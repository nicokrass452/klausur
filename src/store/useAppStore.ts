import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { seedSnapshot } from "../data/seed";
import { SUBJECT_COLORS } from "../lib/constants";
import { signInWithEmail, signInWithGoogle, signOut, pullFromCloud, pushToCloud, resolveConflicts, ensureProfile } from "../services/syncService";
import { generateStudyPlanForExam, redistributeMissedStudyTasks } from "../services/studyPlanGenerator";
import type {
  AppSettings,
  AppSnapshot,
  Exam,
  FocusSession,
  StudyMaterial,
  StudyTask,
  SyncStatus,
  Topic,
  UserProfile,
  UserStats
} from "../types";
import { toIsoDate } from "../utils/dateUtils";
import { getExamProgress } from "../utils/examUtils";
import { calculateLevel, resolveBadges, xpForFocusSession, xpForTask } from "../utils/gamification";

interface RewardToast {
  amount: number;
  reason: string;
  at: number;
}

interface AppStore extends AppSnapshot {
  hasHydrated: boolean;
  authReady: boolean;
  rewardToast?: RewardToast;
  isOnline: boolean;
  addExam: (payload: Omit<Exam, "id" | "createdAt" | "color" | "updatedAt" | "deletedAt" | "userId"> & { color?: string }) => void;
  updateExam: (id: string, patch: Partial<Exam>) => void;
  removeExam: (id: string) => void;
  addTopic: (payload: Omit<Topic, "id" | "completed" | "updatedAt" | "deletedAt" | "userId">) => void;
  updateTopic: (id: string, patch: Partial<Topic>) => void;
  toggleTopic: (id: string) => void;
  addMaterial: (payload: Omit<StudyMaterial, "id" | "createdAt" | "updatedAt" | "deletedAt" | "userId">) => string;
  setTaskStatus: (id: string, status: StudyTask["status"]) => void;
  regenerateStudyPlan: (examId?: string) => void;
  redistributeMissed: () => void;
  addFocusSession: (minutes: number, completed?: boolean) => void;
  setTheme: (theme: AppSettings["theme"]) => void;
  setCalendarMode: (mode: AppSettings["calendarMode"]) => void;
  updateReminderSettings: (patch: Partial<AppSettings["reminders"]>) => void;
  setDefaultDailyMinutes: (minutes: number) => void;
  clearRewardToast: () => void;
  syncBadges: () => void;
  setOnlineStatus: (online: boolean) => void;
  setAuthReady: (ready: boolean) => void;
  setAuthSession: (user: UserProfile | null) => void;
  login: (provider?: "google" | "email", email?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  syncNow: (retryCount?: number) => Promise<void>;
  enableCloudSync: (enabled: boolean) => Promise<void>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function touch<T extends { updatedAt: string }>(item: T): T {
  return { ...item, updatedAt: nowIso() };
}

function awardXp(stats: UserStats, amount: number): UserStats {
  const today = toIsoDate(new Date());
  const lastStudyDate = stats.lastStudyDate;
  let nextStreak = stats.streak;

  if (lastStudyDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    nextStreak = lastStudyDate === toIsoDate(yesterday) ? stats.streak + 1 : 1;
  }

  const nextXp = stats.xp + amount;
  const nextHistory = [...stats.xpHistory];
  const existingEntry = nextHistory.find((entry) => entry.date === today);
  if (existingEntry) existingEntry.xp += amount;
  else nextHistory.push({ date: today, xp: amount });

  return {
    ...stats,
    xp: nextXp,
    level: calculateLevel(nextXp),
    streak: nextStreak,
    studyTime: stats.studyTime + Math.max(1, Math.round(amount / 2)),
    lastStudyDate: today,
    updatedAt: nowIso(),
    xpHistory: nextHistory
  };
}

function withBadges(exams: Exam[], studyTasks: StudyTask[], stats: UserStats): UserStats {
  return {
    ...stats,
    badges: resolveBadges(stats, exams.filter((item) => !item.deletedAt), studyTasks.filter((item) => !item.deletedAt))
  };
}

function filterActive<T extends { deletedAt?: string | null }>(items: T[]): T[] {
  return items.filter((item) => !item.deletedAt);
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...seedSnapshot,
      hasHydrated: true,
      authReady: false,
      rewardToast: undefined,
      isOnline: typeof navigator === "undefined" ? true : navigator.onLine,

      addExam: (payload) =>
        set((state) => {
          const exam: Exam = {
            ...payload,
            id: makeId("exam"),
            createdAt: nowIso(),
            updatedAt: nowIso(),
            deletedAt: null,
            userId: state.user?.id,
            color: payload.color ?? SUBJECT_COLORS[filterActive(state.exams).length % SUBJECT_COLORS.length]
          };
          const exams = [...state.exams, exam];
          const tasks = [...state.studyTasks, ...generateStudyPlanForExam(exam, [])];
          return { exams, studyTasks: tasks, syncStatus: "idle" };
        }),

      updateExam: (id, patch) =>
        set((state) => ({
          exams: state.exams.map((exam) => (exam.id === id ? touch({ ...exam, ...patch }) : exam)),
          syncStatus: "idle"
        })),

      removeExam: (id) =>
        set((state) => {
          const deletedAt = nowIso();
          return {
            exams: state.exams.map((exam) => (exam.id === id ? { ...exam, deletedAt, updatedAt: deletedAt } : exam)),
            topics: state.topics.map((topic) => (topic.examId === id ? { ...topic, deletedAt, updatedAt: deletedAt } : topic)),
            studyTasks: state.studyTasks.map((task) => (task.examId === id ? { ...task, deletedAt, updatedAt: deletedAt } : task)),
            materials: state.materials.map((material) => (material.examId === id ? { ...material, deletedAt, updatedAt: deletedAt } : material)),
            syncStatus: "idle"
          };
        }),

      addTopic: (payload) =>
        set((state) => {
          const topic: Topic = {
            ...payload,
            id: makeId("topic"),
            completed: false,
            updatedAt: nowIso(),
            deletedAt: null,
            userId: state.user?.id
          };
          const topics = [...state.topics, topic];
          const exam = state.exams.find((entry) => entry.id === payload.examId);
          if (!exam) return { topics, syncStatus: "idle" };
          const studyTasks = [
            ...state.studyTasks.filter((task) => task.examId !== payload.examId || task.status === "done"),
            ...generateStudyPlanForExam(exam, topics.filter((entry) => entry.examId === payload.examId && !entry.deletedAt))
          ];
          return { topics, studyTasks, syncStatus: "idle" };
        }),

      updateTopic: (id, patch) =>
        set((state) => ({
          topics: state.topics.map((topic) => (topic.id === id ? touch({ ...topic, ...patch }) : topic)),
          syncStatus: "idle"
        })),

      toggleTopic: (id) =>
        set((state) => {
          const topics = state.topics.map((topic) => (topic.id === id ? touch({ ...topic, completed: !topic.completed }) : topic));
          const stats = withBadges(state.exams, state.studyTasks, awardXp(state.stats, 8));
          return {
            topics,
            stats,
            syncStatus: "idle",
            rewardToast: { amount: 8, reason: "Thema erledigt", at: Date.now() }
          };
        }),

      addMaterial: (payload) => {
        const id = makeId("material");
        set((state) => ({
          materials: [
            ...state.materials,
            { ...payload, id, createdAt: nowIso(), updatedAt: nowIso(), deletedAt: null, userId: state.user?.id }
          ],
          syncStatus: "idle"
        }));
        return id;
      },

      setTaskStatus: (id, status) =>
        set((state) => {
          const target = state.studyTasks.find((task) => task.id === id);
          const wasDone = target?.status === "done";
          const studyTasks = state.studyTasks.map((task) => (task.id === id ? touch({ ...task, status }) : task));
          if (!target || status !== "done" || wasDone) return { studyTasks, syncStatus: "idle" };
          const reward = xpForTask(target.duration, target.type);
          const stats = withBadges(state.exams, studyTasks, awardXp(state.stats, reward));
          return {
            studyTasks,
            stats,
            syncStatus: "idle",
            rewardToast: { amount: reward, reason: "Lernaufgabe abgeschlossen", at: Date.now() }
          };
        }),

      regenerateStudyPlan: (examId) =>
        set((state) => {
          const exams = filterActive(examId ? state.exams.filter((exam) => exam.id === examId) : state.exams);
          const regenerated = exams.flatMap((exam) =>
            generateStudyPlanForExam(exam, state.topics.filter((topic) => topic.examId === exam.id && !topic.deletedAt))
              .map((task) => ({ ...task, userId: state.user?.id, updatedAt: nowIso(), deletedAt: null }))
          );
          const preserved = state.studyTasks.filter((task) => task.status === "done" || (examId ? task.examId !== examId : false));
          return { studyTasks: [...preserved, ...regenerated], syncStatus: "idle" };
        }),

      redistributeMissed: () =>
        set((state) => ({
          studyTasks: redistributeMissedStudyTasks(
            state.studyTasks,
            new Map(filterActive(state.exams).map((exam) => [exam.id, exam]))
          ).map((task) => touch(task)),
          syncStatus: "idle"
        })),

      addFocusSession: (minutes, completed = true) =>
        set((state) => {
          const session: FocusSession = {
            id: makeId("focus"),
            startedAt: nowIso(),
            minutes,
            completed,
            userId: state.user?.id,
            updatedAt: nowIso(),
            deletedAt: null
          };
          const reward = xpForFocusSession(minutes);
          const stats = withBadges(
            state.exams,
            state.studyTasks,
            awardXp(
              {
                ...state.stats,
                focusSessions: [...state.stats.focusSessions, session],
                updatedAt: nowIso()
              },
              reward
            )
          );
          return {
            stats,
            syncStatus: "idle",
            rewardToast: { amount: reward, reason: "Fokus-Session", at: Date.now() }
          };
        }),

      setTheme: (theme) => set((state) => ({ settings: { ...state.settings, theme } })),
      setCalendarMode: (calendarMode) => set((state) => ({ settings: { ...state.settings, calendarMode } })),
      updateReminderSettings: (patch) =>
        set((state) => ({
          settings: { ...state.settings, reminders: { ...state.settings.reminders, ...patch } }
        })),
      setDefaultDailyMinutes: (defaultDailyMinutes) =>
        set((state) => ({ settings: { ...state.settings, defaultDailyMinutes } })),
      clearRewardToast: () => set({ rewardToast: undefined }),
      syncBadges: () => set((state) => ({ stats: withBadges(state.exams, state.studyTasks, state.stats) })),
      setOnlineStatus: (isOnline) => set({ isOnline }),
      setAuthReady: (authReady) => set({ authReady }),
      setAuthSession: (user) =>
        set((state) => ({
          authReady: true,
          user,
          isAuthenticated: Boolean(user),
          settings: {
            ...state.settings,
            cloudSyncEnabled: user ? state.settings.cloudSyncEnabled : false
          }
        })),

      login: async (provider = "google", email, password) => {
        if (provider === "email") {
          if (!email || !password) throw new Error("E-Mail und Passwort sind erforderlich.");
          await signInWithEmail(email, password);
          return;
        }
        await signInWithGoogle();
      },

      logout: async () => {
        await signOut();
        set({
          user: null,
          isAuthenticated: false,
          syncStatus: "idle",
          lastSyncedAt: undefined,
          syncError: undefined,
          settings: { ...get().settings, cloudSyncEnabled: false }
        });
      },

      syncNow: async (retryCount = 0) => {
        const state = get();
        if (!state.user || !state.isAuthenticated) throw new Error("Nicht eingeloggt.");
        if (!state.settings.cloudSyncEnabled) throw new Error("Cloud Sync ist deaktiviert.");
        if (!get().isOnline) {
          set({ syncStatus: "error", syncError: "Offline. Sync wird fortgesetzt, sobald eine Verbindung besteht." });
          return;
        }

        set({ syncStatus: "syncing", syncError: undefined });

        try {
          const profile = await ensureProfile(state.user);
          const snapshot = { ...get(), user: profile };
          await pushToCloud(snapshot);
          const cloud = await pullFromCloud(profile.id);

          const exams = resolveConflicts(get().exams, cloud.exams);
          const topics = resolveConflicts(get().topics, cloud.topics);
          const studyTasks = resolveConflicts(get().studyTasks, cloud.studyTasks);
          const materials = resolveConflicts(get().materials, cloud.materials);
          const focusSessions = resolveConflicts(get().stats.focusSessions, cloud.focusSessions);
          const badges = resolveConflicts(get().stats.badges, cloud.badges);
          const statsBase =
            !cloud.stats || new Date(get().stats.updatedAt).getTime() >= new Date(cloud.stats.updatedAt).getTime()
              ? get().stats
              : cloud.stats;
          const stats = withBadges(exams, studyTasks, { ...statsBase, focusSessions, badges });

          set({
            user: cloud.user ?? profile,
            exams,
            topics,
            studyTasks,
            materials,
            stats,
            syncStatus: "success",
            lastSyncedAt: nowIso(),
            syncError: undefined
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unbekannter Sync-Fehler";
          set({ syncStatus: "error", syncError: message });
          if (retryCount < 2) {
            await new Promise((resolve) => window.setTimeout(resolve, 1200 * (retryCount + 1)));
            await get().syncNow(retryCount + 1);
          }
        }
      },

      enableCloudSync: async (enabled) => {
        set((state) => ({
          settings: { ...state.settings, cloudSyncEnabled: enabled },
          syncStatus: enabled ? state.syncStatus : "idle"
        }));
        if (!enabled || !get().user) return;
        const profile = await ensureProfile({ ...get().user!, cloudSyncEnabled: enabled, updatedAt: nowIso() });
        set({ user: profile });
        await get().syncNow();
      }
    }),
    {
      name: "klausurplaner-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        exams: state.exams,
        topics: state.topics,
        studyTasks: state.studyTasks,
        materials: state.materials,
        stats: state.stats,
        settings: state.settings,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        syncStatus: state.syncStatus,
        lastSyncedAt: state.lastSyncedAt,
        syncError: state.syncError
      }),
      onRehydrateStorage: () => (state) => {
        state?.syncBadges();
        if (state) state.hasHydrated = true;
      }
    }
  )
);

export function selectExamProgress(examId: string): (state: AppStore) => number {
  return (state) => getExamProgress(examId, filterActive(state.topics).filter((topic) => topic.examId === examId));
}
