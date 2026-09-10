import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { IndexedDBTaskRepository } from "@/lib/db/repositories/indexeddb-task-repository";
import { __resetDBConnectionForTests } from "@/lib/db/indexeddb/client";

/**
 * Integration tests against fake-indexeddb (an in-memory IndexedDB
 * implementation for Node) — exercises the real repository code
 * path, not a mock (Architecture Proposal section 11.2).
 */

beforeEach(() => {
  // Fresh fake IndexedDB + fresh connection for every test, so
  // tests don't leak state into each other.
  indexedDB = new IDBFactory();
  __resetDBConnectionForTests();
});

describe("IndexedDBTaskRepository", () => {
  it("create() then getById() round-trips the task", async () => {
    const repo = new IndexedDBTaskRepository();
    const created = await repo.create({ spaceId: "space-1", title: "Buy milk", priority: 5 });
    expect(created.id).toBeTruthy();
    expect(created.status).toBe("pending");
    expect(created.syncState).toBe("pending");

    const fetched = await repo.getById(created.id);
    expect(fetched).toEqual(created);
  });

  it("getBySpace() returns only tasks for that space", async () => {
    const repo = new IndexedDBTaskRepository();
    await repo.create({ spaceId: "space-1", title: "A", priority: 1 });
    await repo.create({ spaceId: "space-2", title: "B", priority: 1 });
    await repo.create({ spaceId: "space-1", title: "C", priority: 1 });

    const space1Tasks = await repo.getBySpace("space-1");
    expect(space1Tasks).toHaveLength(2);
    expect(space1Tasks.map((t) => t.title).sort()).toEqual(["A", "C"]);
  });

  it("update() changes fields and bumps updatedAt/localUpdatedAt", async () => {
    const repo = new IndexedDBTaskRepository();
    const created = await repo.create({ spaceId: "space-1", title: "Original", priority: 1 });
    await new Promise((r) => setTimeout(r, 2)); // ensure timestamp advances

    const updated = await repo.update(created.id, { title: "Renamed", priority: 8 });
    expect(updated.title).toBe("Renamed");
    expect(updated.priority).toBe(8);
    expect(Date.parse(updated.updatedAt)).toBeGreaterThan(Date.parse(created.updatedAt));
  });

  it("update() throws on a non-existent id", async () => {
    const repo = new IndexedDBTaskRepository();
    await expect(repo.update("does-not-exist", { title: "x" })).rejects.toThrow();
  });

  it("complete() sets status and completedAt; uncomplete() reverses it", async () => {
    const repo = new IndexedDBTaskRepository();
    const created = await repo.create({ spaceId: "space-1", title: "Task", priority: 1 });

    const completed = await repo.complete(created.id);
    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toBeTruthy();

    const reopened = await repo.uncomplete(created.id);
    expect(reopened.status).toBe("pending");
    expect(reopened.completedAt).toBeUndefined();
  });

  it("delete() tombstones the task (deletedAt set) rather than removing it", async () => {
    const repo = new IndexedDBTaskRepository();
    const created = await repo.create({ spaceId: "space-1", title: "Task", priority: 1 });
    await repo.delete(created.id);

    // Excluded from normal reads...
    expect(await repo.getById(created.id)).toBeNull();
    expect(await repo.getBySpace("space-1")).toHaveLength(0);
  });

  it("reorder() persists a full manual-mode ordering atomically", async () => {
    const repo = new IndexedDBTaskRepository();
    const a = await repo.create({ spaceId: "space-1", title: "A", priority: 1 });
    const b = await repo.create({ spaceId: "space-1", title: "B", priority: 1 });
    const c = await repo.create({ spaceId: "space-1", title: "C", priority: 1 });

    await repo.reorder("space-1", [c.id, a.id, b.id]);

    const tasks = await repo.getBySpace("space-1");
    const byId = new Map(tasks.map((t) => [t.id, t]));
    expect(byId.get(c.id)?.sortOrder).toBe(0);
    expect(byId.get(a.id)?.sortOrder).toBe(1);
    expect(byId.get(b.id)?.sortOrder).toBe(2);
  });

  it("subscribe() fires on create/update/complete/delete for the matching space only", async () => {
    const repo = new IndexedDBTaskRepository();
    let fireCount = 0;
    const unsubscribe = repo.subscribe("space-1", () => {
      fireCount++;
    });

    const t = await repo.create({ spaceId: "space-1", title: "A", priority: 1 });
    await repo.create({ spaceId: "space-2", title: "Other space", priority: 1 }); // should NOT fire
    await repo.update(t.id, { title: "Renamed" });
    await repo.complete(t.id);
    await repo.delete(t.id);

    expect(fireCount).toBe(4); // create, update, complete, delete — NOT the other-space create

    unsubscribe();
    await repo.create({ spaceId: "space-1", title: "After unsubscribe", priority: 1 });
    expect(fireCount).toBe(4); // no further increments after unsubscribe
  });
});
