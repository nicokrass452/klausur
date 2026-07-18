# Klausurplaner — Project Context (Single File)

This document consolidates everything an LLM needs to understand the project, architecture, data model, algorithms, and development workflow.

---

## 1. Project Overview

**Klausurplaner** is a mobile-first Progressive Web App for students (German: "exam planner").

Core purpose:
- Manage exams (Klausuren)
- Generate and adapt study plans
- Track progress with tasks (learn/review/buffer)
- Pomodoro-style focus sessions
- Analytics + gamification (XP, levels, streaks, badges)
- AI Coach (quiz, flashcards, explanations, plan optimization, free chat)
- Cloud sync via Supabase
- Learning materials (notes, PDFs, videos) per exam
- Learning groups (local + snapshot sync)
- Full offline support with graceful degradation
- PWA features (install prompt, Web Push)

**Status**: Grown well beyond MVP. Uses full Supabase Auth + Postgres. Snapshot-based sync. Adaptive learning plan generator. AI context from materials.

**Primary language**: German (full i18n support for English).

---

## 2. Tech Stack

**Frontend**
- React 19 + TypeScript
- Vite 7
- Zustand (with persist + LocalStorage)
- React Router 7
- Tailwind CSS 4
- lucide-react icons
- idb (IndexedDB)

**Backend / Services**
- Supabase (Auth + Postgres + Storage + Edge Functions)
- Edge Functions: `ai-coach`, push notifications, offline device auth

**PWA**
- Web App Manifest
- Service Worker (stale-while-revalidate shell cache + push handlers)

**Testing**
- Vitest + Testing Library + jsdom

**Observability**
- Optional Sentry (`@sentry/react`)

**Other**
- No direct LLM calls from browser. All AI goes through Supabase Edge Function.

---

## 3. Directory Structure (Key Parts)

```
/
├── src/
│   ├── App.tsx                 # Auth bootstrap, online listeners, missed task redistribution
│   ├── main.tsx                # Sentry + SW registration
│   ├── routes/AppRouter.tsx    # Lazy routes + AuthGuard
│   ├── store/useAppStore.ts    # Central Zustand store (all state + actions)
│   ├── pages/                  # Dashboard, Exams, ExamDetail, StudyPlan, Coach, etc.
│   ├── components/             # Layout, AuthGuard, Tutorial, SyncStatusBadge, etc.
│   ├── services/
│   │   ├── syncService.ts      # Push/pull + auth wrappers
│   │   ├── aiService.ts        # Edge Function wrapper + mock fallbacks
│   │   ├── studyPlanGenerator.ts
│   │   ├── materialStorageService.ts
│   │   ├── pushService.ts, offlineStorageService.ts, ...
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── deviceAuth.ts       # Offline read-only grants
│   │   ├── cacheEncryption.ts
│   │   ├── i18n.ts
│   │   ├── constants.ts
│   ├── types/index.ts          # Complete domain types
│   ├── locales/                # de.ts + en.ts
│   ├── data/seed.ts            # Demo data for guests
│   └── utils/                  # gamification, icalExport, analyticsExport, dateUtils
├── supabase/
│   ├── migrations/             # All schema + RLS + functions
│   └── functions/
│       └── ai-coach/index.ts   # Main AI orchestrator (GLM → DeepSeek → mock)
├── docs/                       # Excellent documentation (see README table)
├── public/
│   └── service-worker.js
├── package.json
└── .env.example
```

No AGENTS.md / Claude.md files exist.

---

## 4. Core Architecture Principles

- **Online-first + snapshot sync**: Authoritative data lives in Supabase. Local state is a working copy.
- **Soft deletes**: Every entity has `deletedAt`.
- **Last-Write-Wins**: Conflict resolution uses `updatedAt`.
- **Pending writes queue**: Offline mutations are recorded and replayed on reconnect.
- **AI never direct**: Browser calls `supabase.functions.invoke("ai-coach")`. Edge Function handles GLM + DeepSeek.
- **Mutation guard**: `requireMutation()` blocks changes in `offline-readonly` mode.
- **Hydration + Auth ready gates**: App waits for both before rendering.

---

## 5. Data Model (from `src/types/index.ts`)

```ts
interface SyncableEntity {
  userId?: string;
  updatedAt: string;
  deletedAt?: string | null;
}

interface Exam extends SyncableEntity {
  id: string; subject: string; date: string; time: string; room: string;
  notes: string; difficulty: number; knowledgeLevel: number;
  color: string; createdAt: string; dailyMinutes: number;
}

interface Topic extends SyncableEntity {
  id: string; examId: string; name: string; completed: boolean;
  difficulty: number; estimatedMinutes: number;
}

interface StudyTask extends SyncableEntity {
  id: string; examId: string; topicId?: string;
  date: string; task: string; duration: number;
  type: "learn" | "review" | "buffer";
  status: "open" | "done" | "missed";
}

interface StudyMaterial extends SyncableEntity {
  id: string; examId: string;
  type: "pdf" | "note" | "video";
  title: string; content?: string; url?: string; fileName?: string;
}

interface LearningGroup extends SyncableEntity {
  id: string; name: string; inviteCode: string;
  memberNames: string[]; examIds: string[];
}

interface UserStats extends SyncableEntity {
  studyTime: number; streak: number; xp: number; level: number;
  badges: UserBadge[]; focusSessions: FocusSession[];
  xpHistory: Array<{ date: string; xp: number }>;
}

interface AppSettings {
  theme: "light" | "dark" | "system";
  calendarMode: "week" | "month";
  defaultDailyMinutes: number;
  cloudSyncEnabled: boolean;
  tutorialCompleted: boolean;
  language: "de" | "en";
  reminders: { ... };
}

interface AppSnapshot { /* all entities + stats + settings + sync metadata */ }
```

**Relationships**:
- Exam → many Topics, StudyTasks, StudyMaterials
- StudyTask → optional Topic
- LearningGroup → references exam IDs (array)

All tables use `id` (text, client-generated), `user_id`, `created_at`, `updated_at`, `deleted_at`.

---

## 6. Zustand Store (`useAppStore.ts`)

Central source of truth. Persisted to LocalStorage.

**Important actions** (selected):
- `addExam`, `updateExam`, `removeExam` (cascades soft-delete)
- `addTopic`, `updateTopic`, `toggleTopic`
- `addMaterial`, `updateMaterial`
- `setTaskStatus` (awards XP on "done")
- `regenerateStudyPlan` (classic)
- `regenerateAdaptiveStudyPlan` (keeps done tasks)
- `redistributeMissed` (auto on startup if online)
- Learning group CRUD + share/unshare
- `addFocusSession` (awards XP)
- `syncNow`, `enableCloudSync`
- `enableOfflineReadOnlyAccess`
- `login`, `signUp`, `logout`
- Settings setters + `completeTutorial` / `resetTutorial`

**XP & Gamification**:
- `xpForTask(duration, type)`
- `xpForFocusSession(minutes)`
- Streak logic on `awardXp`
- Badges resolved on relevant mutations

**Offline handling**:
- `enqueueWrite` → `offlineStorageService`
- `syncNow` replays pending writes
- Snapshot saved on every meaningful change

---

## 7. Key Algorithms

### Priority Formula (classic)
```ts
priority = difficulty * 2 + (6 - knowledgeLevel)
```

### Classic Plan Generation (`generateStudyPlanForExam`)
- 70% learn, 20% review, 10% buffer
- Spaced repetition days: `[1, 2, 5, 10, 18]`
- Slots = max(topics, daysUntilExam - 1)
- Duration scaled by priority

### Adaptive Planning (`generateAdaptiveStudyPlanForExam`)
- Builds `AdaptivePlanInsight[]` scoring each topic:
  - Base: `difficulty * 2 + (6 - knowledgeLevel)`
  - + missedCount * 3, overdueCount * 2
  - + urgencyBonus (near exam date)
  - - doneCount, completedPenalty
- Weighted topic selection (higher score = more slots)
- Task type logic prefers review for weak/missed topics
- Preserves already `done` tasks when regenerating

### Missed Task Redistribution
- Moves open past-due tasks forward day-by-day
- Marks as missed if they would land on/after exam date
- Runs automatically on app start (if authenticated + online)

---

## 8. Sync & Offline Strategy

- **Full snapshot push/pull** (not realtime/incremental).
- Tables are mapped to flat rows in Supabase (see `syncService.ts`).
- `pendingOfflineChanges` queue for mutations made while offline.
- `syncNow()` is the main reconciliation function.
- Last-Write-Wins using `updatedAt`.
- On login / online: pull from cloud then push local pending.
- `cloudSyncEnabled` setting controls behavior.
- Offline read-only mode (feature-flagged) loads an **encrypted** snapshot.

**Offline Read-Only** (see `deviceAuth.ts`, `security.md`):
- Device generates ECDSA P-256 keypair.
- Challenge-response with Edge Functions.
- Snapshot encrypted with AES-256-GCM derived from grant.
- **Disabled by default** (`VITE_ENABLE_OFFLINE_READONLY=false`).

---

## 9. Authentication & Access Modes

Modes (`authMode`):
- `online` — normal logged-in user
- `offline-readonly` — encrypted local snapshot only (no mutations)
- `signed-out`

**Flows**:
- Email + password, Google OAuth
- Email confirmation detection + resend
- Password reset (Settings)
- Account deletion via RPC
- Auth session is always validated server-side on startup

**Guest mode**: Limited to calendar preview with seed data.

---

## 10. AI Integration (Coach)

**Never calls providers directly from client.**

Flow:
1. Frontend calls `supabase.functions.invoke("ai-coach")` or `fetch` to `/functions/v1/ai-coach`
2. Edge Function authenticates via JWT, rate-limits, calls GLM then DeepSeek.
3. Falls back to mock in `aiService.ts` on any failure.

**Actions**:
- `coachMessage`, `coachChat`, `generateQuiz`, `generateFlashcards`, `optimizeStudyPlan`

**coachChat context** (passed to Edge Function):
- Current exams, topics, tasks, stats, materials (notes full text truncated, PDFs/videos by metadata only), language.

**Rate limiting**:
- 429 is detected and surfaced prominently.
- Frontend shows clear "rate limited" messaging.

**Mock fallbacks** are deterministic and fast for development.

Edge function location: `supabase/functions/ai-coach/index.ts`

---

## 11. Materials & File Storage

- Per-exam materials: `note`, `pdf`, `video`
- PDFs → Supabase Storage bucket `materials`
- Path convention: `{user_id}/{exam_id}/{material_id}/{filename}`
- Max 10 MB, PDF only (client validation)
- RLS: only owner can access
- Offline fallback: file metadata + blob stored in IndexedDB via `storageService.ts`
- Download/preview links generated in `ExamDetail`

`materialStorageService.ts` + `uploadMaterialFile()`.

---

## 12. PWA, Push, Service Worker

- `public/manifest.json`
- `public/service-worker.js` — shell cache (stale-while-revalidate)
- Web Push: `subscribe-push` + `send-push` Edge Functions + VAPID
- Install prompt: `InstallPromptBanner.tsx` (handles `beforeinstallprompt`)
- Local notifications also supported

---

## 13. Environment Variables

**Client (VITE_*)** — baked into build:
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_GOOGLE_CLIENT_ID (optional)
VITE_AUTH_REDIRECT_URL
VITE_DEV_SERVER_PORT=5177
VITE_SENTRY_DSN (optional)
VITE_ENABLE_OFFLINE_READONLY=false
VITE_VAPID_PUBLIC_KEY
```

**Server-only** (Supabase Edge Function secrets or `.env.server`):
- `GLM_API_KEY`, `DEEPSEEK_API_KEY`
- `VAPID_PRIVATE_KEY`
- `OFFLINE_SIGNING_KEY`, `OFFLINE_READONLY_ENABLED`
- `SUPABASE_SERVICE_ROLE_KEY` (for some functions)
- `CLEANUP_CRON_KEY`

**Important**: Never put server keys in `VITE_*`.

---

## 14. Supabase Schema (Core Tables)

From `20240101000000_init.sql` + later migrations:

Tables:
- `profiles`
- `exams`, `topics`, `study_tasks`, `study_materials`
- `user_stats`, `focus_sessions`, `badges`
- `learning_groups`
- `device_sessions`, `device_challenges` (offline auth)
- `push_subscriptions`

All application tables have RLS enabled. Policies generally: `auth.uid() = user_id`.

**Verification migration**: `20250101000006_verify_rls.sql` — run before releases.

**Learning groups**: Added later with their own RLS verification.

Storage bucket: `materials` (private).

---

## 15. Development & Deployment

**Local**:
```powershell
npm install
cp .env.example .env
npm run dev          # http://localhost:5177
npm test
npm run typecheck
```

**Build**:
```powershell
npm run build
npm run preview
```

**Supabase**:
- Run migrations in order in SQL Editor
- Deploy Edge Functions: `supabase functions deploy ai-coach ...`
- Set secrets via `supabase secrets set`

**CI**: GitHub Actions (tests + build). Secrets must be present at build time for VITE_ vars.

**Port**: Default 5177 (configurable).

---

## 16. Internationalization

Lightweight system:
- `src/lib/i18n.ts` + `t(key, language)`
- `src/locales/de.ts` (source of truth) and `en.ts` (complete mirror)
- Language stored in settings + localStorage
- All visible UI strings are keyed

---

## 17. Testing

- Unit tests colocated (`*.test.ts`)
- Covers: store, sync, study plan generator, aiService, exports, cache encryption
- Run with `npm test`

---

## 18. Security Highlights

- RLS on every table
- Soft deletes + user_id scoping
- AI calls authenticated via Supabase JWT
- Offline grants use signed JWT-like tokens + device thumbprint + challenge
- Snapshots encrypted at rest when offline-readonly enabled
- No secrets in client bundle
- Key rotation documented in `docs/security.md`

**Offline read-only is intentionally disabled by default in production.**

---

## 19. Roadmap & Known Limitations (from docs/roadmap.md)

**Completed in recent work**:
- Adaptive planning
- Learning groups (local + snapshot)
- Material context for AI
- Web Push MVP
- i18n, accessibility basics, install prompt
- Tests, RLS verification

**Still open / future**:
- Realtime / incremental sync (current = full snapshot)
- True multi-user learning groups
- Full PDF text extraction for AI context
- Stronger chat history + folders + AI actions
- Mermaid diagrams and advanced visualizations from AI
- Multi-device session management

**Explicitly deprioritized**:
- General code interpreter
- Full web research agent

---

## 20. Important Conventions & Gotchas

- Always use soft delete (`deletedAt`) instead of hard delete.
- Every mutating entity must have `updatedAt = nowIso()`.
- Client generates IDs (UUID-ish strings).
- After any store mutation that should persist: `enqueueWrite(...)`.
- `requireMutation(get())` at the start of every write action.
- AI context is sliced to ~6000 chars in the Edge Function.
- `cloudSyncEnabled` + `isAuthenticated` control most sync behavior.
- When adding new UI strings, add to both `de.ts` and `en.ts`.
- VITE_* changes require dev server restart + full rebuild for prod.
- Guest users see seed data only (no real cloud preview).
- `syncStatus` can be: idle | syncing | error | success | queued | pending_offline.

---

## Quick Reference

**Main routes** (from constants):
- `/dashboard`, `/calendar`, `/exams`, `/exams/:id`
- `/study-plan`, `/coach`, `/focus`, `/analytics`, `/settings`
- `/login`, `/signup`

**Seed data**: `src/data/seed.ts` (2 demo exams + topics + tasks + groups + materials)

**Priority constants**:
- `SPACED_REPETITION_INTERVALS = [1,2,5,10,18]`
- Pomodoro: 25/5

**Colors**: 7 subject colors in `SUBJECT_COLORS`.

---

This file + the `/docs` folder + source code should give any model complete context to work on the project effectively.
