"use client";

import { useSyncExternalStore } from "react";
import { getPendingCount } from "@/lib/sync/sync-queue";
import { useOnlineStatus } from "./use-online-status";
import { isFirebaseConfigured } from "@/lib/firebase/config";

/**
 * Aggregate sync status for the UI indicator ("Menyinkronkan...",
 * "Tersimpan", "Offline") — read from the SyncQueue's pending count
 * + online status, per Architecture Proposal section 5: "bukan dari
 * state terpisah yang bisa desync dari kenyataan." Development
 * Phase #36.
 *
 * There is no dedicated "currently syncing" boolean stored anywhere
 * — by design. "Syncing" is simply "online, Firebase configured,
 * and pendingCount > 0"; deriving it this way means it can never
 * drift out of sync with the queue's actual state, which a
 * separately-tracked flag could.
 *
 * Polling, not push-based subscription: the queue only changes as a
 * side effect of repository writes, and there's no dedicated
 * "queue changed" event emitter to subscribe to (each repository
 * only notifies ITS OWN listeners, scoped to its own domain data —
 * wiring a cross-cutting queue-change event into every write path
 * purely for this one UI indicator isn't worth the coupling). A
 * short poll interval is cheap: it's a single IndexedDB count(),
 * not a full queue read.
 */
export type SyncStatus = "offline" | "not-configured" | "synced" | "syncing";

const POLL_INTERVAL_MS = 2000;

let currentCount = 0;
const listeners = new Set<() => void>();
let pollTimer: ReturnType<typeof setInterval> | null = null;

function ensurePolling() {
  if (pollTimer || typeof window === "undefined") return;
  const poll = () => {
    getPendingCount().then((count) => {
      if (count !== currentCount) {
        currentCount = count;
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

function getSnapshot(): number {
  return currentCount;
}

function getServerSnapshot(): number {
  return 0;
}

export function useSyncStatus(): SyncStatus {
  const online = useOnlineStatus();
  const pendingCount = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!isFirebaseConfigured()) return "not-configured";
  if (!online) return "offline";
  return pendingCount > 0 ? "syncing" : "synced";
}
