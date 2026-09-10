"use client";

import { useSyncExternalStore } from "react";
import type { Space } from "@/types/space";
import { spaceRepository as repo } from "@/lib/db/repositories/singletons";
import { createLiveQueryCache, type LiveQuerySnapshot } from "@/lib/db/live-query-cache";

// Single cache — unlike tasks, spaces aren't scoped by a key.
const cache = createLiveQueryCache<Space[]>(
  () => repo.getAll(),
  (onChange) => repo.subscribe(onChange),
  []
);

const EMPTY_SNAPSHOT: LiveQuerySnapshot<Space[]> = { data: [], loading: false };

/**
 * Live-query hook for all Spaces, via useSyncExternalStore (see
 * lib/db/live-query-cache.ts and use-task-list.ts for the full
 * rationale). Development Phase #27.
 */
export function useSpaceList() {
  const snapshot = useSyncExternalStore(
    cache.subscribe,
    () => cache.getSnapshot(),
    () => EMPTY_SNAPSHOT
  );

  return { spaces: snapshot.data, loading: snapshot.loading };
}
