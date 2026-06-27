-- RLS verification assertions
-- Run these in the Supabase SQL Editor before a release to confirm RLS is enabled
-- on all application tables and that policies exist for each table.

-- Helper view to count policies per table

do $$
declare
  v_missing_rls text[] := array[]::text[];
  v_missing_policies text[] := array[]::text[];
begin
  -- Tables that must have RLS enabled
  select array_agg(tablename order by tablename)
  into v_missing_rls
  from pg_tables
  where schemaname = 'public'
    and tablename in (
      'profiles',
      'exams',
      'topics',
      'study_tasks',
      'study_materials',
      'learning_groups',
      'user_stats',
      'focus_sessions',
      'badges',
      'push_subscriptions',
      'device_sessions',
      'device_challenges'
    )
    and not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = tablename
        and c.relrowsecurity
    );

  if v_missing_rls is not null then
    raise exception 'RLS not enabled on tables: %', array_to_string(v_missing_rls, ', ');
  end if;

  -- Tables that must have at least one policy
  select array_agg(t.tablename order by t.tablename)
  into v_missing_policies
  from pg_tables t
  where t.schemaname = 'public'
    and t.tablename in (
      'profiles',
      'exams',
      'topics',
      'study_tasks',
      'study_materials',
      'learning_groups',
      'user_stats',
      'focus_sessions',
      'badges',
      'push_subscriptions'
    )
    and not exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = t.tablename
    );

  if v_missing_policies is not null then
    raise exception 'No policies defined for tables: %', array_to_string(v_missing_policies, ', ');
  end if;

  raise notice 'RLS verification passed: all required tables have RLS and policies.';
end
$$;
