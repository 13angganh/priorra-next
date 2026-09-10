import { taskRepository, spaceRepository } from "@/lib/db/repositories/singletons";
import { FirestoreTaskRepository } from "@/lib/db/repositories/firestore-task-repository";
import { FirestoreSpaceRepository } from "@/lib/db/repositories/firestore-space-repository";
import { getAllQueued, getQueuedForEntity, dequeue, markFailed } from "./sync-queue";
import { resolveConflict } from "./conflict-resolution";
import { onReconnect, isOnline } from "./network-status";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { getDB } from "@/lib/db/indexeddb/client";
import { STORE_NAMES } from "@/lib/db/indexeddb/schema";
import type { SyncQueueEntry } from "@/types/sync";

/**
 * SyncEngine — orchestrator that reads the sync queue and pushes /
 * pulls against Firestore, with retry. This is the orchestration
 * layer that uses BOTH repositories; it lives outside lib/db/ on
 * purpose so that unit tests for the IndexedDB repository never
 * need to mock Firebase (Architecture Proposal section 2, "Catatan
 * penempatan"). Development Phase #36.
 *
 * The UI never awaits this — see Architecture Proposal section 4.1,
 * step 4: "Tidak ada langkah menunggu Firestore di sini."
 *
 * If Firebase isn't configured (see isFirebaseConfigured()), every
 * exported function here becomes a safe no-op rather than throwing
 * — the app runs fully offline-only in that case, exactly as it
 * does before this phase existed.
 */

const firestoreTasks = new FirestoreTaskRepository();
const firestoreSpaces = new FirestoreSpaceRepository();

const MAX_RETRY_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1000;

/** Exponential backoff: 1s, 2s, 4s, 8s, 16s. Exported for tests. */
export function backoffDelayMs(retryCount: number): number {
  return BASE_BACKOFF_MS * 2 ** retryCount;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Pushes a single queue entry. Returns true on success (caller
 * should dequeue), false on failure (caller should NOT dequeue —
 * markFailed has already been called).
 */
async function pushEntry(entry: SyncQueueEntry): Promise<boolean> {
  try {
    if (entry.kind === "delete") {
      // Deletes are tombstones in IndexedDB (deletedAt set, row
      // still present) — pushing IS just pushing the current
      // (now-tombstoned) record, same as create/update. Firestore
      // gets a document with deletedAt set; a future pull on
      // another device will see it and can treat it as deleted
      // there too. There is no separate "delete document" Firestore
      // call — the tombstone field carries that meaning across
      // devices, consistent with how IndexedDB itself represents it.
    }

    if (entry.entityType === "task") {
      const task = await taskRepository.getById(entry.entityId);
      // getById() excludes tombstoned rows — re-fetch including
      // tombstones for a delete push specifically.
      const record = task ?? (await getTombstonedTask(entry.entityId));
      if (!record) return true; // nothing to push (e.g. since-superseded) — treat as done
      await firestoreTasks.push(record);
    } else {
      const space = await spaceRepository.getById(entry.entityId);
      const record = space ?? (await getTombstonedSpace(entry.entityId));
      if (!record) return true;
      await firestoreSpaces.push(record);
    }
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markFailed(entry.id, message);
    return false;
  }
}

// getById() on both repositories filters out soft-deleted rows by
// design (correct for normal reads) — these two helpers read the
// raw row directly so a "delete" queue entry can still be pushed
// (with deletedAt set) rather than silently skipped.
async function getTombstonedTask(id: string) {
  const db = await getDB();
  return db.get(STORE_NAMES.tasks, id);
}
async function getTombstonedSpace(id: string) {
  const db = await getDB();
  return db.get(STORE_NAMES.spaces, id);
}

/**
 * Drains the full queue: FIFO per entity (Architecture Proposal
 * section 4.3 — "FIFO per entity untuk menghindari race pada task
 * yang sama"), with exponential backoff between retries of the SAME
 * entry. Entries for DIFFERENT entities are independent and don't
 * block each other.
 */
export async function drainQueue(): Promise<void> {
  if (!isFirebaseConfigured() || !isOnline()) return;

  const all = await getAllQueued();
  const entityIds = [...new Set(all.map((e) => e.entityId))];

  // Different entities drain independently and concurrently; within
  // one entity, entries are strictly sequential (FIFO).
  await Promise.all(entityIds.map((id) => drainEntityQueue(id)));
}

async function drainEntityQueue(entityId: string): Promise<void> {
  const entries = await getQueuedForEntity(entityId);
  for (const entry of entries) {
    if (entry.retryCount >= MAX_RETRY_ATTEMPTS) continue; // give up on this entry, leave it queued for visibility

    if (entry.retryCount > 0) {
      await wait(backoffDelayMs(entry.retryCount));
      if (!isOnline()) return; // lost connection again mid-backoff; stop this entity's drain, resume next cycle
    }

    const succeeded = await pushEntry(entry);
    if (succeeded) {
      await dequeue(entry.id);
    } else {
      return; // stop processing this entity's remaining entries until the failed one is resolved (FIFO)
    }
  }
}

/**
 * Pulls all remote changes and reconciles them against local
 * IndexedDB using last-write-wins (Architecture Proposal section
 * 4.2). Used on reconnect (4.3) and can be called for an initial
 * sync after sign-in.
 */
export async function pullChanges(): Promise<void> {
  if (!isFirebaseConfigured() || !isOnline()) return;

  try {
    const [remoteTasks, remoteSpaces] = await Promise.all([
      firestoreTasks.pullAll(),
      firestoreSpaces.pullAll(),
    ]);

    for (const remote of remoteTasks) {
      const local = await taskRepository.getById(remote.id);
      const resolution = resolveConflict({
        serverUpdatedAt: remote.serverUpdatedAt,
        localUpdatedAt: local?.localUpdatedAt ?? "1970-01-01T00:00:00.000Z",
        localSyncState: local?.syncState ?? "synced",
      });
      if (resolution === "server-wins" || !local) {
        await applyRemoteTask(remote);
      }
      // "local-wins" and "no-conflict": leave local as-is; the queue
      // (if local has pending changes) will push it on the next drain.
    }

    for (const remote of remoteSpaces) {
      const local = await spaceRepository.getById(remote.id);
      const resolution = resolveConflict({
        serverUpdatedAt: remote.serverUpdatedAt,
        localUpdatedAt: local?.localUpdatedAt ?? "1970-01-01T00:00:00.000Z",
        localSyncState: local?.syncState ?? "synced",
      });
      if (resolution === "server-wins" || !local) {
        await applyRemoteSpace(remote);
      }
    }
  } catch (err) {
    // A pull failure (e.g. auth error, network blip) must never
    // become an unhandled rejection — startSyncEngine() calls this
    // fire-and-forget, exactly per Architecture Proposal section
    // 4.1 step 4: "Tidak ada langkah menunggu Firestore di sini."
    // Logged for visibility; the next reconnect/poll cycle will
    // simply try again.
    const message = err instanceof Error ? err.message : String(err);
    console.error("[SyncEngine] pullChanges failed:", message);
  }
}

// These write the server's copy directly into IndexedDB WITHOUT
// going through IndexedDB{Task,Space}Repository's normal
// create/update methods — those methods set syncState:'pending' and
// enqueue a push, which would be wrong here: this data just CAME
// FROM the server, it doesn't need to be pushed back to it.
async function applyRemoteTask(remote: Awaited<ReturnType<FirestoreTaskRepository["pullAll"]>>[number]) {
  const db = await getDB();
  const { serverUpdatedAt, ...task } = remote;
  await db.put(STORE_NAMES.tasks, {
    ...task,
    syncState: "synced",
    localUpdatedAt: serverUpdatedAt,
    serverUpdatedAt,
  });
}
async function applyRemoteSpace(remote: Awaited<ReturnType<FirestoreSpaceRepository["pullAll"]>>[number]) {
  const db = await getDB();
  const { serverUpdatedAt, ...space } = remote;
  await db.put(STORE_NAMES.spaces, {
    ...space,
    syncState: "synced",
    localUpdatedAt: serverUpdatedAt,
    serverUpdatedAt,
  });
}

let engineStarted = false;
let stopReconnectListener: (() => void) | null = null;

/**
 * Starts the sync engine: drains the queue immediately (if online),
 * and wires up the offline->online reconnect flow (Architecture
 * Proposal section 4.3: drain first, then one full pull). Call once
 * from the app shell. Idempotent — safe to call more than once.
 */
export function startSyncEngine(): () => void {
  if (engineStarted) return stopReconnectListener ?? (() => {});
  engineStarted = true;

  if (isFirebaseConfigured()) {
    drainQueue()
      .then(() => pullChanges())
      .catch((err) => {
        // Defense in depth: drainQueue/pullChanges already handle
        // their own errors internally (per-entry for drainQueue,
        // a wrapping try/catch for pullChanges) and should never
        // reach here — but startSyncEngine() is called from a
        // useEffect with no caller awaiting it, so ANY escaping
        // rejection here would surface as an unhandled promise
        // rejection with no useful stack for whoever's debugging
        // a real deployment. This is the last line of defense.
        console.error("[SyncEngine] unexpected error during startup sync:", err);
      });

    stopReconnectListener = onReconnect(() => {
      drainQueue()
        .then(() => pullChanges())
        .catch((err) => {
          console.error("[SyncEngine] unexpected error during reconnect sync:", err);
        });
    });
  }

  return () => {
    stopReconnectListener?.();
    engineStarted = false;
  };
}

/** Test-only: resets module state between tests. */
export function __resetSyncEngineForTests(): void {
  engineStarted = false;
  stopReconnectListener = null;
}
