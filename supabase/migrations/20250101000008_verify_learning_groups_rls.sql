do $$
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

  if not exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'learning_groups'
  ) then
    raise exception 'No policies defined for table: learning_groups';
  end if;
end
$$;
