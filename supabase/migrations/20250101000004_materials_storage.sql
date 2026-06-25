-- Storage bucket for study materials (PDFs etc.)
-- Buckets are managed in storage.buckets; the bucket itself is usually created via dashboard or CLI,
-- but we guard the insert so this migration stays idempotent when run in the SQL Editor.

insert into storage.buckets (id, name, public)
select 'materials', 'materials', false
where not exists (select 1 from storage.buckets where id = 'materials');

-- RLS policies: users can only access their own files in the materials bucket.
-- File path convention: <user_id>/<exam_id>/<material_id>/<file_name>

create policy "materials_select_own"
  on storage.objects
  for select
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "materials_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'materials'
    and owner = auth.uid()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "materials_update_own"
  on storage.objects
  for update
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (
    bucket_id = 'materials'
    and owner = auth.uid()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "materials_delete_own"
  on storage.objects
  for delete
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);

comment on table storage.buckets is 'Application storage buckets. The materials bucket stores private PDF study materials.';
