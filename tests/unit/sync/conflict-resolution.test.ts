import { describe, it, expect } from "vitest";
import { resolveConflict } from "@/lib/sync/conflict-resolution";

describe("resolveConflict", () => {
  it("server-wins when serverUpdatedAt is strictly newer", () => {
    const result = resolveConflict({
      serverUpdatedAt: "2026-06-01T12:00:00.000Z",
      localUpdatedAt: "2026-06-01T10:00:00.000Z",
      localSyncState: "synced",
    });
    expect(result).toBe("server-wins");
  });

  it("local-wins when localUpdatedAt is newer AND local has unsynced changes (pending)", () => {
    const result = resolveConflict({
      serverUpdatedAt: "2026-06-01T10:00:00.000Z",
      localUpdatedAt: "2026-06-01T12:00:00.000Z",
      localSyncState: "pending",
    });
    expect(result).toBe("local-wins");
  });

  it("local-wins when localUpdatedAt is newer AND local sync previously errored", () => {
    const result = resolveConflict({
      serverUpdatedAt: "2026-06-01T10:00:00.000Z",
      localUpdatedAt: "2026-06-01T12:00:00.000Z",
      localSyncState: "error",
    });
    expect(result).toBe("local-wins");
  });

  it("no-conflict when localUpdatedAt is newer but local is ALREADY synced (stale local timestamp, no real conflict)", () => {
    const result = resolveConflict({
      serverUpdatedAt: "2026-06-01T10:00:00.000Z",
      localUpdatedAt: "2026-06-01T12:00:00.000Z",
      localSyncState: "synced",
    });
    expect(result).toBe("no-conflict");
  });

  it("no-conflict when there is no server copy yet", () => {
    const result = resolveConflict({
      serverUpdatedAt: undefined,
      localUpdatedAt: "2026-06-01T12:00:00.000Z",
      localSyncState: "pending",
    });
    expect(result).toBe("no-conflict");
  });

  it("no-conflict when timestamps are exactly equal", () => {
    const result = resolveConflict({
      serverUpdatedAt: "2026-06-01T12:00:00.000Z",
      localUpdatedAt: "2026-06-01T12:00:00.000Z",
      localSyncState: "pending",
    });
    expect(result).toBe("no-conflict");
  });
});
