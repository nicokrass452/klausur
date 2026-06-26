import { supabase } from "../lib/supabase";

/**
 * Extracts plain text from a PDF File/Blob using pdfjs-dist (lazy-loaded so the
 * ~1.5 MB library is only fetched when a user actually uploads a PDF).
 *
 * The extracted text is later chunked by `materialChunkService` and stored in the
 * `material_chunks` table so the AI Coach Edge Function can retrieve it.
 */

export const PDF_EXTRACTION_MAX_PAGES = 60;
const PDF_EXTRACTION_MAX_CHARS = 60_000;

type PdfjsModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfjsModule> | null = null;

async function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      // Vite resolves the worker URL at build time. Using the module URL keeps the
      // worker in a separate chunk and avoids bundling it into the main thread.
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

export class PdfExtractionError extends Error {
  constructor(message: string, public readonly reason: "unsupported" | "network" | "parse" | "unknown" = "unknown") {
    super(message);
    this.name = "PdfExtractionError";
  }
}

/** Reads a PDF File/Blob and returns its text content, page by page. */
export async function extractPdfText(file: Blob): Promise<string> {
  if (file.size === 0) {
    throw new PdfExtractionError("PDF ist leer.", "parse");
  }

  let pdfjs: PdfjsModule;
  try {
    pdfjs = await loadPdfjs();
  } catch (error) {
    throw new PdfExtractionError(
      `PDF-Bibliothek konnte nicht geladen werden: ${error instanceof Error ? error.message : "unbekannt"}`,
      "network"
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  let loadingTask;
  try {
    loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  } catch (error) {
    throw new PdfExtractionError(
      `PDF konnte nicht geöffnet werden: ${error instanceof Error ? error.message : "unbekannt"}`,
      "parse"
    );
  }

  let document;
  try {
    document = await loadingTask.promise;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/password|encrypt/i.test(message)) {
      throw new PdfExtractionError("Passwortgeschützte PDFs werden nicht unterstützt.", "unsupported");
    }
    throw new PdfExtractionError(`PDF konnte nicht gelesen werden: ${message}`, "parse");
  }

  const pageCount = Math.min(document.numPages, PDF_EXTRACTION_MAX_PAGES);
  const pages: string[] = [];
  let totalChars = 0;

  try {
    for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
      if (totalChars >= PDF_EXTRACTION_MAX_CHARS) break;
      const page = await document.getPage(pageIndex);
      try {
        const content = await page.getTextContent();
        const text = content.items
          .map((item) => ("str" in item ? (item as { str: string }).str : ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (text) {
          pages.push(text);
          totalChars += text.length;
        }
      } finally {
        page.cleanup();
      }
    }
  } finally {
    document.destroy();
  }

  return pages.join("\n\n").slice(0, PDF_EXTRACTION_MAX_CHARS);
}

/**
 * Downloads a private PDF from the Supabase materials bucket via a signed URL
 * (the bucket is RLS-protected) and extracts its text. Used by the chunk pipeline
 * when only the storage path is available (e.g. re-extraction on another device).
 */
export async function extractPdfFromStorage(
  storagePath: string,
  userId: string
): Promise<string> {
  if (!supabase) {
    throw new PdfExtractionError("Supabase ist nicht konfiguriert.", "network");
  }

  const { data, error } = await supabase.storage
    .from("materials")
    .createSignedUrl(storagePath, 60);

  if (error || !data?.signedUrl) {
    throw new PdfExtractionError(
      `PDF-Download fehlgeschlagen: ${error?.message ?? "keine URL"}`,
      "network"
    );
  }

  const response = await fetch(data.signedUrl, { credentials: "omit" });
  if (!response.ok) {
    throw new PdfExtractionError(`PDF-Download HTTP ${response.status}`, "network");
  }

  const blob = await response.blob();
  // Sanity check: the path must start with the user's id — defence in depth alongside RLS.
  if (!storagePath.startsWith(`${userId}/`)) {
    throw new PdfExtractionError("PDF-Pfad gehört nicht dem aktuellen Nutzer.", "unsupported");
  }
  return extractPdfText(blob);
}
