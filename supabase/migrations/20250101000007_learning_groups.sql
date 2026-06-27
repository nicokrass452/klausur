create table if not exists public.learning_groups (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  invite_code text not null,
  member_names text[] not null default '{}'::text[],
  exam_ids text[] not null default '{}'::text[],
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists learning_groups_invite_code_key
  on public.learning_groups (invite_code)
  where deleted_at is null;

alter table public.learning_groups enable row level security;

create policy "learning_groups_select_own" on public.learning_groups for select using (auth.uid() = user_id);
create policy "learning_groups_insert_own" on public.learning_groups for insert with check (auth.uid() = user_id);
create policy "learning_groups_update_own" on public.learning_groups for update using (auth.uid() = user_id);
create policy "learning_groups_delete_own" on public.learning_groups for delete using (auth.uid() = user_id);
