import { getDB } from "@/lib/db/indexeddb/client";
import { STORE_NAMES } from "@/lib/db/indexeddb/schema";
import type { Task, TaskInput, TaskUpdate } from "@/types/task";
import type { TaskRepository } from "./task-repository";
import { enqueue } from "@/lib/sync/sync-queue";

/**
 * IndexedDBTaskRepository — local source of truth. All CRUD writes
 * land here first and resolve without waiting on the network; the
 * UI never waits on the "push to Firestore" step (Development Phase
 * #25, Architecture Proposal section 4.1).
 */
export class IndexedDBTaskRepository implements TaskRepository {
  /** spaceId -> set of subscriber callbacks. Simple in-memory pub-sub for live-query. */
  private listeners = new Map<string, Set<() => void>>();

  private notify(spaceId: string): void {
    for (const cb of this.listeners.get(spaceId) ?? []) cb();
  }

  subscribe(spaceId: string, callback: () => void): () => void {
    if (!this.listeners.has(spaceId)) this.listeners.set(spaceId, new Set());
    this.listeners.get(spaceId)!.add(callback);
    return () => this.listeners.get(spaceId)?.delete(callback);
  }

  async getBySpace(spaceId: string): Promise<Task[]> {
    const db = await getDB();
    const all = await db.getAllFromIndex(STORE_NAMES.tasks, "spaceId", spaceId);
    return all.filter((t) => !t.deletedAt);
  }

  async getById(id: string): Promise<Task | null> {
    const db = await getDB();
    const task = await db.get(STORE_NAMES.tasks, id);
    return task && !task.deletedAt ? task : null;
  }

  async create(input: TaskInput): Promise<Task> {
    const db = await getDB();
    const now = new Date().toISOString();
    const task: Task = {
      id: crypto.randomUUID(),
      spaceId: input.spaceId,
      title: input.title,
      note: input.note,
      priority: input.priority,
      status: "pending",
      dueDate: input.dueDate,
      createdAt: now,
      updatedAt: now,
      sortOrder: await this.nextSortOrder(input.spaceId),
      syncState: "pending",
      localUpdatedAt: now,
    };
    await db.put(STORE_NAMES.tasks, task);
    await enqueue("task", task.id, "create");
    this.notify(task.spaceId);
    return task;
  }

  private async nextSortOrder(spaceId: string): Promise<number> {
    const existing = await this.getBySpace(spaceId);
    if (existing.length === 0) return 0;
    return Math.max(...existing.map((t) => t.sortOrder)) + 1;
  }

  async update(id: string, patch: TaskUpdate): Promise<Task> {
    const db = await getDB();
    const existing = await db.get(STORE_NAMES.tasks, id);
    if (!existing || existing.deletedAt) {
      throw new Error(`Task not found: ${id}`);
    }
    const now = new Date().toISOString();
    const updated: Task = {
      ...existing,
      ...patch,
      updatedAt: now,
      localUpdatedAt: now,
      syncState: "pending",
    };
    await db.put(STORE_NAMES.tasks, updated);
    await enqueue("task", updated.id, "update");
    this.notify(updated.spaceId);
    return updated;
  }

  async complete(id: string): Promise<Task> {
    const db = await getDB();
    const existing = await db.get(STORE_NAMES.tasks, id);
    if (!existing || existing.deletedAt) {
      throw new Error(`Task not found: ${id}`);
    }
    const now = new Date().toISOString();
    const updated: Task = {
      ...existing,
      status: "completed",
      completedAt: now,
      updatedAt: now,
      localUpdatedAt: now,
      syncState: "pending",
    };
    await db.put(STORE_NAMES.tasks, updated);
    await enqueue("task", updated.id, "update");
    this.notify(updated.spaceId);
    return updated;
  }

  async uncomplete(id: string): Promise<Task> {
    const db = await getDB();
    const existing = await db.get(STORE_NAMES.tasks, id);
    if (!existing || existing.deletedAt) {
      throw new Error(`Task not found: ${id}`);
    }
    const now = new Date().toISOString();
    const updated: Task = {
      ...existing,
      status: "pending",
      completedAt: undefined,
      updatedAt: now,
      localUpdatedAt: now,
      syncState: "pending",
    };
    await db.put(STORE_NAMES.tasks, updated);
    await enqueue("task", updated.id, "update");
    this.notify(updated.spaceId);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = await getDB();
    const existing = await db.get(STORE_NAMES.tasks, id);
    if (!existing) return;
    const now = new Date().toISOString();
    const tombstoned: Task = {
      ...existing,
      deletedAt: now,
      updatedAt: now,
      localUpdatedAt: now,
      syncState: "pending",
    };
    await db.put(STORE_NAMES.tasks, tombstoned);
    await enqueue("task", tombstoned.id, "delete");
    this.notify(existing.spaceId);
  }

  async reorder(spaceId: string, orderedIds: string[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(STORE_NAMES.tasks, "readwrite");
    const now = new Date().toISOString();
    await Promise.all(
      orderedIds.map(async (id, index) => {
        const existing = await tx.store.get(id);
        if (!existing || existing.spaceId !== spaceId || existing.deletedAt) return;
        await tx.store.put({
          ...existing,
          sortOrder: index,
          updatedAt: now,
          localUpdatedAt: now,
          syncState: "pending",
        });
        await enqueue("task", id, "update");
      })
    );
    await tx.done;
    this.notify(spaceId);
  }
}
