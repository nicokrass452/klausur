create table if not exists public.study_chats (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id text not null references public.exams(id) on delete cascade,
  title text not null,
  mode text not null check (mode in ('coach', 'quiz', 'flashcards', 'plan', 'explain')),
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.study_memories (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id text not null references public.exams(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists study_chats_user_exam_idx on public.study_chats (user_id, exam_id);
create index if not exists study_memories_user_exam_idx on public.study_memories (user_id, exam_id);

alter table public.study_chats enable row level security;
alter table public.study_memories enable row level security;

drop policy if exists "study_chats_select_own" on public.study_chats;
drop policy if exists "study_chats_insert_own" on public.study_chats;
drop policy if exists "study_chats_update_own" on public.study_chats;
drop policy if exists "study_chats_delete_own" on public.study_chats;

create policy "study_chats_select_own" on public.study_chats for select using (auth.uid() = user_id);
create policy "study_chats_insert_own" on public.study_chats for insert with check (auth.uid() = user_id);
create policy "study_chats_update_own" on public.study_chats for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "study_chats_delete_own" on public.study_chats for delete using (auth.uid() = user_id);

drop policy if exists "study_memories_select_own" on public.study_memories;
drop policy if exists "study_memories_insert_own" on public.study_memories;
drop policy if exists "study_memories_update_own" on public.study_memories;
drop policy if exists "study_memories_delete_own" on public.study_memories;

create policy "study_memories_select_own" on public.study_memories for select using (auth.uid() = user_id);
create policy "study_memories_insert_own" on public.study_memories for insert with check (auth.uid() = user_id);
create policy "study_memories_update_own" on public.study_memories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "study_memories_delete_own" on public.study_memories for delete using (auth.uid() = user_id);
