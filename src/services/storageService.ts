import { openDB } from "idb";

const DB_NAME = "klausurplaner-materials";
const STORE_NAME = "files";

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    }
  });
}

export async function saveMaterialBlob(id: string, file: File): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, file, id);
}

export async function getMaterialBlob(id: string): Promise<File | undefined> {
  const db = await getDb();
  const file = await db.get(STORE_NAME, id);
  return file as File | undefined;
}
