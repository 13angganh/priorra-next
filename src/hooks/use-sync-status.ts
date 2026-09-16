"use client";

import { useSyncExternalStore } from "react";
import { getSyncQueueSummary, type SyncQueueSummary } from "@/lib/sync/sync-queue";
import { useOnlineStatus } from "./use-online-status";
import { isFirebaseConfigured } from "@/lib/firebase/config";

/**
 * Aggregate sync status for the UI indicator ("Menyinkronkan...",
 * "Tersimpan", "Offline", "Gagal sinkron") — read from the
 * SyncQueue's actual state + online status, per Architecture
 * Proposal section 5: "bukan dari state terpisah yang bisa desync
 * dari kenyataan." Development Phase #36.
 *
 * REAL BUG FIXED: this used to derive "syncing" from a single
 * `pendingCount > 0` check. An entry that exhausted all of
 * SyncEngine's retries (e.g. Firestore rules not yet published,
 * wrong project config, App Check blocking writes — anything that
 * makes every push fail) stayed counted as "pending" forever, even
 * though SyncEngine had already given up retrying it — so the UI
 * showed "Menyinkronkan..." indefinitely with no way to ever
 * resolve, which is exactly the reported bug. Fixed by reading
 * getSyncQueueSummary()'s activeCount/stuckCount breakdown instead
 * of a single count, and adding a real "error" status the UI can
 * show distinctly from "syncing" — see SyncIndicator for how it's
 * displayed.
 *
 * There is no dedicated "currently syncing" boolean stored anywhere
 * — by design. Status is derived from the queue's actual state, so
 * it can't drift from reality the way a separately-tracked flag
 * could.
 *
 * Polling, not push-based subscription: the queue only changes as a
 * side effect of repository writes, and there's no dedicated
 * "queue changed" event emitter to subscribe to (each repository
 * only notifies ITS OWN listeners, scoped to its own domain data —
 * wiring a cross-cutting queue-change event into every write path
 * purely for this one UI indicator isn't worth the coupling). A
 * short poll interval is cheap: it's a small IndexedDB read, not a
 * full queue scan of application data.
 */
export type SyncStatus = "offline" | "not-configured" | "synced" | "syncing" | "error";

const POLL_INTERVAL_MS = 2000;

let currentSummary: SyncQueueSummary = { activeCount: 0, stuckCount: 0 };
const listeners = new Set<() => void>();
let pollTimer: ReturnType<typeof setInterval> | null = null;

function summariesEqual(a: SyncQueueSummary, b: SyncQueueSummary): boolean {
  return a.activeCount === b.activeCount && a.stuckCount === b.stuckCount;
}

function ensurePolling() {
  if (pollTimer || typeof window === "undefined") return;
  const poll = () => {
    getSyncQueueSummary().then((summary) => {
      if (!summariesEqual(summary, currentSummary)) {
        currentSummary = summary;
        for (const l of listeners) l();
      }
    });
  };
  poll(); // immediate first read, don't wait a full interval
  pollTimer = setInterval(poll, POLL_INTERVAL_MS);
}

function subscribe(onStoreChange: () => void): () => void {
  ensurePolling();
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot(): SyncQueueSummary {
  return currentSummary;
}

const EMPTY_SUMMARY: SyncQueueSummary = { activeCount: 0, stuckCount: 0 };
function getServerSnapshot(): SyncQueueSummary {
  return EMPTY_SUMMARY;
}

export function useSyncStatus(): SyncStatus {
  const online = useOnlineStatus();
  const summary = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!isFirebaseConfigured()) return "not-configured";
  if (!online) return "offline";
  // Checked before activeCount: even if some entries are still
  // actively retrying, at least one having given up permanently is
  // the more urgent, more actionable thing to surface — "syncing"
  // alone would hide a real, unresolvable-without-help problem.
  if (summary.stuckCount > 0) return "error";
  return summary.activeCount > 0 ? "syncing" : "synced";
}
