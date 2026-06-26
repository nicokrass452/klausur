import { supabase } from "../lib/supabase";
import type { MaterialChunk, MaterialChunkSource, StudyMaterial } from "../types";
import { extractPdfFromStorage, extractPdfText, PdfExtractionError } from "./pdfExtractionService";

/**
 * Splits raw text into retrievable chunks for the AI Coach. Chunking uses
 * paragraph boundaries where possible and falls back to fixed-size windows so
 * each chunk is small enough to fit several into the coach prompt token budget.
 */
export const CHUNK_TARGET_CHARS = 600;
export const CHUNK_MAX_CHARS = 900;
export const CHUNK_OVERLAP_CHARS = 80;
const TOKEN_CHARS_RATIO = 4; // rough heuristic: ~4 chars per token for German/English mix

export function estimateTokenCount(text: string): number {
  return Math.max(1, Math.ceil(text.length / TOKEN_CHARS_RATIO));
}

interface ChunkDraft {
  content: string;
  chunkIndex: number;
}

/** Pure splitter used by both the note and PDF pipelines. Exported for tests. */
export function splitTextIntoChunks(text: string, options?: { target?: number; max?: number; overlap?: number }): ChunkDraft[] {
  const target = options?.target ?? CHUNK_TARGET_CHARS;
  const max = options?.max ?? CHUNK_MAX_CHARS;
  const overlap = options?.overlap ?? CHUNK_OVERLAP_CHARS;
  const normalized = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!normalized) return [];

  // Prefer splitting on paragraph boundaries, then sentences, then fixed windows.
  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const drafts: ChunkDraft[] = [];
  let buffer = "";
  let chunkIndex = 0;

  const flush = () => {
    const trimmed = buffer.trim();
    if (!trimmed) return;
    if (trimmed.length <= max) {
      drafts.push({ content: trimmed, chunkIndex });
      chunkIndex += 1;
      buffer = "";
      return;
    }
    // Hard split overly long paragraphs into overlapping windows.
    for (let start = 0; start < trimmed.length; start += target - overlap) {
      const slice = trimmed.slice(start, start + max).trim();
      if (!slice) break;
      drafts.push({ content: slice, chunkIndex });
      chunkIndex += 1;
      if (start + max >= trimmed.length) break;
    }
    buffer = "";
  };

  for (const paragraph of paragraphs) {
    if (buffer.length + paragraph.length + 1 > target && buffer) {
      flush();
    }
    buffer = buffer ? `${buffer}\n${paragraph}` : paragraph;
    if (buffer.length >= target) {
      flush();
    }
  }
  flush();

  return drafts;
}

function mapChunkToRow(chunk: MaterialChunk, userId: string) {
  return {
    id: chunk.id,
    user_id: userId,
    material_id: chunk.materialId,
    exam_id: chunk.examId,
    chunk_index: chunk.chunkIndex,
    source: chunk.source,
    content: chunk.content,
    token_count: chunk.tokenCount,
    created_at: chunk.createdAt,
    updated_at: chunk.updatedAt,
    deleted_at: chunk.deletedAt ?? null
  };
}

function mapChunkFromRow(row: Record<string, unknown>): MaterialChunk {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    materialId: row.material_id as string,
    examId: row.exam_id as string,
    chunkIndex: row.chunk_index as number,
    source: row.source as MaterialChunkSource,
    content: row.content as string,
    tokenCount: row.token_count as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    deletedAt: (row.deleted_at as string | null) ?? null
  };
}

/** Replaces all chunks for a material with the freshly extracted set (atomic delete+insert). */
export async function replaceMaterialChunks(params: {
  userId: string;
  materialId: string;
  examId: string;
  source: MaterialChunkSource;
  text: string;
}): Promise<MaterialChunk[]> {
  if (!supabase) throw new Error("Supabase ist nicht konfiguriert.");

  const { userId, materialId, examId, source, text } = params;
  const drafts = splitTextIntoChunks(text);
  const now = new Date().toISOString();

  // Soft-delete any prior chunks for this material (preserves history, respects RLS).
  const { error: deleteError } = await supabase
    .from("material_chunks")
    .update({ deleted_at: now, updated_at: now })
    .eq("material_id", materialId)
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (deleteError) {
    throw new Error(`Material-Chunks konnten nicht zurückgesetzt werden: ${deleteError.message}`);
  }

  if (drafts.length === 0) return [];

  const rows = drafts.map((draft) =>
    mapChunkToRow(
      {
        id: `${materialId}-chunk-${draft.chunkIndex}`,
        userId,
        materialId,
        examId,
        chunkIndex: draft.chunkIndex,
        source,
        content: draft.content,
        tokenCount: estimateTokenCount(draft.content),
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      },
      userId
    )
  );

  const { data, error } = await supabase
    .from("material_chunks")
    .upsert(rows, { onConflict: "id" })
    .select("*");

  if (error) {
    throw new Error(`Material-Chunks konnten nicht gespeichert werden: ${error.message}`);
  }

  return (data ?? []).map((row) => mapChunkFromRow(row as Record<string, unknown>));
}

/**
 * Extracts text for a single material and writes the resulting chunks to the
 * `material_chunks` table. Notes are chunked directly from `material.content`;
 * PDFs are streamed from Supabase Storage (or IndexedDB when offline) and parsed
 * with `pdfjs-dist`.
 */
export async function buildChunksForMaterial(params: {
  material: StudyMaterial;
  userId: string;
  pdfBlob?: Blob;
}): Promise<MaterialChunk[]> {
  const { material, userId, pdfBlob } = params;

  if (material.type === "note") {
    const text = (material.content ?? "").trim();
    if (!text) return [];
    return replaceMaterialChunks({
      userId,
      materialId: material.id,
      examId: material.examId,
      source: "note",
      text
    });
  }

  if (material.type !== "pdf") return [];

  // PDF: prefer an in-memory blob (just uploaded) to skip a Storage round-trip.
  let text: string;
  if (pdfBlob) {
    text = await extractPdfText(pdfBlob);
  } else if (material.url) {
    text = await extractPdfFromStorage(material.url, userId);
  } else {
    return [];
  }

  if (!text.trim()) return [];

  return replaceMaterialChunks({
    userId,
    materialId: material.id,
    examId: material.examId,
    source: "pdf",
    text
  });
}

/** Removes all chunks for a material (used when a material is deleted). */
export async function deleteMaterialChunks(materialId: string, userId: string): Promise<void> {
  if (!supabase) return;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("material_chunks")
    .update({ deleted_at: now, updated_at: now })
    .eq("material_id", materialId)
    .eq("user_id", userId)
    .is("deleted_at", null);
  if (error) {
    // Swallow — chunk cleanup is best-effort; RLS still guarantees isolation.
    console.warn(`Material-Chunks für ${materialId} konnten nicht gelöscht werden:`, error.message);
  }
}

export { PdfExtractionError };
