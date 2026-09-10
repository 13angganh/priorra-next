import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * SyncEngine tests. Firestore itself is mocked (vi.mock) rather
 * than exercised against a real project — see "Known limitations"
 * in CHANGELOG.md for why (no emulator access in this environment).
 * What IS real: IndexedDB (via fake-indexeddb), the sync queue, the
 * FIFO-per-entity drain order, retry/backoff bookkeeping, and the
 * last-write-wins reconciliation logic — every one of these is
 * exercised against actual repository code, not a mock standing in
 * for the whole engine.
 */

const { pushTaskMock, pullAllTasksMock, pushSpaceMock, pullAllSpacesMock } = vi.hoisted(() => ({
  pushTaskMock: vi.fn(),
  pullAllTasksMock: vi.fn().mockResolvedValue([]),
  pushSpaceMock: vi.fn(),
  pullAllSpacesMock: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/db/repositories/firestore-task-repository", () => ({
  FirestoreTaskRepository: vi.fn().mockImplementation(function (this: unknown) {
    return { push: pushTaskMock, pull: vi.fn(), pullAll: pullAllTasksMock };
  }),
}));

vi.mock("@/lib/db/repositories/firestore-space-repository", () => ({
  FirestoreSpaceRepository: vi.fn().mockImplementation(function (this: unknown) {
    return { push: pushSpaceMock, pull: vi.fn(), pullAll: pullAllSpacesMock };
  }),
}));

vi.mock("@/lib/firebase/config", () => ({
  isFirebaseConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/sync/network-status", () => ({
  isOnline: vi.fn(() => true),
  onReconnect: vi.fn(() => () => {}),
}));

import { drainQueue, pullChanges, backoffDelayMs } from "@/lib/sync/sync-engine";
import { taskRepository, spaceRepository } from "@/lib/db/repositories/singletons";
import { getAllQueued } from "@/lib/sync/sync-queue";
import { __resetDBConnectionForTests } from "@/lib/db/indexeddb/client";

beforeEach(() => {
  indexedDB = new IDBFactory();
  __resetDBConnectionForTests();
  pushTaskMock.mockReset().mockResolvedValue(undefined);
  pullAllTasksMock.mockReset().mockResolvedValue([]);
  pushSpaceMock.mockReset().mockResolvedValue(undefined);
  pullAllSpacesMock.mockReset().mockResolvedValue([]);
});

describe("backoffDelayMs", () => {
  it("doubles each attempt: 1s, 2s, 4s, 8s, 16s", () => {
    expect(backoffDelayMs(0)).toBe(1000);
    expect(backoffDelayMs(1)).toBe(2000);
    expect(backoffDelayMs(2)).toBe(4000);
    expect(backoffDelayMs(3)).toBe(8000);
    expect(backoffDelayMs(4)).toBe(16000);
  });
});

describe("drainQueue", () => {
  it("pushes a queued task creation and dequeues it on success", async () => {
    const task = await taskRepository.create({ spaceId: "space-1", title: "Test", priority: 5 });
    expect(await getAllQueued()).toHaveLength(1);

    await drainQueue();

    expect(pushTaskMock).toHaveBeenCalledTimes(1);
    expect(pushTaskMock.mock.calls[0][0].id).toBe(task.id);
    expect(await getAllQueued()).toHaveLength(0); // dequeued after success
  });

  it("pushes a queued space creation via FirestoreSpaceRepository", async () => {
    await spaceRepository.create({ name: "Work" });
    await drainQueue();
    expect(pushSpaceMock).toHaveBeenCalledTimes(1);
    expect(await getAllQueued()).toHaveLength(0);
  });

  it("on push failure, marks the entry failed and does NOT dequeue it", async () => {
    pushTaskMock.mockRejectedValueOnce(new Error("simulated network failure"));
    await taskRepository.create({ spaceId: "space-1", title: "Test", priority: 5 });

    await drainQueue();

    const remaining = await getAllQueued();
    expect(remaining).toHaveLength(1); // still queued
    expect(remaining[0].retryCount).toBe(1);
    expect(remaining[0].lastError).toContain("simulated network failure");
  });

  it("processes entries for DIFFERENT entities independently — one failing doesn't block another", async () => {
    pushTaskMock.mockImplementation(async (task: { title: string }) => {
      if (task.title === "Will fail") throw new Error("boom");
    });

    await taskRepository.create({ spaceId: "space-1", title: "Will fail", priority: 5 });
    await taskRepository.create({ spaceId: "space-1", title: "Will succeed", priority: 5 });

    await drainQueue();

    const remaining = await getAllQueued();
    // The failing one is still queued; the succeeding one was dequeued.
    expect(remaining).toHaveLength(1);
    expect(pushTaskMock).toHaveBeenCalledTimes(2); // both were attempted
  });

  it("pushes a DELETE entry with the tombstoned record (deletedAt set)", async () => {
    const task = await taskRepository.create({ spaceId: "space-1", title: "To delete", priority: 5 });
    await drainQueue(); // clear the create entry first
    pushTaskMock.mockClear();

    await taskRepository.delete(task.id);
    await drainQueue();

    expect(pushTaskMock).toHaveBeenCalledTimes(1);
    expect(pushTaskMock.mock.calls[0][0].deletedAt).toBeTruthy();
  });

  it("is a no-op when Firebase is not configured", async () => {
    const { isFirebaseConfigured } = await import("@/lib/firebase/config");
    vi.mocked(isFirebaseConfigured).mockReturnValueOnce(false);

    await taskRepository.create({ spaceId: "space-1", title: "Test", priority: 5 });
    await drainQueue();

    expect(pushTaskMock).not.toHaveBeenCalled();
    expect(await getAllQueued()).toHaveLength(1); // untouched
  });
});

describe("pullChanges", () => {
  it("applies a remote task when server is newer (server-wins) and marks it synced", async () => {
    pullAllTasksMock.mockResolvedValueOnce([
      {
        id: "remote-task-1",
        spaceId: "space-1",
        title: "From another device",
        priority: 3,
        status: "pending",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        sortOrder: 0,
        serverUpdatedAt: "2026-06-01T12:00:00.000Z",
      },
    ]);

    await pullChanges();

    const local = await taskRepository.getById("remote-task-1");
    expect(local).not.toBeNull();
    expect(local?.title).toBe("From another device");
    expect(local?.syncState).toBe("synced");
  });

  it("does NOT overwrite a local task with unsynced changes newer than the server copy (local-wins)", async () => {
    const task = await taskRepository.create({ spaceId: "space-1", title: "Local edit", priority: 5 });
    // task.localUpdatedAt is "now" (>> the remote's older serverUpdatedAt below), and syncState is 'pending'.

    pullAllTasksMock.mockResolvedValueOnce([
      {
        id: task.id,
        spaceId: "space-1",
        title: "STALE version from server",
        priority: 1,
        status: "pending",
        createdAt: task.createdAt,
        updatedAt: "2020-01-01T00:00:00.000Z",
        sortOrder: 0,
        serverUpdatedAt: "2020-01-01T00:00:00.000Z", // much older than task.localUpdatedAt
      },
    ]);

    await pullChanges();

    const local = await taskRepository.getById(task.id);
    expect(local?.title).toBe("Local edit"); // NOT overwritten with the stale server title
  });

  it("is a no-op when offline", async () => {
    const { isOnline } = await import("@/lib/sync/network-status");
    vi.mocked(isOnline).mockReturnValueOnce(false);

    await pullChanges();
    expect(pullAllTasksMock).not.toHaveBeenCalled();
  });

  it("REGRESSION: does NOT throw/reject when the underlying Firestore call fails", async () => {
    // Found via actual Playwright browser testing, not a unit test:
    // with Firebase "configured" (env vars present) but pointing at
    // invalid/placeholder credentials, ensureAnonymousAuth() fails,
    // firestoreTasks.pullAll() throws "Not authenticated — cannot
    // access Firestore.", and — before this fix — pullChanges() had
    // no try/catch around that, so the rejection propagated all the
    // way up to startSyncEngine()'s un-awaited `.then()` call with no
    // .catch(), surfacing as a repeated unhandled promise rejection
    // in the browser console and Next.js's dev error overlay.
    pullAllTasksMock.mockRejectedValueOnce(new Error("Not authenticated — cannot access Firestore."));

    await expect(pullChanges()).resolves.toBeUndefined();
  });
});
