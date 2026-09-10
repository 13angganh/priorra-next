import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { IndexedDBSettingsRepository } from "@/lib/db/repositories/indexeddb-settings-repository";
import { __resetDBConnectionForTests } from "@/lib/db/indexeddb/client";

beforeEach(() => {
  indexedDB = new IDBFactory();
  __resetDBConnectionForTests();
});

describe("IndexedDBSettingsRepository", () => {
  it("get() returns defaults and persists them on first call", async () => {
    const repo = new IndexedDBSettingsRepository();
    const settings = await repo.get();
    expect(settings.theme).toBe("system");
    expect(settings.defaultSort).toBe("smart");

    // Second call reads the persisted row, not a fresh default object.
    const again = await repo.get();
    expect(again).toEqual(settings);
  });

  it("update() persists a partial change", async () => {
    const repo = new IndexedDBSettingsRepository();
    await repo.get(); // ensure the singleton row exists
    const updated = await repo.update({ theme: "dark" });
    expect(updated.theme).toBe("dark");
    expect(updated.defaultSort).toBe("smart"); // untouched field preserved

    const reread = await repo.get();
    expect(reread.theme).toBe("dark");
  });
});
