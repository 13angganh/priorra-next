import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { IndexedDBSpaceRepository } from "@/lib/db/repositories/indexeddb-space-repository";
import { __resetDBConnectionForTests } from "@/lib/db/indexeddb/client";

beforeEach(() => {
  indexedDB = new IDBFactory();
  __resetDBConnectionForTests();
});

describe("IndexedDBSpaceRepository", () => {
  it("create() then getById() round-trips the space", async () => {
    const repo = new IndexedDBSpaceRepository();
    const created = await repo.create({ name: "Work" });
    expect(created.archived).toBe(false);
    expect(await repo.getById(created.id)).toEqual(created);
  });

  it("getAll() excludes soft-deleted spaces", async () => {
    const repo = new IndexedDBSpaceRepository();
    const a = await repo.create({ name: "Work" });
    await repo.create({ name: "Personal" });
    await repo.delete(a.id);

    const all = await repo.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("Personal");
  });

  it("update() can archive a space", async () => {
    const repo = new IndexedDBSpaceRepository();
    const created = await repo.create({ name: "Old project" });
    const updated = await repo.update(created.id, { archived: true });
    expect(updated.archived).toBe(true);
  });

  it("subscribe() fires on create/update/delete and stops after unsubscribe", async () => {
    const repo = new IndexedDBSpaceRepository();
    let count = 0;
    const unsubscribe = repo.subscribe(() => count++);

    const s = await repo.create({ name: "A" });
    await repo.update(s.id, { name: "A renamed" });
    await repo.delete(s.id);
    expect(count).toBe(3);

    unsubscribe();
    await repo.create({ name: "B" });
    expect(count).toBe(3);
  });
});
