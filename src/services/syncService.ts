import type { Session, User } from "@supabase/supabase-js";
import { formatSupabaseError } from "../lib/supabaseErrors";
import { getAuthRedirectUrl, supabase } from "../lib/supabase";
import type { AppSnapshot, Exam, FocusSession, StudyMaterial, StudyTask, Topic, UserBadge, UserProfile, UserStats } from "../types";

interface CloudBundle {
  user: UserProfile | null;
  exams: Exam[];
  topics: Topic[];
  studyTasks: StudyTask[];
  materials: StudyMaterial[];
  stats: UserStats | null;
  focusSessions: FocusSession[];
  badges: UserBadge[];
}

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert. Trage VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY ein.");
  }
  return supabase;
}

function isMissingRowError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as { code?: string }).code === "PGRST116");
}

function throwIfSupabaseError(error: unknown): void {
  if (error) throw new Error(formatSupabaseError(error));
}

function mapUserToProfile(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email,
    fullName: (user.user_metadata.full_name as string | undefined) ?? (user.user_metadata.name as string | undefined),
    avatarUrl: user.user_metadata.avatar_url as string | undefined,
    provider: user.app_metadata.provider as string | undefined,
    cloudSyncEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function mapExamToRow(exam: Exam, userId: string) {
  return {
    id: exam.id,
    user_id: userId,
    subject: exam.subject,
    date: exam.date,
    time: exam.time,
    room: exam.room,
    notes: exam.notes,
    difficulty: exam.difficulty,
    knowledge_level: exam.knowledgeLevel,
    color: exam.color,
    daily_minutes: exam.dailyMinutes,
    created_at: exam.createdAt,
    updated_at: exam.updatedAt,
    deleted_at: exam.deletedAt ?? null
  };
}

function mapTopicToRow(topic: Topic, userId: string) {
  return {
    id: topic.id,
    user_id: userId,
    exam_id: topic.examId,
    name: topic.name,
    completed: topic.completed,
    difficulty: topic.difficulty,
    estimated_minutes: topic.estimatedMinutes,
    updated_at: topic.updatedAt,
    deleted_at: topic.deletedAt ?? null
  };
}

function mapTaskToRow(task: StudyTask, userId: string) {
  return {
    id: task.id,
    user_id: userId,
    exam_id: task.examId,
    topic_id: task.topicId ?? null,
    date: task.date,
    task: task.task,
    duration: task.duration,
    type: task.type,
    status: task.status,
    updated_at: task.updatedAt,
    deleted_at: task.deletedAt ?? null
  };
}

function mapMaterialToRow(material: StudyMaterial, userId: string) {
  return {
    id: material.id,
    user_id: userId,
    exam_id: material.examId,
    type: material.type,
    title: material.title,
    content: material.content ?? null,
    url: material.url ?? null,
    file_name: material.fileName ?? null,
    created_at: material.createdAt,
    updated_at: material.updatedAt,
    deleted_at: material.deletedAt ?? null
  };
}

function mapFocusSessionToRow(session: FocusSession, userId: string) {
  return {
    id: session.id,
    user_id: userId,
    started_at: session.startedAt,
    minutes: session.minutes,
    completed: session.completed,
    updated_at: session.updatedAt,
    deleted_at: session.deletedAt ?? null
  };
}

function mapBadgeToRow(badge: UserBadge, userId: string) {
  return {
    id: badge.id,
    user_id: userId,
    label: badge.label,
    description: badge.description,
    unlocked_at: badge.unlockedAt,
    updated_at: badge.updatedAt,
    deleted_at: badge.deletedAt ?? null
  };
}

function mapExamFromRow(row: Record<string, unknown>): Exam {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    subject: row.subject as string,
    date: row.date as string,
    time: row.time as string,
    room: row.room as string,
    notes: row.notes as string,
    difficulty: row.difficulty as number,
    knowledgeLevel: row.knowledge_level as number,
    color: row.color as string,
    dailyMinutes: row.daily_minutes as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    deletedAt: row.deleted_at as string | null
  };
}

function mapTopicFromRow(row: Record<string, unknown>): Topic {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    examId: row.exam_id as string,
    name: row.name as string,
    completed: row.completed as boolean,
    difficulty: row.difficulty as number,
    estimatedMinutes: row.estimated_minutes as number,
    updatedAt: row.updated_at as string,
    deletedAt: row.deleted_at as string | null
  };
}

function mapTaskFromRow(row: Record<string, unknown>): StudyTask {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    examId: row.exam_id as string,
    topicId: (row.topic_id as string | null) ?? undefined,
    date: row.date as string,
    task: row.task as string,
    duration: row.duration as number,
    type: row.type as StudyTask["type"],
    status: row.status as StudyTask["status"],
    updatedAt: row.updated_at as string,
    deletedAt: row.deleted_at as string | null
  };
}

function mapMaterialFromRow(row: Record<string, unknown>): StudyMaterial {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    examId: row.exam_id as string,
    type: row.type as StudyMaterial["type"],
    title: row.title as string,
    content: (row.content as string | null) ?? undefined,
    url: (row.url as string | null) ?? undefined,
    fileName: (row.file_name as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    deletedAt: row.deleted_at as string | null
  };
}

function mapFocusSessionFromRow(row: Record<string, unknown>): FocusSession {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    startedAt: row.started_at as string,
    minutes: row.minutes as number,
    completed: row.completed as boolean,
    updatedAt: row.updated_at as string,
    deletedAt: row.deleted_at as string | null
  };
}

function mapBadgeFromRow(row: Record<string, unknown>): UserBadge {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    label: row.label as string,
    description: row.description as string,
    unlockedAt: row.unlocked_at as string,
    updatedAt: row.updated_at as string,
    deletedAt: row.deleted_at as string | null
  };
}

export async function signInWithGoogle(): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getAuthRedirectUrl(),
      queryParams: {
        prompt: "select_account"
      }
    }
  });
  throwIfSupabaseError(error);
}

function mapAuthError(error: { message: string }): Error {
  const message = error.message.toLowerCase();
  if (message.includes("api key") || message.includes("apikey")) {
    return new Error(formatSupabaseError(error));
  }
  if (message.includes("email not confirmed")) {
    return new Error("Bitte bestätige zuerst deine E-Mail-Adresse in Supabase.");
  }
  if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
    return new Error("E-Mail oder Passwort ist falsch.");
  }
  const friendly = formatSupabaseError(error);
  return new Error(friendly === "Supabase-Anfrage fehlgeschlagen" ? error.message : friendly);
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw mapAuthError(error);
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{ needsEmailConfirmation: boolean }> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw mapAuthError(error);
  return { needsEmailConfirmation: Boolean(data.user && !data.session) };
}

export async function signOut(): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.auth.signOut({ scope: "global" });
  throwIfSupabaseError(error);
}

/** Validates the current session with Supabase — stale or deleted users are cleared. */
export async function resolveAuthUser(): Promise<UserProfile | null> {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    await client.auth.signOut({ scope: "local" });
    return null;
  }
  return mapUserToProfile(data.user);
}

export async function getSession(): Promise<Session | null> {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  throwIfSupabaseError(error);
  return data.session;
}

export function onAuthStateChange(callback: (session: Session | null, profile: UserProfile | null) => void) {
  const client = requireSupabase();
  const { data } = client.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      callback(null, null);
      return;
    }

    const { data: userData, error } = await client.auth.getUser();
    if (error || !userData.user) {
      await client.auth.signOut({ scope: "local" });
      callback(null, null);
      return;
    }

    callback(session, mapUserToProfile(userData.user));
  });
  return () => data.subscription.unsubscribe();
}

export async function ensureProfile(user: UserProfile): Promise<UserProfile> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email ?? null,
        full_name: user.fullName ?? null,
        avatar_url: user.avatarUrl ?? null,
        provider: user.provider ?? null,
        cloud_sync_enabled: user.cloudSyncEnabled,
        updated_at: user.updatedAt
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();
  throwIfSupabaseError(error);
  return {
    id: data.id,
    email: data.email ?? undefined,
    fullName: data.full_name ?? undefined,
    avatarUrl: data.avatar_url ?? undefined,
    provider: data.provider ?? undefined,
    cloudSyncEnabled: data.cloud_sync_enabled,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export function resolveConflicts<T extends { id: string; updatedAt: string; deletedAt?: string | null }>(local: T[], remote: T[]): T[] {
  const merged = new Map<string, T>();
  [...local, ...remote].forEach((entry) => {
    const current = merged.get(entry.id);
    if (!current || new Date(entry.updatedAt).getTime() >= new Date(current.updatedAt).getTime()) {
      merged.set(entry.id, entry);
    }
  });
  return Array.from(merged.values());
}

export async function pullFromCloud(userId: string): Promise<CloudBundle> {
  const client = requireSupabase();
  const [profiles, exams, topics, studyTasks, materials, stats, focusSessions, badges] = await Promise.all([
    client.from("profiles").select("*").eq("id", userId).maybeSingle(),
    client.from("exams").select("*").eq("user_id", userId),
    client.from("topics").select("*").eq("user_id", userId),
    client.from("study_tasks").select("*").eq("user_id", userId),
    client.from("study_materials").select("*").eq("user_id", userId),
    client.from("user_stats").select("*").eq("user_id", userId).maybeSingle(),
    client.from("focus_sessions").select("*").eq("user_id", userId),
    client.from("badges").select("*").eq("user_id", userId)
  ]);

  [profiles, exams, topics, studyTasks, materials, stats, focusSessions, badges].forEach((result) => {
    if (result.error && !isMissingRowError(result.error)) {
      throwIfSupabaseError(result.error);
    }
  });

  return {
    user: profiles.data
      ? {
          id: profiles.data.id,
          email: profiles.data.email ?? undefined,
          fullName: profiles.data.full_name ?? undefined,
          avatarUrl: profiles.data.avatar_url ?? undefined,
          provider: profiles.data.provider ?? undefined,
          cloudSyncEnabled: profiles.data.cloud_sync_enabled,
          createdAt: profiles.data.created_at,
          updatedAt: profiles.data.updated_at
        }
      : null,
    exams: (exams.data ?? []).map((row) => mapExamFromRow(row)),
    topics: (topics.data ?? []).map((row) => mapTopicFromRow(row)),
    studyTasks: (studyTasks.data ?? []).map((row) => mapTaskFromRow(row)),
    materials: (materials.data ?? []).map((row) => mapMaterialFromRow(row)),
    stats: stats.data
      ? {
          studyTime: stats.data.study_time,
          streak: stats.data.streak,
          xp: stats.data.xp,
          level: stats.data.level,
          badges: [],
          focusSessions: [],
          lastStudyDate: stats.data.last_study_date ?? undefined,
          xpHistory: stats.data.xp_history ?? [],
          userId,
          updatedAt: stats.data.updated_at,
          deletedAt: stats.data.deleted_at
        }
      : null,
    focusSessions: (focusSessions.data ?? []).map((row) => mapFocusSessionFromRow(row)),
    badges: (badges.data ?? []).map((row) => mapBadgeFromRow(row))
  };
}

export async function syncExam(exam: Exam, userId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("exams").upsert(mapExamToRow(exam, userId), { onConflict: "id" });
  throwIfSupabaseError(error);
}

export async function syncTopic(topic: Topic, userId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("topics").upsert(mapTopicToRow(topic, userId), { onConflict: "id" });
  throwIfSupabaseError(error);
}

export async function syncStudyTask(task: StudyTask, userId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("study_tasks").upsert(mapTaskToRow(task, userId), { onConflict: "id" });
  throwIfSupabaseError(error);
}

export async function syncUserStats(stats: UserStats, focusSessions: FocusSession[], badges: UserBadge[], userId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("user_stats").upsert(
    {
      user_id: userId,
      study_time: stats.studyTime,
      streak: stats.streak,
      xp: stats.xp,
      level: stats.level,
      last_study_date: stats.lastStudyDate ?? null,
      xp_history: stats.xpHistory,
      updated_at: stats.updatedAt,
      deleted_at: stats.deletedAt ?? null
    },
    { onConflict: "user_id" }
  );
  throwIfSupabaseError(error);

  if (focusSessions.length) {
    const focusError = await client.from("focus_sessions").upsert(focusSessions.map((entry) => mapFocusSessionToRow(entry, userId)), { onConflict: "id" });
    throwIfSupabaseError(focusError.error);
  }
  if (badges.length) {
    const badgeError = await client.from("badges").upsert(badges.map((entry) => mapBadgeToRow(entry, userId)), { onConflict: "id" });
    throwIfSupabaseError(badgeError.error);
  }
}

export async function pushToCloud(snapshot: AppSnapshot): Promise<void> {
  if (!snapshot.user) throw new Error("Kein eingeloggter Nutzer für Cloud Sync.");
  const client = requireSupabase();
  const userId = snapshot.user.id;

  await ensureProfile(snapshot.user);

  const operations = [
    client.from("exams").upsert(snapshot.exams.map((entry) => mapExamToRow(entry, userId)), { onConflict: "id" }),
    client.from("topics").upsert(snapshot.topics.map((entry) => mapTopicToRow(entry, userId)), { onConflict: "id" }),
    client.from("study_tasks").upsert(snapshot.studyTasks.map((entry) => mapTaskToRow(entry, userId)), { onConflict: "id" }),
    client.from("study_materials").upsert(snapshot.materials.map((entry) => mapMaterialToRow(entry, userId)), { onConflict: "id" })
  ];

  const results = await Promise.all(operations);
  results.forEach((result) => {
    throwIfSupabaseError(result.error);
  });

  await syncUserStats(snapshot.stats, snapshot.stats.focusSessions, snapshot.stats.badges, userId);
}
