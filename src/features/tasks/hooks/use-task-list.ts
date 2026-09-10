"use client";

import { useSyncExternalStore, useMemo } from "react";
import type { Task } from "@/types/task";
import { taskRepository as repo } from "@/lib/db/repositories/singletons";
import { createLiveQueryCache, type LiveQuerySnapshot } from "@/lib/db/live-query-cache";

// One cache per spaceId, created lazily and kept for the app's
// lifetime (bounded by however many distinct Spaces the user has —
// not unbounded). Keyed caches let switching between Space tabs
// re-show already-loaded data instantly instead of re-fetching.
const cachesBySpaceId = new Map<string, ReturnType<typeof createLiveQueryCache<Task[]>>>();

function getCacheFor(spaceId: string) {
  let cache = cachesBySpaceId.get(spaceId);
  if (!cache) {
    cache = createLiveQueryCache<Task[]>(
      () => repo.getBySpace(spaceId),
      (onChange) => repo.subscribe(spaceId, onChange),
      []
    );
    cachesBySpaceId.set(spaceId, cache);
  }
  return cache;
}

const EMPTY_SNAPSHOT: LiveQuerySnapshot<Task[]> = { data: [], loading: false };

/**
 * Live-query hook for a Space's tasks, via useSyncExternalStore —
 * the API React's docs recommend for "subscribe to an external
 * store, render its current value" (see lib/db/live-query-cache.ts
 * for why a plain useState+useEffect refetch doesn't fit here).
 * Every write to IndexedDB via IndexedDBTaskRepository triggers a
 * re-render with no manual refetch/invalidate step (Architecture
 * Proposal section 5). Development Phase #27.
 */
export function useTaskList(spaceId: string | null) {
  const cache = useMemo(() => (spaceId ? getCacheFor(spaceId) : null), [spaceId]);

  const snapshot = useSyncExternalStore(
    cache?.subscribe ?? (() => () => {}),
    () => cache?.getSnapshot() ?? EMPTY_SNAPSHOT,
    () => EMPTY_SNAPSHOT // server snapshot — IndexedDB doesn't exist during SSR
  );

  return { tasks: snapshot.data, loading: snapshot.loading };
}
