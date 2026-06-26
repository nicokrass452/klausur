// Pure helpers for retrieving, ranking, and formatting a user's material chunks
// inside the AI Coach Edge Function. Kept Deno-free so they can be unit-tested
// with Vitest by importing this file directly. The Deno-only I/O (PostgREST
// fetch, env access) lives in index.ts.

export interface MaterialChunkRow {
  id: string;
  material_id: string;
  exam_id: string;
  chunk_index: number;
  source: "pdf" | "note";
  content: string;
  token_count: number;
}

export const MATERIAL_CONTEXT_TOKEN_BUDGET = 2000;
export const MATERIAL_CONTEXT_MAX_CHUNKS = 8;
export const MATERIAL_CONTEXT_MIN_QUERY_LENGTH = 3;

/** German + English stopwords excluded from keyword scoring. */
const STOPWORDS = new Set([
  "der", "die", "das", "den", "dem", "des", "ein", "eine", "einer", "eines", "einem", "einen",
  "und", "oder", "aber", "ist", "sind", "war", "waren", "sein", "haben", "hat", "hatte",
  "mit", "von", "zu", "zur", "zum", "auf", "in", "an", "bei", "fuer", "ueber", "unter",
  "nicht", "kein", "keine", "auch", "noch", "schon", "nur", "sehr", "mehr", "wie", "was",
  "ich", "du", "er", "sie", "es", "wir", "ihr", "mich", "dich", "mir", "dir", "uns", "euch",
  "mein", "dein", "sein", "ihr", "unser", "euer",
  "the", "a", "an", "of", "to", "in", "on", "at", "for", "with", "and", "or", "but",
  "is", "are", "was", "were", "be", "have", "has", "had", "do", "does", "did",
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
  "my", "your", "his", "its", "our", "their", "this", "that", "these", "those"
]);

/** Lowercases, strips punctuation, and returns the set of non-stopword tokens. */
export function extractKeywords(text: string): string[] {
  if (!text) return [];
  const normalized = text.toLowerCase().replace(/[^a-z0-9äöüßéàèêç\-_\s]/gi, " ");
  const tokens = normalized.split(/\s+/).filter((token) => token.length >= MATERIAL_CONTEXT_MIN_QUERY_LENGTH && !STOPWORDS.has(token));
  return [...new Set(tokens)];
}

interface RankedChunk {
  chunk: MaterialChunkRow;
  score: number;
}

/**
 * Ranks chunks by keyword overlap with the query. Score is normalized by chunk
 * length so short keyword-stuffed chunks don't dominate. Stable tie-break by
 * chunk_index so retrieval is deterministic for tests.
 */
export function rankChunksByQuery(chunks: MaterialChunkRow[], query: string): MaterialChunkRow[] {
  const keywords = extractKeywords(query);
  if (keywords.length === 0 || chunks.length === 0) {
    // No usable query: return chunks in their natural order (limited by MAX_CHUNKS).
    return [...chunks].slice(0, MATERIAL_CONTEXT_MAX_CHUNKS);
  }

  const keywordSet = new Set(keywords);
  const scored: RankedChunk[] = chunks.map((chunk) => {
    const tokens = extractKeywords(chunk.content);
    let matches = 0;
    for (const token of tokens) {
      if (keywordSet.has(token)) matches += 1;
    }
    // Normalize by chunk length (in 50-token buckets) so longer chunks don't dominate.
    const lengthFactor = Math.max(1, Math.ceil(chunk.token_count / 50));
    return { chunk, score: matches / lengthFactor };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Stable tie-break: lower chunk_index first (keeps reading order within a material).
    return a.chunk.chunk_index - b.chunk.chunk_index;
  });

  return scored
    .filter((entry) => entry.score > 0)
    .slice(0, MATERIAL_CONTEXT_MAX_CHUNKS)
    .map((entry) => entry.chunk);
}

/**
 * Trims the ranked chunk list so the combined token_count stays within the budget.
 * Chunks are added greedily until the budget is exhausted; partial chunks are not
 * returned (chunks are the unit of retrieval).
 */
export function truncateChunksToTokenBudget(
  chunks: MaterialChunkRow[],
  budget: number = MATERIAL_CONTEXT_TOKEN_BUDGET
): MaterialChunkRow[] {
  const selected: MaterialChunkRow[] = [];
  let used = 0;
  for (const chunk of chunks) {
    if (used + chunk.token_count > budget) break;
    selected.push(chunk);
    used += chunk.token_count;
  }
  return selected;
}

/** Renders the selected chunks into a single text block for the coach prompt. */
export function buildMaterialContextText(chunks: MaterialChunkRow[]): string {
  if (chunks.length === 0) return "";
  const parts = chunks.map((chunk, index) => {
    const sourceLabel = chunk.source === "pdf" ? "PDF" : "Notiz";
    return `[${index + 1}] Quelle: ${sourceLabel} (Chunk ${chunk.chunk_index + 1})\n${chunk.content}`;
  });
  return parts.join("\n\n---\n\n");
}

/**
 * Composes the material context section that gets injected into the coach prompt.
 * Returns null when there is nothing to inject (so callers can skip the section).
 */
export function buildMaterialContextSection(chunks: MaterialChunkRow[], query: string): string | null {
  const ranked = rankChunksByQuery(chunks, query);
  const truncated = truncateChunksToTokenBudget(ranked);
  if (truncated.length === 0) return null;
  const text = buildMaterialContextText(truncated);
  if (!text) return null;
  return `Kontext aus deinen hochgeladenen Materialien (verwende nur, was hilfreich ist; erfinde nichts):\n${text}`;
}
