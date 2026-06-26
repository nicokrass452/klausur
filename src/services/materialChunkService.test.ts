import { describe, it, expect } from "vitest";
import {
  CHUNK_MAX_CHARS,
  CHUNK_TARGET_CHARS,
  estimateTokenCount,
  splitTextIntoChunks
} from "./materialChunkService";

describe("materialChunkService.estimateTokenCount", () => {
  it("estimates ~1 token per 4 characters, minimum 1", () => {
    expect(estimateTokenCount("")).toBe(1);
    expect(estimateTokenCount("abcd")).toBe(1);
    expect(estimateTokenCount("abcde")).toBe(2);
    expect(estimateTokenCount("abcdefgh")).toBe(2);
  });

  it("scales with longer text", () => {
    const short = estimateTokenCount("a".repeat(40));
    const long = estimateTokenCount("a".repeat(400));
    expect(long).toBeGreaterThan(short);
    expect(long).toBe(100);
  });
});

describe("materialChunkService.splitTextIntoChunks", () => {
  it("returns an empty array for empty input", () => {
    expect(splitTextIntoChunks("")).toEqual([]);
    expect(splitTextIntoChunks("   \n\n  ")).toEqual([]);
  });

  it("returns a single chunk when text fits the target size", () => {
    const text = "Kurze Notiz über Analysis.";
    const chunks = splitTextIntoChunks(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].content).toContain("Analysis");
  });

  it("splits on paragraph boundaries and assigns sequential chunk indexes", () => {
    const paragraph = "Absatz mit etwas Inhalt. ";
    const text = Array.from({ length: 10 }, () => paragraph).join("\n\n");
    const chunks = splitTextIntoChunks(text, { target: 80, max: 120, overlap: 10 });
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk, index) => {
      expect(chunk.chunkIndex).toBe(index);
    });
  });

  it("hard-splits overly long paragraphs into overlapping windows", () => {
    const longParagraph = "Wort ".repeat(400).trim(); // ~2000 chars, single paragraph
    const chunks = splitTextIntoChunks(longParagraph, { target: 300, max: 400, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk must respect the max size.
    chunks.forEach((chunk) => {
      expect(chunk.content.length).toBeLessThanOrEqual(400);
    });
  });

  it("normalizes whitespace (collapses runs of spaces, CRLF to LF)", () => {
    const text = "Zeile 1.\r\n\r\n\r\nZeile 2.   mit   vielen   Lücken.";
    const chunks = splitTextIntoChunks(text);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].content).not.toContain("\r");
    expect(chunks[0].content).not.toMatch(/ {2,}/);
  });

  it("respects the max size even when a single paragraph is huge", () => {
    const huge = "x".repeat(CHUNK_MAX_CHARS * 3);
    const chunks = splitTextIntoChunks(huge);
    chunks.forEach((chunk) => {
      expect(chunk.content.length).toBeLessThanOrEqual(CHUNK_MAX_CHARS);
    });
  });

  it("keeps chunks roughly around the target size for typical note text", () => {
    const text =
      "Die Ableitung einer Funktion beschreibt ihre momentane Änderungsrate. " +
      "Für f(x)=x^2 gilt f'(x)=2x. Die Stammfunktion von 2x ist x^2+C. " +
      "Stetigkeit bedeutet, dass die Funktion an jeder Stelle einen Grenzwert hat. " +
      "Differenzierbarkeit setzt Stetigkeit voraus, aber nicht umgekehrt.\n\n" +
      "Die Kettenregel lautet (f∘g)'(x) = f'(g(x)) * g'(x). " +
      "Die Produktregel lautet (f*g)'(x) = f'(x)*g(x) + f(x)*g'(x). " +
      "Die Quotientenregel lautet (f/g)'(x) = (f'(x)*g(x) - f(x)*g'(x)) / g(x)^2.";
    const chunks = splitTextIntoChunks(text, { target: 200, max: 300, overlap: 30 });
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) => {
      expect(chunk.content.length).toBeLessThanOrEqual(300);
      expect(chunk.content.length).toBeGreaterThan(0);
    });
  });
});
