/**
 * A small synchronous cache over an async, subscribable data
 * source, so it can be read via `useSyncExternalStore` — whose
 * `getSnapshot` must be synchronous, which rules out calling
 * `repository.getBySpace()` (an IndexedDB read) directly from it.
 *
 * Introduced to fix a real `react-hooks/set-state-in-effect` lint
 * error: the previous `useState` + `useEffect(() => { refetch() })`
 * pattern called setState synchronously inside an effect body on
 * every mount and on every external notify. `useSyncExternalStore`
 * is the API React's own docs recommend for exactly this shape —
 * "subscribe to an external store, render its current value."
 *
 * `loading` is bundled into the same snapshot object as the data,
 * rather than exposed as a separate imperative getter — a
 * useSyncExternalStore subscriber only re-renders when the snapshot
 * *reference* it's watching changes, so loading-state and
 * data-state must be part of the same snapshot to both reliably
 * trigger re-renders.
 *
 * IMPORTANT — lazy initialization: neither the initial `read()` nor
 * `subscribeToSource()` runs until the FIRST call to `subscribe()`.
 * This is not an optimization, it's a correctness requirement: this
 * module is imported by page components, and Next.js imports page
 * modules on the SERVER too (during `next build`'s static
 * generation and during SSR) — where `indexedDB` does not exist at
 * all. A module-level/constructor-time `read()` call crashed the
 * production build with `ReferenceError: indexedDB is not defined`
 * before this fix, because it ran the moment the module was
 * imported, regardless of server or client. `subscribe()` is only
 * ever called by `useSyncExternalStore` itself, which React only
 * invokes on the client (during SSR it calls `getServerSnapshot`
 * instead and never subscribes) — so gating all IndexedDB access
 * behind the first `subscribe()` call keeps every side effect
 * client-only.
 */
export interface LiveQuerySnapshot<T> {
  data: T;
  loading: boolean;
}

export function createLiveQueryCache<T>(
  read: () => Promise<T>,
  subscribeToSource: (onChange: () => void) => () => void,
  initialValue: T
) {
  let snapshot: LiveQuerySnapshot<T> = { data: initialValue, loading: true };
  const reactListeners = new Set<() => void>();
  let started = false;
  let unsubscribeFromSource: (() => void) | null = null;

  function refresh() {
    read().then((result) => {
      snapshot = { data: result, loading: false };
      for (const l of reactListeners) l();
    });
  }

  function ensureStarted() {
    if (started) return;
    started = true;
    refresh();
    unsubscribeFromSource = subscribeToSource(refresh);
  }

  return {
    subscribe(onStoreChange: () => void): () => void {
      ensureStarted(); // first real subscriber = first time we're definitely on the client
      reactListeners.add(onStoreChange);
      return () => reactListeners.delete(onStoreChange);
    },
    getSnapshot(): LiveQuerySnapshot<T> {
      return snapshot;
    },
    /** Test/cleanup only — most callers never need this. */
    dispose(): void {
      unsubscribeFromSource?.();
      unsubscribeFromSource = null;
      started = false;
      reactListeners.clear();
    },
  };
}
