-- Verifies the learning_groups RLS surface at migration time. Checking only
-- that "some policy exists" would pass a table whose UPDATE policy is missing
-- its WITH CHECK clause, so each required policy is asserted explicitly.
do $$
declare
  missing text;
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'learning_groups'
      and c.relrowsecurity
  ) then
    raise exception 'RLS not enabled on table: learning_groups';
  end if;

  select string_agg(required.cmd, ', ')
    into missing
  from (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) as required(cmd)
  where not exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'learning_groups'
      and p.cmd = required.cmd
  );

  if missing is not null then
    raise exception 'learning_groups is missing policies for: %', missing;
  end if;

  -- USING alone would let an owner rewrite user_id and hand the row to
  -- another account. WITH CHECK constrains the resulting row.
  if exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'learning_groups'
      and p.cmd = 'UPDATE'
      and p.with_check is null
  ) then
    raise exception 'learning_groups UPDATE policy is missing a WITH CHECK clause';
  end if;
end
$$;
