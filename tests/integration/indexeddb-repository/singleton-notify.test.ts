import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Regression test for a real bug found via Playwright browser
 * testing: each hook file was doing its own
 * `new IndexedDBSpaceRepository()` / `new IndexedDBTaskRepository()`.
 * Since `listeners` is an INSTANCE field, a write through one
 * instance never notified subscribers registered on a DIFFERENT
 * instance of the same class — so creating a Space via the actions
 * hook never triggered a re-render in the list hook, even though the
 * write reached IndexedDB correctly.
 *
 * This test simulates exactly that: one repository reference used
 * to subscribe, a SEPARATE `new` instance used to write. It must
 * fail (assert the listener does NOT fire) to prove the singleton
 * module is what actually fixes it — see the next test below for the
 * green-path proof against the shared singleton.
 */

beforeEach(() => {
  indexedDB = new IDBFactory();
});

describe("repository instance sharing (regression)", () => {
  it("DEMONSTRATES the bug: two separate `new` instances do not share listeners", async () => {
    const { IndexedDBSpaceRepository } = await import(
      "@/lib/db/repositories/indexeddb-space-repository"
    );
    const { __resetDBConnectionForTests } = await import("@/lib/db/indexeddb/client");
    __resetDBConnectionForTests();

    const listInstance = new IndexedDBSpaceRepository();
    const actionsInstance = new IndexedDBSpaceRepository();

    const listener = vi.fn();
    listInstance.subscribe(listener);

    await actionsInstance.create({ name: "Work" });

    // This is the bug, captured as an assertion: the listener
    // registered on `listInstance` does NOT fire when a DIFFERENT
    // instance performs the write.
    expect(listener).not.toHaveBeenCalled();
  });

  it("FIX VERIFIED: hooks importing the shared singleton DO see each other's writes", async () => {
    const singletonsModule = await import("@/lib/db/repositories/singletons");
    const { __resetDBConnectionForTests } = await import("@/lib/db/indexeddb/client");
    __resetDBConnectionForTests();

    const { spaceRepository } = singletonsModule;

    const listener = vi.fn();
    // Simulates useSpaceList subscribing...
    const unsubscribe = spaceRepository.subscribe(listener);

    // ...while useSpaceActions writes through the SAME imported
    // singleton reference, as every hook now does post-fix.
    await spaceRepository.create({ name: "Work" });

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
