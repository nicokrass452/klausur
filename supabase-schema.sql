create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  provider text,
  cloud_sync_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exams (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  date date not null,
  time text not null,
  room text not null default '',
  notes text not null default '',
  difficulty int not null,
  knowledge_level int not null,
  color text not null,
  daily_minutes int not null,
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.topics (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id text not null references public.exams(id) on delete cascade,
  name text not null,
  completed boolean not null default false,
  difficulty int not null,
  estimated_minutes int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.study_tasks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id text not null references public.exams(id) on delete cascade,
  topic_id text,
  date date not null,
  task text not null,
  duration int not null,
  type text not null check (type in ('learn','review','buffer')),
  status text not null check (status in ('open','done','missed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.study_materials (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id text not null references public.exams(id) on delete cascade,
  type text not null check (type in ('pdf','note','video')),
  title text not null,
  content text,
  url text,
  file_name text,
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  study_time int not null default 0,
  streak int not null default 0,
  xp int not null default 0,
  level int not null default 1,
  last_study_date date,
  xp_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.focus_sessions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  minutes int not null,
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.badges (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  description text not null,
  unlocked_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.exams enable row level security;
alter table public.topics enable row level security;
alter table public.study_tasks enable row level security;
alter table public.study_materials enable row level security;
alter table public.user_stats enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.badges enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "exams_select_own" on public.exams for select using (auth.uid() = user_id);
create policy "exams_insert_own" on public.exams for insert with check (auth.uid() = user_id);
create policy "exams_update_own" on public.exams for update using (auth.uid() = user_id);
create policy "exams_delete_own" on public.exams for delete using (auth.uid() = user_id);

create policy "topics_select_own" on public.topics for select using (auth.uid() = user_id);
create policy "topics_insert_own" on public.topics for insert with check (auth.uid() = user_id);
create policy "topics_update_own" on public.topics for update using (auth.uid() = user_id);
create policy "topics_delete_own" on public.topics for delete using (auth.uid() = user_id);

create policy "study_tasks_select_own" on public.study_tasks for select using (auth.uid() = user_id);
create policy "study_tasks_insert_own" on public.study_tasks for insert with check (auth.uid() = user_id);
create policy "study_tasks_update_own" on public.study_tasks for update using (auth.uid() = user_id);
create policy "study_tasks_delete_own" on public.study_tasks for delete using (auth.uid() = user_id);

create policy "study_materials_select_own" on public.study_materials for select using (auth.uid() = user_id);
create policy "study_materials_insert_own" on public.study_materials for insert with check (auth.uid() = user_id);
create policy "study_materials_update_own" on public.study_materials for update using (auth.uid() = user_id);
create policy "study_materials_delete_own" on public.study_materials for delete using (auth.uid() = user_id);

create policy "user_stats_select_own" on public.user_stats for select using (auth.uid() = user_id);
create policy "user_stats_insert_own" on public.user_stats for insert with check (auth.uid() = user_id);
create policy "user_stats_update_own" on public.user_stats for update using (auth.uid() = user_id);
create policy "user_stats_delete_own" on public.user_stats for delete using (auth.uid() = user_id);

create policy "focus_sessions_select_own" on public.focus_sessions for select using (auth.uid() = user_id);
create policy "focus_sessions_insert_own" on public.focus_sessions for insert with check (auth.uid() = user_id);
create policy "focus_sessions_update_own" on public.focus_sessions for update using (auth.uid() = user_id);
create policy "focus_sessions_delete_own" on public.focus_sessions for delete using (auth.uid() = user_id);

create policy "badges_select_own" on public.badges for select using (auth.uid() = user_id);
create policy "badges_insert_own" on public.badges for insert with check (auth.uid() = user_id);
create policy "badges_update_own" on public.badges for update using (auth.uid() = user_id);
create policy "badges_delete_own" on public.badges for delete using (auth.uid() = user_id);
