import { supabase } from "../lib/supabase";
import { saveMaterialBlob } from "./storageService";

export const MAX_MATERIAL_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MATERIAL_TYPES = ["application/pdf"];

export interface UploadMaterialResult {
  path: string;
  publicUrl?: string;
  fileName: string;
}

function buildMaterialPath(userId: string, examId: string, materialId: string, fileName: string): string {
  return `${userId}/${examId}/${materialId}/${fileName}`;
}

export function validateMaterialFile(file: File): void {
  if (!ALLOWED_MATERIAL_TYPES.includes(file.type)) {
    throw new Error("Nur PDF-Dateien werden unterstützt.");
  }
  if (file.size > MAX_MATERIAL_FILE_SIZE) {
    throw new Error("Datei ist zu groß. Maximal 10 MB erlaubt.");
  }
}

export async function uploadMaterialFile(
  file: File,
  examId: string,
  materialId: string,
  userId: string
): Promise<UploadMaterialResult> {
  validateMaterialFile(file);

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const path = buildMaterialPath(userId, examId, materialId, file.name);

  const { error } = await supabase.storage.from("materials").upload(path, file, {
    contentType: file.type,
    upsert: true
  });

  if (error) {
    throw new Error(`Upload fehlgeschlagen: ${error.message}`);
  }

  const { data } = supabase.storage.from("materials").getPublicUrl(path);

  return {
    path,
    publicUrl: data?.publicUrl,
    fileName: file.name
  };
}

export async function getMaterialUrl(path: string, expiresInSeconds = 60 * 60): Promise<string | undefined> {
  if (!supabase) return undefined;

  // The materials bucket is private, so we request a signed URL.
  const { data, error } = await supabase.storage.from("materials").createSignedUrl(path, expiresInSeconds);
  if (error) return undefined;
  return data.signedUrl;
}

export async function uploadMaterialWithOfflineFallback(
  file: File,
  examId: string,
  materialId: string,
  userId: string,
  isOnline: boolean
): Promise<UploadMaterialResult> {
  validateMaterialFile(file);

  if (isOnline && supabase) {
    try {
      return await uploadMaterialFile(file, examId, materialId, userId);
    } catch (error) {
      // Fall back to IndexedDB so the file is still available locally.
      await saveMaterialBlob(materialId, file);
      throw error;
    }
  }

  await saveMaterialBlob(materialId, file);
  return {
    path: buildMaterialPath(userId, examId, materialId, file.name),
    fileName: file.name
  };
}
