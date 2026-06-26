import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Static verification of the material_chunks migration. We can't run a real
 * Postgres instance in unit tests, so we inspect the SQL to catch regressions
 * that would weaken RLS or drop the indexes the Edge Function relies on.
 *
 * The runtime guarantee (RLS actually blocks cross-user reads) is provided by
 * Postgres + Supabase auth.uid() and is exercised manually / in staging.
 */
const migrationSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20250101000007_material_chunks.sql"),
  "utf8"
);

describe("material_chunks migration: RLS and indexes", () => {
  it("creates the material_chunks table with the required columns", () => {
    expect(migrationSql).toMatch(/create\s+table[^;]+public\.material_chunks/i);
    expect(migrationSql).toContain("user_id uuid not null references auth.users(id)");
    expect(migrationSql).toContain("material_id text not null references public.study_materials(id)");
    expect(migrationSql).toContain("exam_id text not null references public.exams(id)");
    expect(migrationSql).toContain("chunk_index int not null");
    expect(migrationSql).toContain("content text not null");
    expect(migrationSql).toContain("token_count int not null");
    expect(migrationSql).toContain("deleted_at timestamptz");
  });

  it("enables row level security on material_chunks", () => {
    expect(migrationSql).toMatch(/alter\s+table\s+public\.material_chunks\s+enable\s+row\s+level\s+security/i);
  });

  it("defines a SELECT policy scoped by auth.uid() = user_id (the AI Coach read path)", () => {
    expect(migrationSql).toMatch(/create\s+policy\s+"material_chunks_select_own"\s+on\s+public\.material_chunks\s+for\s+select\s+using\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i);
  });

  it("defines an INSERT policy with auth.uid() = user_id check", () => {
    expect(migrationSql).toMatch(/create\s+policy\s+"material_chunks_insert_own"[^;]+with\s+check\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i);
  });

  it("defines an UPDATE policy with both USING and WITH CHECK scoped by auth.uid()", () => {
    expect(migrationSql).toMatch(/create\s+policy\s+"material_chunks_update_own"[^;]+using\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)[^;]+with\s+check\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i);
  });

  it("defines a DELETE policy scoped by auth.uid() = user_id", () => {
    expect(migrationSql).toMatch(/create\s+policy\s+"material_chunks_delete_own"[^;]+for\s+delete\s+using\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i);
  });

  it("creates indexes on user_id, exam_id, and material_id (filtered to non-deleted rows)", () => {
    expect(migrationSql).toMatch(/create\s+index[^;]+material_chunks_user_id_idx[^;]+where\s+deleted_at\s+is\s+null/i);
    expect(migrationSql).toMatch(/create\s+index[^;]+material_chunks_exam_id_idx[^;]+where\s+deleted_at\s+is\s+null/i);
    expect(migrationSql).toMatch(/create\s+index[^;]+material_chunks_material_id_idx[^;]+where\s+deleted_at\s+is\s+null/i);
  });

  it("creates a GIN full-text search index on content for keyword ranking", () => {
    expect(migrationSql).toMatch(/create\s+index[^;]+material_chunks_content_fts_idx[^;]+using\s+gin\s*\(\s*to_tsvector\(\s*'simple'\s*,\s*content\s*\)\s*\)/i);
  });

  it("constrains source to pdf or note (prevents arbitrary source values)", () => {
    expect(migrationSql).toMatch(/source\s+text\s+not\s+null\s+check\s*\(\s*source\s+in\s*\(\s*'pdf'\s*,\s*'note'\s*\)\s*\)/i);
  });
});
