import { getDB } from "@/lib/db/indexeddb/client";
import { STORE_NAMES } from "@/lib/db/indexeddb/schema";
import type { SyncQueueEntry, SyncOperationKind } from "@/types/sync";

/**
 * Pending-operation queue for SyncEngine. Persisted in its own
 * IndexedDB store (not in memory), so the queue survives the app
 * being closed before sync completes (Architecture Proposal section
 * 4.1, step 3). Development Phase #36.
 */

/**
 * Adds an operation to the queue. If an entry for the same
 * (entityType, entityId) already exists AND is still unstarted
 * (retryCount === 0, meaning SyncEngine hasn't attempted it yet),
 * the new operation REPLACES it rather than adding a second entry —
 * e.g. two quick edits to the same task before the first sync cycle
 * runs should result in one push of the latest state, not two
 * separate pushes. Once an entry has been attempted at least once
 * (retryCount > 0), a new operation for the same entity is queued
 * as an additional, separate entry instead, since collapsing it at
 * that point could lose track of an in-flight retry.
 */
export async function enqueue(
  entityType: "task" | "space",
  entityId: string,
  kind: SyncOperationKind
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAMES.syncQueue, "readwrite");
  const existing = await tx.store.index("entityId").getAll(entityId);
  const collapsible = existing.find(
    (e) => e.entityType === entityType && e.retryCount === 0
  );

  if (collapsible) {
    await tx.store.put({
      ...collapsible,
      kind,
      queuedAt: new Date().toISOString(),
    });
  } else {
    const entry: SyncQueueEntry = {
      id: crypto.randomUUID(),
      entityType,
      entityId,
      kind,
      queuedAt: new Date().toISOString(),
      retryCount: 0,
    };
    await tx.store.put(entry);
  }
  await tx.done;
}

/** All queue entries, oldest first (global FIFO order). */
export async function getAllQueued(): Promise<SyncQueueEntry[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex(STORE_NAMES.syncQueue, "queuedAt");
  return all;
}

/** All queue entries for one entity, oldest first (FIFO-per-entity). */
export async function getQueuedForEntity(entityId: string): Promise<SyncQueueEntry[]> {
  const db = await getDB();
  const entries = await db.getAllFromIndex(STORE_NAMES.syncQueue, "entityId", entityId);
  return entries.sort((a, b) => Date.parse(a.queuedAt) - Date.parse(b.queuedAt));
}

/** Removes an entry — called after it's successfully pushed. */
export async function dequeue(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAMES.syncQueue, id);
}

/** Marks a failed attempt: bumps retryCount, records the error. */
export async function markFailed(id: string, errorMessage: string): Promise<void> {
  const db = await getDB();
  const entry = await db.get(STORE_NAMES.syncQueue, id);
  if (!entry) return;
  await db.put(STORE_NAMES.syncQueue, {
    ...entry,
    retryCount: entry.retryCount + 1,
    lastError: errorMessage,
  });
}

/** Count of pending entries — the basis for the UI sync indicator (Architecture Proposal section 5). */
export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  return db.count(STORE_NAMES.syncQueue);
}
