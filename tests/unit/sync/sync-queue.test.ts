import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  enqueue,
  getAllQueued,
  getQueuedForEntity,
  dequeue,
  markFailed,
  getSyncQueueSummary,
  retryStuckEntries,
} from "@/lib/sync/sync-queue";
import { MAX_SYNC_RETRY_ATTEMPTS } from "@/types/sync";
import { __resetDBConnectionForTests } from "@/lib/db/indexeddb/client";

beforeEach(() => {
  indexedDB = new IDBFactory();
  __resetDBConnectionForTests();
});

describe("sync-queue", () => {
  it("enqueue() adds a new entry, retrievable via getAllQueued()", async () => {
    await enqueue("task", "task-1", "create");
    const all = await getAllQueued();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ entityType: "task", entityId: "task-1", kind: "create" });
  });

  it("enqueue() COLLAPSES a second unstarted operation for the same entity into one entry", async () => {
    await enqueue("task", "task-1", "create");
    await enqueue("task", "task-1", "update"); // e.g. user edits again before sync runs

    const all = await getAllQueued();
    expect(all).toHaveLength(1); // NOT 2
    expect(all[0].kind).toBe("update"); // latest operation wins
  });

  it("enqueue() does NOT collapse once an entry has been attempted (retryCount > 0)", async () => {
    await enqueue("task", "task-1", "create");
    const [entry] = await getAllQueued();
    await markFailed(entry.id, "network error");

    await enqueue("task", "task-1", "update");

    const all = await getAllQueued();
    expect(all).toHaveLength(2); // now two separate entries
  });

  it("getAllQueued() returns entries in queuedAt (FIFO) order", async () => {
    await enqueue("task", "task-1", "create");
    await new Promise((r) => setTimeout(r, 2));
    await enqueue("task", "task-2", "create");
    await new Promise((r) => setTimeout(r, 2));
    await enqueue("task", "task-3", "create");

    const all = await getAllQueued();
    expect(all.map((e) => e.entityId)).toEqual(["task-1", "task-2", "task-3"]);
  });

  it("getQueuedForEntity() returns only entries for that entity, in FIFO order", async () => {
    await enqueue("task", "task-1", "create");
    await enqueue("task", "task-2", "create");
    const [entry1] = await getQueuedForEntity("task-1");
    await markFailed(entry1.id, "err"); // so the next enqueue for task-1 doesn't collapse
    await enqueue("task", "task-1", "update");

    const forTask1 = await getQueuedForEntity("task-1");
    expect(forTask1).toHaveLength(2);
    expect(forTask1.every((e) => e.entityId === "task-1")).toBe(true);
  });

  it("dequeue() removes the entry", async () => {
    await enqueue("task", "task-1", "create");
    const [entry] = await getAllQueued();
    await dequeue(entry.id);
    expect(await getAllQueued()).toHaveLength(0);
  });

  it("markFailed() increments retryCount and records the error message", async () => {
    await enqueue("task", "task-1", "create");
    const [entry] = await getAllQueued();
    await markFailed(entry.id, "simulated network failure");

    const [updated] = await getAllQueued();
    expect(updated.retryCount).toBe(1);
    expect(updated.lastError).toBe("simulated network failure");
  });

  it("getSyncQueueSummary() counts everything as activeCount when nothing has exhausted retries", async () => {
    expect(await getSyncQueueSummary()).toEqual({ activeCount: 0, stuckCount: 0 });
    await enqueue("task", "task-1", "create");
    await enqueue("space", "space-1", "create");
    expect(await getSyncQueueSummary()).toEqual({ activeCount: 2, stuckCount: 0 });
  });

  it("REGRESSION: an entry that exhausts MAX_SYNC_RETRY_ATTEMPTS moves from activeCount to stuckCount, not stuck in activeCount forever", async () => {
    // This is the exact bug reported by a real user: "Menyinkronkan..."
    // never stopped, because a permanently-failing entry was counted
    // identically to one still being actively retried. Simulates
    // MAX_SYNC_RETRY_ATTEMPTS consecutive failures on the same entry.
    await enqueue("task", "task-1", "create");
    const [entry] = await getAllQueued();

    for (let i = 0; i < MAX_SYNC_RETRY_ATTEMPTS; i++) {
      await markFailed(entry.id, `simulated failure #${i + 1}`);
    }

    const summary = await getSyncQueueSummary();
    expect(summary.activeCount).toBe(0); // NOT counted as "still trying"
    expect(summary.stuckCount).toBe(1); // correctly counted as "gave up"
  });

  it("REGRESSION: an entry with retryCount below the max still counts as activeCount, not stuckCount", async () => {
    await enqueue("task", "task-1", "create");
    const [entry] = await getAllQueued();
    await markFailed(entry.id, "one failure, more retries remaining");

    const summary = await getSyncQueueSummary();
    expect(summary.activeCount).toBe(1);
    expect(summary.stuckCount).toBe(0);
  });

  it("retryStuckEntries() resets a given-up entry's retryCount to 0, moving it back to activeCount", async () => {
    await enqueue("task", "task-1", "create");
    const [entry] = await getAllQueued();
    for (let i = 0; i < MAX_SYNC_RETRY_ATTEMPTS; i++) {
      await markFailed(entry.id, `failure #${i + 1}`);
    }
    expect((await getSyncQueueSummary()).stuckCount).toBe(1);

    await retryStuckEntries();

    const summary = await getSyncQueueSummary();
    expect(summary.stuckCount).toBe(0);
    expect(summary.activeCount).toBe(1);

    const [reset] = await getAllQueued();
    expect(reset.retryCount).toBe(0);
    expect(reset.lastError).toBeUndefined();
  });

  it("retryStuckEntries() does NOT touch entries that are still actively retrying", async () => {
    await enqueue("task", "task-1", "create");
    const [entry] = await getAllQueued();
    await markFailed(entry.id, "one failure only");

    await retryStuckEntries();

    const [unchanged] = await getAllQueued();
    expect(unchanged.retryCount).toBe(1); // untouched, NOT reset to 0
    expect(unchanged.lastError).toBe("one failure only");
  });
});
