import { describe, it, expect } from "vitest";
import {
  buildMaterialContextSection,
  buildMaterialContextText,
  extractKeywords,
  MATERIAL_CONTEXT_MAX_CHUNKS,
  MATERIAL_CONTEXT_TOKEN_BUDGET,
  rankChunksByQuery,
  truncateChunksToTokenBudget,
  type MaterialChunkRow
} from "./materialContext.ts";

function makeChunk(overrides: Partial<MaterialChunkRow> = {}): MaterialChunkRow {
  return {
    id: "chunk-1",
    material_id: "mat-1",
    exam_id: "exam-1",
    chunk_index: 0,
    source: "note",
    content: "Default chunk content",
    token_count: 50,
    ...overrides
  };
}

describe("materialContext.extractKeywords", () => {
  it("lowercases, strips punctuation, and drops stopwords", () => {
    const keywords = extractKeywords("Was ist die Analysis eigentlich? the theory!");
    expect(keywords).toContain("analysis");
    expect(keywords).toContain("theory");
    expect(keywords).not.toContain("was");
    expect(keywords).not.toContain("ist");
    expect(keywords).not.toContain("die");
    expect(keywords).not.toContain("the");
  });

  it("returns empty array for empty input", () => {
    expect(extractKeywords("")).toEqual([]);
    expect(extractKeywords("   ")).toEqual([]);
  });

  it("drops tokens shorter than the minimum length", () => {
    const keywords = extractKeywords("a ab abc abcd");
    expect(keywords).toEqual(["abc", "abcd"]);
  });

  it("deduplicates tokens", () => {
    const keywords = extractKeywords("analysis analysis Analysis");
    expect(keywords).toEqual(["analysis"]);
  });
});

describe("materialContext.rankChunksByQuery", () => {
  it("returns chunks with keyword matches, highest score first", () => {
    const chunks = [
      makeChunk({ id: "a", content: "Analysis der Funktionen und Ableitungen.", token_count: 50, chunk_index: 0 }),
      makeChunk({ id: "b", content: "Lineare Algebra: Vektoren und Matrizen.", token_count: 50, chunk_index: 1 }),
      makeChunk({ id: "c", content: "Funktionen Analysis Stetigkeit Differenzierbarkeit.", token_count: 50, chunk_index: 2 })
    ];
    const ranked = rankChunksByQuery(chunks, "Erkläre Analysis und Funktionen");
    expect(ranked.length).toBeGreaterThan(0);
    // Both analysis-matching chunks should appear before the algebra chunk.
    const ids = ranked.map((c) => c.id);
    expect(ids).toContain("a");
    expect(ids).toContain("c");
    expect(ids).not.toContain("b");
  });

  it("filters out chunks with zero matches", () => {
    const chunks = [
      makeChunk({ id: "match", content: "Analysis und Funktionen", token_count: 50 }),
      makeChunk({ id: "nomatch", content: "Lineare Algebra Vektoren", token_count: 50 })
    ];
    const ranked = rankChunksByQuery(chunks, "Analysis Funktionen");
    expect(ranked.map((c) => c.id)).toEqual(["match"]);
  });

  it("falls back to natural order when query has no keywords", () => {
    const chunks = [
      makeChunk({ id: "a", content: "Alpha", token_count: 50, chunk_index: 0 }),
      makeChunk({ id: "b", content: "Beta", token_count: 50, chunk_index: 1 })
    ];
    const ranked = rankChunksByQuery(chunks, "??");
    expect(ranked.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("caps the result at MATERIAL_CONTEXT_MAX_CHUNKS", () => {
    const chunks = Array.from({ length: 20 }, (_, i) =>
      makeChunk({ id: `c${i}`, content: `Analysis chunk ${i}`, token_count: 50, chunk_index: i })
    );
    const ranked = rankChunksByQuery(chunks, "Analysis");
    expect(ranked.length).toBeLessThanOrEqual(MATERIAL_CONTEXT_MAX_CHUNKS);
  });

  it("breaks ties by chunk_index for deterministic ordering", () => {
    const chunks = [
      makeChunk({ id: "a", content: "Analysis", token_count: 50, chunk_index: 5 }),
      makeChunk({ id: "b", content: "Analysis", token_count: 50, chunk_index: 1 }),
      makeChunk({ id: "c", content: "Analysis", token_count: 50, chunk_index: 3 })
    ];
    const ranked = rankChunksByQuery(chunks, "Analysis");
    expect(ranked.map((c) => c.id)).toEqual(["b", "c", "a"]);
  });
});

describe("materialContext.truncateChunksToTokenBudget", () => {
  it("keeps chunks until the token budget is exhausted", () => {
    const chunks = [
      makeChunk({ id: "a", token_count: 600 }),
      makeChunk({ id: "b", token_count: 600 }),
      makeChunk({ id: "c", token_count: 600 }),
      makeChunk({ id: "d", token_count: 600 })
    ];
    const selected = truncateChunksToTokenBudget(chunks, 1500);
    // 600 + 600 = 1200, third would push to 1800 > 1500 -> stop.
    expect(selected.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("returns all chunks when total is within budget", () => {
    const chunks = [makeChunk({ id: "a", token_count: 100 }), makeChunk({ id: "b", token_count: 100 })];
    const selected = truncateChunksToTokenBudget(chunks, MATERIAL_CONTEXT_TOKEN_BUDGET);
    expect(selected.length).toBe(2);
  });

  it("skips a chunk that does not fit even if it is the first", () => {
    const chunks = [makeChunk({ id: "huge", token_count: 10_000 })];
    const selected = truncateChunksToTokenBudget(chunks, 2000);
    expect(selected).toEqual([]);
  });
});

describe("materialContext.buildMaterialContextText", () => {
  it("renders each chunk with a source label and index", () => {
    const chunks = [
      makeChunk({ source: "pdf", content: "Page one text.", chunk_index: 0 }),
      makeChunk({ source: "note", content: "Note text.", chunk_index: 1 })
    ];
    const text = buildMaterialContextText(chunks);
    expect(text).toContain("[1] Quelle: PDF");
    expect(text).toContain("Page one text.");
    expect(text).toContain("[2] Quelle: Notiz");
    expect(text).toContain("Note text.");
    expect(text).toContain("---");
  });

  it("returns empty string for no chunks", () => {
    expect(buildMaterialContextText([])).toBe("");
  });
});

describe("materialContext.buildMaterialContextSection", () => {
  it("returns null when no chunks match the query (empty fallback)", () => {
    const chunks = [makeChunk({ content: "Lineare Algebra", token_count: 50 })];
    expect(buildMaterialContextSection(chunks, "Analysis")).toBeNull();
  });

  it("returns null for empty chunk list", () => {
    expect(buildMaterialContextSection([], "Analysis")).toBeNull();
  });

  it("returns a labelled section when chunks match", () => {
    const chunks = [makeChunk({ content: "Analysis und Funktionen", token_count: 50 })];
    const section = buildMaterialContextSection(chunks, "Analysis");
    expect(section).not.toBeNull();
    expect(section).toContain("Kontext aus deinen hochgeladenen Materialien");
    expect(section).toContain("Analysis und Funktionen");
  });

  it("respects the token budget: drops chunks that would overflow after higher-ranked ones", () => {
    // The small chunk ranks higher (score normalized by token count) and fits the budget;
    // the huge matching chunk is then dropped because small+huge > budget.
    const chunks = [
      makeChunk({ content: "Analysis concepts", token_count: 200, chunk_index: 0 }),
      makeChunk({ content: "Analysis deep dive details", token_count: 1900, chunk_index: 1 })
    ];
    const section = buildMaterialContextSection(chunks, "Analysis");
    expect(section).toContain("Analysis concepts");
    expect(section).not.toContain("deep dive details");
  });
});
