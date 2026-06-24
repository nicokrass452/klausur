import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { seedSnapshot } from "../data/seed";
import { SUBJECT_COLORS } from "../lib/constants";
import {
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
  pullFromCloud,
  resolveConflicts,
  ensureProfile,
  syncExam,
  syncFocusSession,
  syncStudyMaterial,
  syncStudyTask,
  syncTopic,
  syncUserStats
} from "../services/syncService";
import {
  clearPendingWrites,
  enqueuePendingWrite,
  getCachedSnapshot,
  getLastSyncedAt,
  getPendingWrites,
  removePendingWrite,
  saveCachedSnapshot,
  saveLastSyncedAt
} from "../services/offlineStorageService";
import { generateStudyPlanForExam, redistributeMissedStudyTasks } from "../services/studyPlanGenerator";
import type {
  AppSettings,
  AppSnapshot,
  Exam,
  FocusSession,
  OfflineSnapshot,
  PendingWrite,
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

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

type PendingWriteInput = DistributiveOmit<PendingWrite, "id" | "userId" | "createdAt">;

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
  signUp: (email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  logout: () => Promise<void>;
  syncNow: (retryCount?: number) => Promise<void>;
  enableCloudSync: (enabled: boolean) => Promise<void>;
  completeTutorial: () => void;
  resetTutorial: () => void;
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

function toOfflineSnapshot(snapshot: AppSnapshot): OfflineSnapshot {
  return {
    exams: snapshot.exams,
    topics: snapshot.topics,
    studyTasks: snapshot.studyTasks,
    materials: snapshot.materials,
    stats: snapshot.stats,
    settings: snapshot.settings,
    user: snapshot.user,
    isAuthenticated: snapshot.isAuthenticated,
    lastSyncedAt: snapshot.lastSyncedAt
  };
}

function entityIdForWrite(write: PendingWriteInput, userId: string): string {
  return write.table === "user_stats" ? userId : write.payload.id;
}

function makeWriteId(table: PendingWrite["table"], entityId: string): string {
  return `write-${table}-${entityId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function applyPendingWrite(write: PendingWrite): Promise<void> {
  switch (write.table) {
    case "exams":
      await syncExam(write.payload, write.userId);
      return;
    case "topics":
      await syncTopic(write.payload, write.userId);
      return;
    case "study_tasks":
      await syncStudyTask(write.payload, write.userId);
      return;
    case "study_materials":
      await syncStudyMaterial(write.payload, write.userId);
      return;
    case "focus_sessions":
      await syncFocusSession(write.payload, write.userId);
      return;
    case "user_stats":
      await syncUserStats(write.payload, write.payload.focusSessions, write.payload.badges, write.userId);
      return;
  }
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => {
      const refreshPendingWriteCount = async (userId = get().user?.id) => {
        const pendingWriteCount = userId ? (await getPendingWrites(userId)).length : 0;
        set({ pendingWriteCount });
        return pendingWriteCount;
      };

      const persistCurrentSnapshot = async () => {
        await saveCachedSnapshot(toOfflineSnapshot(get()));
      };

      const enqueueWrite = (write: PendingWriteInput) => {
        const state = get();
        if (!state.user || !state.settings.cloudSyncEnabled) {
          void persistCurrentSnapshot();
          return;
        }

        const pendingWrite: PendingWrite = {
          ...write,
          id: makeWriteId(write.table, entityIdForWrite(write, state.user.id)),
          userId: state.user.id,
          createdAt: nowIso()
        } as PendingWrite;

        set((current) => ({
          pendingWriteCount: current.pendingWriteCount + 1,
          syncStatus: current.isOnline ? "idle" : "queued",
          syncError: current.isOnline ? current.syncError : undefined
        }));

        void enqueuePendingWrite(pendingWrite)
          .then(() => persistCurrentSnapshot())
          .then(() => refreshPendingWriteCount(state.user?.id))
          .then(() => {
            const current = get();
            if (current.isOnline && current.isAuthenticated && current.settings.cloudSyncEnabled && current.syncStatus !== "syncing") {
              void current.syncNow();
            }
          })
          .catch((error) => {
            const message = error instanceof Error ? error.message : "Offline-Aenderung konnte nicht vorgemerkt werden.";
            set({ syncStatus: "error", syncError: message });
          });
      };

      return ({
      ...seedSnapshot,
      hasHydrated: true,
      authReady: false,
      rewardToast: undefined,
      isOnline: typeof navigator === "undefined" ? true : navigator.onLine,

      addExam: (payload) => {
        let queued: PendingWriteInput[] = [];
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
          const addedTasks = tasks.filter((task) => !state.studyTasks.some((entry) => entry.id === task.id));
          queued = [
            { table: "exams", op: "upsert", payload: exam },
            ...addedTasks.map((task) => ({ table: "study_tasks" as const, op: "upsert" as const, payload: task }))
          ];
          return { exams, studyTasks: tasks, syncStatus: state.isOnline ? "idle" : "queued" };
        });
        queued.forEach(enqueueWrite);
      },

      updateExam: (id, patch) => {
        let updated: Exam | undefined;
        set((state) => {
          const exams = state.exams.map((exam) => {
            if (exam.id !== id) return exam;
            updated = touch({ ...exam, ...patch });
            return updated;
          });
          return { exams, syncStatus: state.isOnline ? "idle" : "queued" };
        });
        if (updated) enqueueWrite({ table: "exams", op: "upsert", payload: updated });
      },

      removeExam: (id) => {
        let queued: PendingWriteInput[] = [];
        set((state) => {
          const deletedAt = nowIso();
          const exams = state.exams.map((exam) => (exam.id === id ? { ...exam, deletedAt, updatedAt: deletedAt } : exam));
          const topics = state.topics.map((topic) => (topic.examId === id ? { ...topic, deletedAt, updatedAt: deletedAt } : topic));
          const studyTasks = state.studyTasks.map((task) => (task.examId === id ? { ...task, deletedAt, updatedAt: deletedAt } : task));
          const materials = state.materials.map((material) => (material.examId === id ? { ...material, deletedAt, updatedAt: deletedAt } : material));
          queued = [
            ...exams.filter((exam) => exam.id === id).map((exam) => ({ table: "exams" as const, op: "upsert" as const, payload: exam })),
            ...topics.filter((topic) => topic.examId === id).map((topic) => ({ table: "topics" as const, op: "upsert" as const, payload: topic })),
            ...studyTasks.filter((task) => task.examId === id).map((task) => ({ table: "study_tasks" as const, op: "upsert" as const, payload: task })),
            ...materials.filter((material) => material.examId === id).map((material) => ({ table: "study_materials" as const, op: "upsert" as const, payload: material }))
          ];
          return {
            exams,
            topics,
            studyTasks,
            materials,
            syncStatus: state.isOnline ? "idle" : "queued"
          };
        });
        queued.forEach(enqueueWrite);
      },

      addTopic: (payload) => {
        let queued: PendingWriteInput[] = [];
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
          if (!exam) {
            queued = [{ table: "topics", op: "upsert", payload: topic }];
            return { topics, syncStatus: state.isOnline ? "idle" : "queued" };
          }
          const previousTasks = state.studyTasks;
          const studyTasks = [
            ...state.studyTasks.filter((task) => task.examId !== payload.examId || task.status === "done"),
            ...generateStudyPlanForExam(exam, topics.filter((entry) => entry.examId === payload.examId && !entry.deletedAt))
          ];
          queued = [
            { table: "topics", op: "upsert", payload: topic },
            ...studyTasks
              .filter((task) => !previousTasks.some((entry) => entry.id === task.id && entry.updatedAt === task.updatedAt))
              .map((task) => ({ table: "study_tasks" as const, op: "upsert" as const, payload: task }))
          ];
          return { topics, studyTasks, syncStatus: state.isOnline ? "idle" : "queued" };
        });
        queued.forEach(enqueueWrite);
      },

      updateTopic: (id, patch) => {
        let updated: Topic | undefined;
        set((state) => {
          const topics = state.topics.map((topic) => {
            if (topic.id !== id) return topic;
            updated = touch({ ...topic, ...patch });
            return updated;
          });
          return { topics, syncStatus: state.isOnline ? "idle" : "queued" };
        });
        if (updated) enqueueWrite({ table: "topics", op: "upsert", payload: updated });
      },

      toggleTopic: (id) => {
        let updatedTopic: Topic | undefined;
        let updatedStats: UserStats | undefined;
        set((state) => {
          const topics = state.topics.map((topic) => (topic.id === id ? touch({ ...topic, completed: !topic.completed }) : topic));
          updatedTopic = topics.find((topic) => topic.id === id);
          const stats = withBadges(state.exams, state.studyTasks, awardXp(state.stats, 8));
          updatedStats = stats;
          return {
            topics,
            stats,
            syncStatus: state.isOnline ? "idle" : "queued",
            rewardToast: { amount: 8, reason: "Thema erledigt", at: Date.now() }
          };
        });
        if (updatedTopic) enqueueWrite({ table: "topics", op: "upsert", payload: updatedTopic });
        if (updatedStats) enqueueWrite({ table: "user_stats", op: "upsert", payload: updatedStats });
      },

      addMaterial: (payload) => {
        const id = makeId("material");
        let material: StudyMaterial | undefined;
        set((state) => ({
          materials: [
            ...state.materials,
            (material = { ...payload, id, createdAt: nowIso(), updatedAt: nowIso(), deletedAt: null, userId: state.user?.id })
          ],
          syncStatus: state.isOnline ? "idle" : "queued"
        }));
        if (material) enqueueWrite({ table: "study_materials", op: "upsert", payload: material });
        return id;
      },

      setTaskStatus: (id, status) => {
        let updatedTask: StudyTask | undefined;
        let updatedStats: UserStats | undefined;
        set((state) => {
          const target = state.studyTasks.find((task) => task.id === id);
          const wasDone = target?.status === "done";
          const studyTasks = state.studyTasks.map((task) => {
            if (task.id !== id) return task;
            updatedTask = touch({ ...task, status });
            return updatedTask;
          });
          if (!target || status !== "done" || wasDone) return { studyTasks, syncStatus: state.isOnline ? "idle" : "queued" };
          const reward = xpForTask(target.duration, target.type);
          const stats = withBadges(state.exams, studyTasks, awardXp(state.stats, reward));
          updatedStats = stats;
          return {
            studyTasks,
            stats,
            syncStatus: state.isOnline ? "idle" : "queued",
            rewardToast: { amount: reward, reason: "Lernaufgabe abgeschlossen", at: Date.now() }
          };
        });
        if (updatedTask) enqueueWrite({ table: "study_tasks", op: "upsert", payload: updatedTask });
        if (updatedStats) enqueueWrite({ table: "user_stats", op: "upsert", payload: updatedStats });
      },

      regenerateStudyPlan: (examId) => {
        let queued: PendingWriteInput[] = [];
        set((state) => {
          const exams = filterActive(examId ? state.exams.filter((exam) => exam.id === examId) : state.exams);
          const regenerated = exams.flatMap((exam) =>
            generateStudyPlanForExam(exam, state.topics.filter((topic) => topic.examId === exam.id && !topic.deletedAt))
              .map((task) => ({ ...task, userId: state.user?.id, updatedAt: nowIso(), deletedAt: null }))
          );
          const preserved = state.studyTasks.filter((task) => task.status === "done" || (examId ? task.examId !== examId : false));
          queued = regenerated.map((task) => ({ table: "study_tasks" as const, op: "upsert" as const, payload: task }));
          return { studyTasks: [...preserved, ...regenerated], syncStatus: state.isOnline ? "idle" : "queued" };
        });
        queued.forEach(enqueueWrite);
      },

      redistributeMissed: () => {
        let tasks: StudyTask[] = [];
        set((state) => {
          tasks = redistributeMissedStudyTasks(
            state.studyTasks,
            new Map(filterActive(state.exams).map((exam) => [exam.id, exam]))
          ).map((task) => touch(task));
          return {
            studyTasks: tasks,
            syncStatus: state.isOnline ? "idle" : "queued"
          };
        });
        tasks.forEach((task) => enqueueWrite({ table: "study_tasks", op: "upsert", payload: task }));
      },

      addFocusSession: (minutes, completed = true) => {
        let queuedSession: FocusSession | undefined;
        let queuedStats: UserStats | undefined;
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
          queuedSession = session;
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
          queuedStats = stats;
          return {
            stats,
            syncStatus: state.isOnline ? "idle" : "queued",
            rewardToast: { amount: reward, reason: "Fokus-Session", at: Date.now() }
          };
        });
        if (queuedSession) enqueueWrite({ table: "focus_sessions", op: "upsert", payload: queuedSession });
        if (queuedStats) enqueueWrite({ table: "user_stats", op: "upsert", payload: queuedStats });
      },

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
      setOnlineStatus: (isOnline) => {
        const wasOnline = get().isOnline;
        set((state) => ({
          isOnline,
          syncStatus: !isOnline && state.pendingWriteCount > 0 ? "queued" : state.syncStatus
        }));
        const state = get();
        if (!wasOnline && isOnline && state.isAuthenticated && state.settings.cloudSyncEnabled && state.pendingWriteCount > 0 && state.syncStatus !== "syncing") {
          void state.syncNow();
        }
      },
      setAuthReady: (authReady) => set({ authReady }),
      setAuthSession: (user) => {
        set((state) => ({
          authReady: true,
          user,
          isAuthenticated: Boolean(user),
          settings: {
            ...state.settings,
            cloudSyncEnabled: Boolean(user)
          }
        }));
        void refreshPendingWriteCount(user?.id).then(() => {
          const current = get();
          if (current.isOnline && current.isAuthenticated && current.settings.cloudSyncEnabled && current.pendingWriteCount > 0 && current.syncStatus !== "syncing") {
            void current.syncNow();
          }
        });
      },

      login: async (provider = "google", email, password) => {
        if (provider === "email") {
          if (!email || !password) throw new Error("E-Mail und Passwort sind erforderlich.");
          await signInWithEmail(email, password);
          return;
        }
        await signInWithGoogle();
      },

      signUp: async (email, password) => {
        if (!email || !password) throw new Error("E-Mail und Passwort sind erforderlich.");
        return signUpWithEmail(email, password);
      },

      logout: async () => {
        const current = get();
        if (current.pendingWriteCount > 0 && !current.isOnline) {
          set({
            syncStatus: "queued",
            syncError: "Du hast noch Offline-Aenderungen. Verbinde dich kurz mit dem Internet, bevor du dich abmeldest."
          });
          return;
        }
        if (current.pendingWriteCount > 0) {
          await current.syncNow();
        }
        const userId = get().user?.id;
        try {
          await signOut();
        } catch {
          // Still clear local auth if remote sign-out fails.
        }
        if (userId) await clearPendingWrites(userId);
        set({
          user: null,
          isAuthenticated: false,
          authReady: true,
          syncStatus: "idle",
          lastSyncedAt: undefined,
          syncError: undefined,
          pendingWriteCount: 0,
          settings: { ...get().settings, cloudSyncEnabled: false }
        });
      },

      syncNow: async (retryCount = 0) => {
        const state = get();
        if (!state.user || !state.isAuthenticated) throw new Error("Nicht eingeloggt.");
        if (!state.settings.cloudSyncEnabled) throw new Error("Cloud Sync ist deaktiviert.");
        if (!get().isOnline) {
          set({ syncStatus: "queued", syncError: undefined });
          await persistCurrentSnapshot();
          return;
        }

        set({ syncStatus: "syncing", syncError: undefined });

        try {
          const profile = await ensureProfile(state.user);
          const pendingWrites = await getPendingWrites(profile.id);
          for (const write of pendingWrites) {
            await applyPendingWrite(write);
            await removePendingWrite(write.id);
          }
          await refreshPendingWriteCount(profile.id);

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
          const lastSyncedAt = nowIso();

          set({
            user: cloud.user ?? profile,
            exams,
            topics,
            studyTasks,
            materials,
            stats,
            syncStatus: "success",
            lastSyncedAt,
            syncError: undefined,
            pendingWriteCount: 0
          });
          await saveLastSyncedAt(lastSyncedAt);
          await saveCachedSnapshot(toOfflineSnapshot(get()));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unbekannter Sync-Fehler";
          const pendingWriteCount = state.user ? await refreshPendingWriteCount(state.user.id) : get().pendingWriteCount;
          set({ syncStatus: pendingWriteCount > 0 ? "queued" : "error", syncError: message });
          const isConfigError = message.toLowerCase().includes("api-key") || message.toLowerCase().includes("api key");
          if (isConfigError || retryCount >= 2) return;
          await new Promise((resolve) => window.setTimeout(resolve, 1200 * (retryCount + 1)));
          await get().syncNow(retryCount + 1);
        }
      },

      enableCloudSync: async (enabled) => {
        const userId = get().user?.id;
        set((state) => ({
          settings: { ...state.settings, cloudSyncEnabled: enabled },
          syncStatus: enabled ? state.syncStatus : "idle"
        }));
        if (!enabled) {
          if (userId) await clearPendingWrites(userId);
          set({ pendingWriteCount: 0, syncError: undefined });
          await persistCurrentSnapshot();
          return;
        }
        if (!get().user) return;
        await refreshPendingWriteCount(get().user?.id);
        const profile = await ensureProfile({ ...get().user!, cloudSyncEnabled: enabled, updatedAt: nowIso() });
        set({ user: profile });
        await get().syncNow();
      },

      completeTutorial: () =>
        set((state) => ({
          settings: { ...state.settings, tutorialCompleted: true }
        })),

      resetTutorial: () =>
        set((state) => ({
          settings: { ...state.settings, tutorialCompleted: false }
        }))
      });
    },
    {
      name: "klausurplaner-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        exams: state.exams,
        topics: state.topics,
        studyTasks: state.studyTasks,
        materials: state.materials,
        stats: state.stats,
        settings: state.settings
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.settings.tutorialCompleted === undefined) {
            state.settings.tutorialCompleted = false;
          }
          // Never trust cached auth — always re-validate with Supabase on startup.
          state.user = null;
          state.isAuthenticated = false;
          state.authReady = false;
          state.hasHydrated = true;
        }
        state?.syncBadges();
        void Promise.all([getCachedSnapshot(), getLastSyncedAt()]).then(async ([snapshot, lastSyncedAt]) => {
          if (snapshot) {
            useAppStore.setState((current) => ({
              ...snapshot,
              authReady: current.authReady,
              hasHydrated: current.hasHydrated,
              rewardToast: current.rewardToast,
              isOnline: current.isOnline,
              syncStatus: current.syncStatus,
              syncError: current.syncError,
              pendingWriteCount: current.pendingWriteCount,
              lastSyncedAt: lastSyncedAt ?? snapshot.lastSyncedAt
            }));
          } else if (lastSyncedAt) {
            useAppStore.setState({ lastSyncedAt });
          }
          const userId = useAppStore.getState().user?.id;
          useAppStore.setState({ pendingWriteCount: userId ? (await getPendingWrites(userId)).length : 0 });
        });
      }
    }
  )
);

export function selectExamProgress(examId: string): (state: AppStore) => number {
  return (state) => getExamProgress(examId, filterActive(state.topics).filter((topic) => topic.examId === examId));
}
