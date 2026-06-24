import { openDB } from "idb";
import type { OfflineSnapshot, PendingWrite } from "../types";

const DB_NAME = "klausurplaner-offline";
const PENDING_WRITES_STORE = "pendingWrites";
const META_STORE = "meta";
const CACHED_SNAPSHOT_KEY = "cachedSnapshot";
const LAST_SYNCED_AT_KEY = "lastSyncedAt";

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(PENDING_WRITES_STORE)) {
        db.createObjectStore(PENDING_WRITES_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    }
  });
}

export async function enqueuePendingWrite(write: PendingWrite): Promise<void> {
  const db = await getDb();
  await db.put(PENDING_WRITES_STORE, write);
}

export async function getPendingWrites(userId?: string): Promise<PendingWrite[]> {
  const db = await getDb();
  const writes = (await db.getAll(PENDING_WRITES_STORE)) as PendingWrite[];
  return writes
    .filter((write) => !userId || write.userId === userId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function removePendingWrite(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(PENDING_WRITES_STORE, id);
}

export async function clearPendingWrites(userId?: string): Promise<void> {
  const db = await getDb();
  if (!userId) {
    await db.clear(PENDING_WRITES_STORE);
    return;
  }
  const writes = await getPendingWrites(userId);
  await Promise.all(writes.map((write) => db.delete(PENDING_WRITES_STORE, write.id)));
}

export async function saveCachedSnapshot(snapshot: OfflineSnapshot): Promise<void> {
  const db = await getDb();
  await db.put(META_STORE, snapshot, CACHED_SNAPSHOT_KEY);
}

export async function getCachedSnapshot(): Promise<OfflineSnapshot | undefined> {
  const db = await getDb();
  return db.get(META_STORE, CACHED_SNAPSHOT_KEY) as Promise<OfflineSnapshot | undefined>;
}

export async function saveLastSyncedAt(lastSyncedAt: string): Promise<void> {
  const db = await getDb();
  await db.put(META_STORE, lastSyncedAt, LAST_SYNCED_AT_KEY);
}

export async function getLastSyncedAt(): Promise<string | undefined> {
  const db = await getDb();
  return db.get(META_STORE, LAST_SYNCED_AT_KEY) as Promise<string | undefined>;
}
