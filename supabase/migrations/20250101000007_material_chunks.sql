-- material_chunks: extracted text chunks from PDFs/notes that the AI Coach uses as
-- retrieval context. Each chunk is owned by exactly one user (RLS) and references its
-- source material and exam so the Edge Function can scope retrieval by exam.

create table if not exists public.material_chunks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  material_id text not null references public.study_materials(id) on delete cascade,
  exam_id text not null references public.exams(id) on delete cascade,
  chunk_index int not null,
  source text not null check (source in ('pdf','note')),
  content text not null,
  token_count int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.material_chunks enable row level security;

-- RLS: a user can only read/write their own chunks. The AI Coach Edge Function
-- forwards the user's JWT, so auth.uid() resolves server-side and cross-user reads
-- are blocked even when the function tries to query another user's rows.
create policy "material_chunks_select_own"
  on public.material_chunks
  for select
  using (auth.uid() = user_id);

create policy "material_chunks_insert_own"
  on public.material_chunks
  for insert
  with check (auth.uid() = user_id);

create policy "material_chunks_update_own"
  on public.material_chunks
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "material_chunks_delete_own"
  on public.material_chunks
  for delete
  using (auth.uid() = user_id);

-- Indexes: the Edge Function filters by user (RLS) and optionally scopes by exam,
-- then orders by chunk_index for stable chunk ordering.
create index if not exists material_chunks_user_id_idx
  on public.material_chunks (user_id)
  where deleted_at is null;

create index if not exists material_chunks_exam_id_idx
  on public.material_chunks (exam_id)
  where deleted_at is null;

create index if not exists material_chunks_material_id_idx
  on public.material_chunks (material_id)
  where deleted_at is null;

-- Full-text search index supports keyword-based chunk ranking inside the Edge Function.
create index if not exists material_chunks_content_fts_idx
  on public.material_chunks
  using gin (to_tsvector('simple', content));

comment on table public.material_chunks is 'Extracted text chunks from PDF/ note materials. Used by the AI Coach Edge Function as retrieval context. RLS restricts access to the owning user.';
