/**
 * Shared sync-related types (Development Phase #23).
 *
 * Kept separate from task.ts/space.ts so sync bookkeeping types
 * don't leak into files that should stay meaningful even in
 * Architecture A (Full Offline), where sync doesn't apply.
 */

/**
 * Max push attempts for a single SyncQueueEntry before SyncEngine
 * gives up on it (see backoffDelayMs in lib/sync/sync-engine.ts —
 * 1s/2s/4s/8s/16s across these 5 attempts). Kept here, not in
 * sync-engine.ts, specifically so lib/sync/sync-queue.ts can import
 * it too without sync-queue.ts <-> sync-engine.ts becoming a
 * circular dependency (sync-engine.ts already imports FROM
 * sync-queue.ts).
 *
 * REAL BUG this constant exists to fix: an entry that exhausts all
 * retries used to stay counted as "pending" forever — SyncEngine
 * gave up silently, but the UI's "Menyinkronkan..." indicator had
 * no way to know that, and kept showing "syncing" indefinitely even
 * though nothing was actually being retried anymore (confirmed by
 * reading the exact code: drainEntityQueue's give-up branch and
 * useSyncStatus's naive `pendingCount > 0` check, together). Fixed
 * by having getPendingCount() (sync-queue.ts) and useSyncStatus
 * (hooks/use-sync-status.ts) both check retryCount against this
 * same constant, so "still actively retrying" and "gave up, needs
 * attention" are distinguishable — not just implicitly, in two
 * different files that used to silently disagree.
 */
export const MAX_SYNC_RETRY_ATTEMPTS = 5;

/**
 * Per-record sync state. Every syncable entity (Task, Space) carries
 * this alongside its domain fields.
 *
 *   'synced'  — local and server copies match, nothing pending
 *   'pending' — local write not yet pushed to Firestore
 *   'error'   — last push attempt failed; SyncEngine will retry
 */
export type SyncState = "synced" | "pending" | "error";

/**
 * Operation kind recorded in the sync queue.
 */
export type SyncOperationKind = "create" | "update" | "delete";

/**
 * A single pending operation persisted in the sync queue
 * (lib/sync/sync-queue.ts), stored in its own IndexedDB object
 * store separate from domain data (Architecture Proposal section
 * 4.1, step 3) — so the queue survives the app closing before sync
 * completes.
 */
export interface SyncQueueEntry {
  /** Unique id for this queue entry (not the entity's own id). */
  id: string;
  /** Which repository this entry targets. */
  entityType: "task" | "space";
  /** The id of the Task/Space this operation applies to. */
  entityId: string;
  kind: SyncOperationKind;
  /** When this operation was queued (device-local clock). */
  queuedAt: string;
  /** Number of retry attempts made so far. */
  retryCount: number;
  /** Last error message, if the most recent attempt failed. */
  lastError?: string;
}

/**
 * Result of a last-write-wins comparison
 * (lib/sync/conflict-resolution.ts).
 */
export type ConflictResolution = "server-wins" | "local-wins" | "no-conflict";
