import type { ConflictResolution } from "@/types/sync";

/**
 * Last-write-wins comparator (Architecture Proposal section 4.2):
 *
 *   server newer            -> overwrite local
 *   local newer, unsynced   -> local wins; SyncEngine re-pushes on
 *                              the next cycle rather than the pull
 *                              overwriting an unsent local change
 *
 * Pure logic, no I/O. Development Phase #36.
 */
export function resolveConflict(params: {
  serverUpdatedAt: string | undefined;
  localUpdatedAt: string;
  localSyncState: "synced" | "pending" | "error";
}): ConflictResolution {
  const { serverUpdatedAt, localUpdatedAt, localSyncState } = params;

  if (!serverUpdatedAt) {
    // No server copy yet (or server timestamp not resolved) — nothing to compare against.
    return "no-conflict";
  }

  const serverTime = Date.parse(serverUpdatedAt);
  const localTime = Date.parse(localUpdatedAt);

  if (serverTime > localTime) {
    return "server-wins";
  }

  if (localTime > serverTime && localSyncState !== "synced") {
    // Local has unsynced changes newer than what the server has —
    // don't let an incoming pull clobber them. SyncEngine's own
    // push cycle (not this comparison) is what will eventually
    // reconcile the server to match.
    return "local-wins";
  }

  return "no-conflict";
}
