-- The initial schema (20240101000000_init.sql) declared every UPDATE policy
-- with a USING clause but no WITH CHECK. USING only decides *which rows* a
-- user may update; it places no constraint on the row that results. Without
-- WITH CHECK an authenticated user can update a row they own and rewrite its
-- ownership column, moving that row into another user's account.
--
-- init.sql is already applied everywhere, so the fix ships here as a follow-up
-- migration that recreates each affected policy. Re-runnable by design.

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "exams_update_own" on public.exams;
create policy "exams_update_own" on public.exams
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "topics_update_own" on public.topics;
create policy "topics_update_own" on public.topics
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "study_tasks_update_own" on public.study_tasks;
create policy "study_tasks_update_own" on public.study_tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "study_materials_update_own" on public.study_materials;
create policy "study_materials_update_own" on public.study_materials
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_stats_update_own" on public.user_stats;
create policy "user_stats_update_own" on public.user_stats
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "focus_sessions_update_own" on public.focus_sessions;
create policy "focus_sessions_update_own" on public.focus_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "badges_update_own" on public.badges;
create policy "badges_update_own" on public.badges
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Fail loudly if any UPDATE policy in the public schema still lacks WITH CHECK.
do $$
declare
  offending text;
begin
  select string_agg(format('%s.%s', tablename, policyname), ', ')
    into offending
  from pg_policies
  where schemaname = 'public'
    and cmd = 'UPDATE'
    and with_check is null;

  if offending is not null then
    raise exception 'UPDATE policies without WITH CHECK: %', offending;
  end if;
end
$$;
