import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { seedSnapshot } from "../data/seed";
import { SUBJECT_COLORS } from "../lib/constants";
import type { AuthMode } from "../types";
import {
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
  pullFromCloud,
  ensureProfile,
  syncExam,
  syncFocusSession,
  syncStudyMaterial,
  syncStudyTask,
  syncTopic,
  syncUserStats,
  getSession
} from "../services/syncService";
import {
  clearPendingWrites,
  enqueuePendingWrite,
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
  UserStats,
  User,
  UserProfile
} from "../types";
import { toIsoDate } from "../utils/dateUtils";
import { getExamProgress } from "../utils/examUtils";
import { calculateLevel, resolveBadges, xpForFocusSession, xpForTask } from "../utils/gamification";
import {
  getOfflineAuth,
  getOfflineGrant,
  revalidateGrantOnline,
  clearOfflineGrant,
  getOfflineSnapshot,
  registerDevice,
  storeEncryptedCache,
  verifyOfflineGrant
} from "../lib/deviceAuth";
import { encryptCache } from "../lib/cacheEncryption";
import { OFFLINE_READONLY_ENABLED } from "../lib/offlineFeatureFlag";

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
  // Offline read-only mode fields
  authMode: AuthMode;
  grantHash?: string;
  deviceSessionId?: string;

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
  enableOfflineReadOnlyAccess: () => Promise<void>;
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

/**
 * Guard mutation - throws if in offline read-only mode
 */
function requireMutation(state: AppStore): void {
  if (state.authMode === 'offline-readonly') {
    throw new Error('Cannot modify data in offline read-only mode');
  }
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
        const snapshot = toOfflineSnapshot(get());
        if (!OFFLINE_READONLY_ENABLED) {
          await saveCachedSnapshot(snapshot);
          return;
        }

        const stored = await getOfflineGrant();
        if (stored?.grant) {
          const encrypted = await encryptCache(snapshot, stored.grant);
          await storeEncryptedCache(encrypted);
        }
      };

      const enqueueWrite = (write: PendingWriteInput) => {
        const state = get();
        if (!state.user || !state.settings.cloudSyncEnabled || state.authMode === 'offline-readonly') {
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
      authMode: 'signed-out',

      addExam: (payload) => {
        requireMutation(get());
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
            { table: "exams" as const, op: "upsert" as const, payload: exam },
            ...addedTasks.map((task) => ({ table: "study_tasks" as const, op: "upsert" as const, payload: task }))
          ];
          return { exams, studyTasks: tasks, syncStatus: state.isOnline ? "idle" : "queued" };
        });
        queued.forEach(enqueueWrite);
      },

      updateExam: (id, patch) => {
        requireMutation(get());
        let updated: Exam | undefined;
        set((state) => {
          const exams = state.exams.map((exam) => {
            if (exam.id !== id) return exam;
            updated = touch({ ...exam, ...patch });
            return updated;
          });
          return { exams, syncStatus: state.isOnline ? "idle" : "queued" };
        });
        if (updated) enqueueWrite({ table: "exams" as const, op: "upsert" as const, payload: updated });
      },

      removeExam: (id) => {
        requireMutation(get());
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
        requireMutation(get());
        let queued: PendingWriteInput | undefined;
        set((state) => {
          const topic: Topic = {
            ...payload,
            id: makeId("topic"),
            completed: false,
            updatedAt: nowIso(),
            deletedAt: null,
            userId: state.user?.id
          };
          queued = { table: "topics" as const, op: "upsert" as const, payload: topic };
          return { topics: [...state.topics, topic], syncStatus: state.isOnline ? "idle" : "queued" };
        });
        if (queued) enqueueWrite(queued);
      },

      updateTopic: (id, patch) => {
        requireMutation(get());
        let updated: Topic | undefined;
        set((state) => {
          const topics = state.topics.map((topic) => {
            if (topic.id !== id) return topic;
            updated = touch({ ...topic, ...patch });
            return updated;
          });
          return { topics, syncStatus: state.isOnline ? "idle" : "queued" };
        });
        if (updated) enqueueWrite({ table: "topics" as const, op: "upsert" as const, payload: updated });
      },

      toggleTopic: (id) => {
        requireMutation(get());
        let updated: Topic | undefined;
        set((state) => {
          const topics = state.topics.map((topic) => {
            if (topic.id !== id) return topic;
            updated = touch({ ...topic, completed: !topic.completed });
            return updated;
          });
          return { topics, syncStatus: state.isOnline ? "idle" : "queued" };
        });
        if (updated) enqueueWrite({ table: "topics" as const, op: "upsert" as const, payload: updated });
      },

      addMaterial: (payload) => {
        requireMutation(get());
        let queued: PendingWriteInput | undefined;
        let materialId = "";
        set((state) => {
          const material: StudyMaterial = {
            ...payload,
            id: makeId("material"),
            createdAt: nowIso(),
            updatedAt: nowIso(),
            deletedAt: null,
            userId: state.user?.id
          };
          materialId = material.id;
          queued = { table: "study_materials" as const, op: "upsert" as const, payload: material };
          return { materials: [...state.materials, material], syncStatus: state.isOnline ? "idle" : "queued" };
        });
        if (queued) enqueueWrite(queued);
        return materialId;
      },

      setTaskStatus: (id, status) => {
        requireMutation(get());
        let updated: StudyTask | undefined;
        set((state) => {
          const studyTasks = state.studyTasks.map((task) => {
            if (task.id !== id) return task;
            updated = touch({ ...task, status });
            return updated;
          });
          return { studyTasks, syncStatus: state.isOnline ? "idle" : "queued" };
        });
        if (updated) {
          enqueueWrite({ table: "study_tasks" as const, op: "upsert" as const, payload: updated });
          if (status === "done") {
            const stats = get().stats;
            const updatedStats = awardXp(stats, xpForTask(updated.duration, updated.type));
            set({ stats: withBadges(get().exams, get().studyTasks, updatedStats) });
            enqueueWrite({ table: "user_stats" as const, op: "upsert" as const, payload: updatedStats });
          }
        }
      },

      regenerateStudyPlan: (examId) => {
        requireMutation(get());
        let queued: PendingWriteInput[] = [];
        set((state) => {
          const targetExam = examId ? state.exams.find((e) => e.id === examId) : state.exams.find((e) => !e.deletedAt);
          if (!targetExam) return state;
          const examTopics = state.topics.filter((topic) => topic.examId === targetExam.id && !topic.deletedAt);
          const newTasks = generateStudyPlanForExam(targetExam, examTopics);
          const removedIds = state.studyTasks.filter((t) => t.examId === targetExam.id).map((t) => t.id);
          const removed = state.studyTasks.filter((t) => removedIds.includes(t.id));
          const addedTasks = newTasks.filter((t) => !state.studyTasks.some((entry) => entry.id === t.id));
          queued = [
            ...removed.map((task) => ({ table: "study_tasks" as const, op: "upsert" as const, payload: { ...task, deletedAt: nowIso(), updatedAt: nowIso() } })),
            ...addedTasks.map((task) => ({ table: "study_tasks" as const, op: "upsert" as const, payload: task }))
          ];
          return { studyTasks: [...state.studyTasks.filter((t) => t.examId !== targetExam.id), ...newTasks], syncStatus: state.isOnline ? "idle" : "queued" };
        });
        queued.forEach(enqueueWrite);
      },

      redistributeMissed: () => {
        requireMutation(get());
        let queued: PendingWriteInput[] = [];
        set((state) => {
          const today = toIsoDate(new Date());
          const todayTasks = state.studyTasks.filter((t) => t.date === today && !t.deletedAt && t.status === "open");
          const nextDays = [...new Set(state.studyTasks.filter((t) => !t.deletedAt && t.status === "open").map((t) => t.date).filter((d) => d !== today))].sort();
          if (todayTasks.length === 0 || nextDays.length === 0) return state;
          const examLookup = new Map(state.exams.map((exam) => [exam.id, exam]));
          const updatedTasks = redistributeMissedStudyTasks(state.studyTasks, examLookup);
          queued = updatedTasks.map((task) => ({ table: "study_tasks" as const, op: "upsert" as const, payload: task }));
          return { studyTasks: updatedTasks, syncStatus: state.isOnline ? "idle" : "queued" };
        });
        queued.forEach(enqueueWrite);
      },

      addFocusSession: (minutes, completed) => {
        requireMutation(get());
        let queued: PendingWriteInput | undefined;
        let session: FocusSession | undefined;
        set((state) => {
          session = {
            id: makeId("focus"),
            startedAt: nowIso(),
            minutes,
            completed: completed ?? true,
            updatedAt: nowIso(),
            deletedAt: null,
            userId: state.user?.id
          };
          queued = { table: "focus_sessions" as const, op: "upsert" as const, payload: session };
          const stats = state.stats;
          const updatedStats = awardXp(stats, xpForFocusSession(session.minutes));
          return {
            stats: withBadges(state.exams, state.studyTasks, updatedStats),
            syncStatus: state.isOnline ? "idle" : "queued"
          };
        });
        if (queued) {
          enqueueWrite(queued);
          const stats = get().stats;
          enqueueWrite({ table: "user_stats" as const, op: "upsert" as const, payload: stats });
        }
      },

      setTheme: (theme) => {
        requireMutation(get());
        set((state) => ({ settings: { ...state.settings, theme } }));
      },

      setCalendarMode: (mode) => {
        requireMutation(get());
        set((state) => ({ settings: { ...state.settings, calendarMode: mode } }));
      },

      updateReminderSettings: (patch) => {
        requireMutation(get());
        set((state) => ({ settings: { ...state.settings, reminders: { ...state.settings.reminders, ...patch } } }));
      },

      setDefaultDailyMinutes: (minutes) => {
        requireMutation(get());
        set((state) => ({ settings: { ...state.settings, defaultDailyMinutes: minutes } }));
      },

      clearRewardToast: () => {
        set({ rewardToast: undefined });
      },

      syncBadges: () => {
        set((state) => ({ stats: withBadges(state.exams, state.studyTasks, state.stats) }));
      },

      setOnlineStatus: (online) => {
        set({ isOnline: online });
      },

      setAuthReady: (ready) => {
        set({ authReady: ready });
      },

      setAuthSession: (user) => {
        set({ user: user ? { ...user, source: "online" } : null, isAuthenticated: !!user, authMode: user ? "online" : "signed-out" });
      },

      login: async (provider, email, password) => {
        if (provider === "email" && email && password) {
          await signInWithEmail(email, password);
          const profile = await getSession().then((session) => session ? ensureProfile({
            id: session.user.id,
            email: session.user.email,
            fullName: (session.user.user_metadata.full_name as string | undefined) ?? (session.user.user_metadata.name as string | undefined),
            avatarUrl: session.user.user_metadata.avatar_url as string | undefined,
            provider: session.user.app_metadata.provider as string | undefined,
            cloudSyncEnabled: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }) : null);
          set({ user: profile ? { ...profile, source: "online" } : null, isAuthenticated: !!profile, authMode: profile ? 'online' : 'signed-out', syncError: undefined });
        } else if (provider === "google") {
          await signInWithGoogle();
        }
      },

      signUp: async (email, password) => {
        const result = await signUpWithEmail(email, password);
        return { needsEmailConfirmation: result.needsEmailConfirmation };
      },

      logout: async () => {
        const state = get();
        if (state.authMode !== "offline-readonly") {
          await signOut();
        }
        await clearPendingWrites(state.user?.id);
        await clearOfflineGrant();
        set({ user: null, isAuthenticated: false, authMode: 'signed-out', exams: [], topics: [], studyTasks: [], materials: [], stats: seedSnapshot.stats, lastSyncedAt: undefined, syncError: undefined, pendingWriteCount: 0 });
      },

      syncNow: async (retryCount = 0) => {
        const state = get();
        if (!state.isAuthenticated || !state.user || state.syncStatus === "syncing" || state.authMode === 'offline-readonly') {
          return;
        }

        set({ syncStatus: "syncing", syncError: undefined });

        try {
          const pendingWrites = await getPendingWrites(state.user.id);
          for (const write of pendingWrites) {
            try {
              await applyPendingWrite(write);
              await removePendingWrite(write.id);
            } catch (error) {
              const message = error instanceof Error ? error.message : "Sync fehlgeschlagen";
              set({ syncStatus: "error", syncError: message });
              return;
            }
          }

          const snapshot = await pullFromCloud(state.user.id);
          const nextStats = withBadges(snapshot.exams, snapshot.studyTasks, snapshot.stats ?? seedSnapshot.stats);
          set({
            exams: snapshot.exams,
            topics: snapshot.topics,
            studyTasks: snapshot.studyTasks,
            materials: snapshot.materials,
            stats: nextStats,
            lastSyncedAt: new Date().toISOString(),
            syncStatus: "idle",
            syncError: undefined,
            pendingWriteCount: 0
          });
          await saveLastSyncedAt(new Date().toISOString());
          await persistCurrentSnapshot();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Sync fehlgeschlagen";
          set({ syncStatus: "error", syncError: message });
        }
      },

      enableCloudSync: async (enabled) => {
        requireMutation(get());
        set((state) => ({ settings: { ...state.settings, cloudSyncEnabled: enabled } }));
        const user = get().user;
        if (enabled && user?.source === "online") {
          await ensureProfile(user);
          void get().syncNow();
        } else {
          await clearPendingWrites(user?.id);
        }
      },

      enableOfflineReadOnlyAccess: async () => {
        requireMutation(get());
        if (!OFFLINE_READONLY_ENABLED) {
          throw new Error("Offline read-only access is disabled");
        }
        const result = await registerDevice();
        if (!result.success) {
          throw new Error(result.reason ?? "Offline registration failed");
        }
      },

      completeTutorial: () => {
        set((state) => ({ settings: { ...state.settings, tutorialCompleted: true } }));
      },

      resetTutorial: () => {
        set((state) => ({ settings: { ...state.settings, tutorialCompleted: false } }));
      }
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
      onRehydrateStorage: () => async (state) => {
        if (!state) return;

        state.authReady = false;
        state.hasHydrated = true;
        state.rewardToast = state.rewardToast;
        state.isOnline = state.isOnline;

        // Never trust cached auth — always re-validate with Supabase on startup.
        state.user = null;
        state.isAuthenticated = false;
        state.authMode = 'signed-out';
        state.syncBadges();

        // Try normal auth first
        try {
          const session = await getSession();
          if (session) {
            state.user = {
              id: session.user.id,
              email: session.user.email,
              fullName: (session.user.user_metadata.full_name as string | undefined) ?? (session.user.user_metadata.name as string | undefined),
              avatarUrl: session.user.user_metadata.avatar_url as string | undefined,
              provider: session.user.app_metadata.provider as string | undefined,
              cloudSyncEnabled: true,
              createdAt: nowIso(),
              updatedAt: nowIso(),
              source: 'online'
            };
            state.isAuthenticated = true;
            state.authMode = 'online';

            // Revalidate offline grant if exists
            if (state.deviceSessionId && state.grantHash) {
              const result = await revalidateGrantOnline(state.deviceSessionId, state.grantHash);
              if (result === false) {
                state.deviceSessionId = undefined;
                state.grantHash = undefined;
              }
            }

            // Sync from cloud
            const cloudSnapshot = await pullFromCloud(session.user.id);
            state.exams = cloudSnapshot.exams;
            state.topics = cloudSnapshot.topics;
            state.studyTasks = cloudSnapshot.studyTasks;
            state.materials = cloudSnapshot.materials;
            state.stats = withBadges(cloudSnapshot.exams, cloudSnapshot.studyTasks, cloudSnapshot.stats ?? seedSnapshot.stats);
            state.authReady = true;
            return;
          }
        } catch {
          // Network error - try offline
        }

        // Fallback to offline read-only
        const offlineAuth = await getOfflineAuth();
        if (offlineAuth) {
          state.user = offlineAuth.user;
          state.authMode = offlineAuth.authMode;
          state.isAuthenticated = true;
          state.grantHash = offlineAuth.grantHash;
          state.deviceSessionId = offlineAuth.deviceSessionId;

          // Load and decrypt cached snapshot
          const stored = await getOfflineGrant();
          if (stored?.grant) {
            const payload = await verifyOfflineGrant(stored.grant);
            if (payload) {
              const snapshot = await getOfflineSnapshot(stored.grant);
              if (snapshot) {
                const s = snapshot as OfflineSnapshot;
                // FIXED: Only restore whitelisted data, not auth state
                state.exams = s.exams;
                state.topics = s.topics;
                state.studyTasks = s.studyTasks;
                state.materials = s.materials;
                state.stats = s.stats;
                state.settings = s.settings;
              }
            }
          }
          state.authReady = true;
          return;
        }

        // Signed out
        state.user = null;
        state.isAuthenticated = false;
        state.authMode = 'signed-out';
        state.grantHash = undefined;
        state.deviceSessionId = undefined;
        state.authReady = true;
      }
    }
  )
);

export function selectExamProgress(examId: string): (state: AppStore) => number {
  return (state) => getExamProgress(examId, filterActive(state.topics).filter((topic) => topic.examId === examId));
}
