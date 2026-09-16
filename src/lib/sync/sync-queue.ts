import { getDB } from "@/lib/db/indexeddb/client";
import { STORE_NAMES } from "@/lib/db/indexeddb/schema";
import type { SyncQueueEntry, SyncOperationKind } from "@/types/sync";
import { MAX_SYNC_RETRY_ATTEMPTS } from "@/types/sync";

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

/**
 * Resets retryCount to 0 for every entry that had given up
 * (retryCount >= MAX_SYNC_RETRY_ATTEMPTS), so the next drainQueue()
 * call will actually attempt them again instead of skipping them —
 * drainEntityQueue's give-up check only looks at retryCount, it has
 * no other memory of "already gave up" to clear. Used by the
 * Settings page's manual "Retry sync" action (see /settings), for
 * when the underlying problem (e.g. Firestore rules not published
 * yet) has since been fixed.
 */
export async function retryStuckEntries(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAMES.syncQueue, "readwrite");
  const all = await tx.store.getAll();
  await Promise.all(
    all
      .filter((entry) => entry.retryCount >= MAX_SYNC_RETRY_ATTEMPTS)
      .map((entry) => tx.store.put({ ...entry, retryCount: 0, lastError: undefined }))
  );
  await tx.done;
}

/**
 * Breakdown of the queue's current state — the basis for the UI
 * sync indicator (Architecture Proposal section 5).
 *
 *   activeCount — entries SyncEngine is still actively retrying
 *                 (retryCount < MAX_SYNC_RETRY_ATTEMPTS)
 *   stuckCount  — entries SyncEngine has given up on (exhausted all
 *                 retries) but which are still sitting in the queue
 *
 * REPLACES a previous plain getPendingCount(): number — see
 * MAX_SYNC_RETRY_ATTEMPTS's docstring in types/sync.ts for the real
 * bug this fixes (an indefinitely-stuck "Menyinkronkan..." UI state
 * once an entry exhausted its retries, because a single undifferentiated
 * count couldn't tell "still trying" from "gave up").
 */
export interface SyncQueueSummary {
  activeCount: number;
  stuckCount: number;
}

export async function getSyncQueueSummary(): Promise<SyncQueueSummary> {
  const db = await getDB();
  const all = await db.getAll(STORE_NAMES.syncQueue);
  let activeCount = 0;
  let stuckCount = 0;
  for (const entry of all) {
    if (entry.retryCount >= MAX_SYNC_RETRY_ATTEMPTS) {
      stuckCount++;
    } else {
      activeCount++;
    }
  }
  return { activeCount, stuckCount };
}
