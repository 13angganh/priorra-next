import { describe, it, expect } from "vitest";

/**
 * Regression test for a real production build failure: importing
 * src/features/spaces/hooks/use-space-list.ts (or use-task-list.ts)
 * used to crash with `ReferenceError: indexedDB is not defined` the
 * moment the module was imported — because `next build`'s static
 * generation imports page/hook modules on the SERVER, where
 * `indexedDB` does not exist, and the old createLiveQueryCache()
 * called `read()` (an IndexedDB access) immediately at
 * construction/module-load time rather than lazily.
 *
 * DELIBERATE: this test file does NOT import "fake-indexeddb/auto"
 * (unlike the integration tests under
 * tests/integration/indexeddb-repository/, which do). That's the
 * point — this file's Node environment has no `indexedDB` global at
 * all, the same as Next.js's server/build environment, so merely
 * importing the live-query-cache module (and constructing a cache
 * from it) must not throw.
 */
describe("createLiveQueryCache SSR/build safety", () => {
  it("does NOT throw when merely imported, with no indexedDB global present", async () => {
    expect(typeof indexedDB).toBe("undefined"); // sanity: confirms this test's premise

    const { createLiveQueryCache } = await import("@/lib/db/live-query-cache");
    expect(createLiveQueryCache).toBeDefined();
  });

  it("does NOT throw when a cache is CONSTRUCTED (read() must not run yet)", async () => {
    const { createLiveQueryCache } = await import("@/lib/db/live-query-cache");

    // If this constructor eagerly called `read` (which internally
    // touches `indexedDB`), this line would throw
    // ReferenceError: indexedDB is not defined — reproducing the
    // exact production build failure.
    expect(() => {
      createLiveQueryCache<string[]>(
        () => {
          throw new Error("read() should not be called before subscribe()");
        },
        () => () => {},
        []
      );
    }).not.toThrow();
  });

  it("getSnapshot() before any subscribe() returns the initial value, without touching read()", async () => {
    const { createLiveQueryCache } = await import("@/lib/db/live-query-cache");

    const cache = createLiveQueryCache<string[]>(
      () => {
        throw new Error("read() should not be called before subscribe()");
      },
      () => () => {},
      ["initial"]
    );

    // This is exactly what useSyncExternalStore's getServerSnapshot
    // path exercises during SSR — it must be safe.
    const snapshot = cache.getSnapshot();
    expect(snapshot.data).toEqual(["initial"]);
    expect(snapshot.loading).toBe(true);
  });
});
