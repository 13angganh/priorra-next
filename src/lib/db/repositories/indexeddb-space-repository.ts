import { getDB } from "@/lib/db/indexeddb/client";
import { STORE_NAMES } from "@/lib/db/indexeddb/schema";
import type { Space, SpaceInput, SpaceUpdate } from "@/types/space";
import type { SpaceRepository } from "./space-repository";
import { enqueue } from "@/lib/sync/sync-queue";

/**
 * IndexedDBSpaceRepository — mirrors IndexedDBTaskRepository's
 * structure (Development Phase #25).
 */
export class IndexedDBSpaceRepository implements SpaceRepository {
  private listeners = new Set<() => void>();

  private notify(): void {
    for (const cb of this.listeners) cb();
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  async getAll(): Promise<Space[]> {
    const db = await getDB();
    const all = await db.getAll(STORE_NAMES.spaces);
    return all.filter((s) => !s.deletedAt);
  }

  async getById(id: string): Promise<Space | null> {
    const db = await getDB();
    const space = await db.get(STORE_NAMES.spaces, id);
    return space && !space.deletedAt ? space : null;
  }

  async create(input: SpaceInput): Promise<Space> {
    const db = await getDB();
    const now = new Date().toISOString();
    const space: Space = {
      id: crypto.randomUUID(),
      name: input.name,
      icon: input.icon,
      createdAt: now,
      updatedAt: now,
      archived: false,
      syncState: "pending",
      localUpdatedAt: now,
    };
    await db.put(STORE_NAMES.spaces, space);
    await enqueue("space", space.id, "create");
    this.notify();
    return space;
  }

  async update(id: string, patch: SpaceUpdate): Promise<Space> {
    const db = await getDB();
    const existing = await db.get(STORE_NAMES.spaces, id);
    if (!existing || existing.deletedAt) {
      throw new Error(`Space not found: ${id}`);
    }
    const now = new Date().toISOString();
    const updated: Space = {
      ...existing,
      ...patch,
      updatedAt: now,
      localUpdatedAt: now,
      syncState: "pending",
    };
    await db.put(STORE_NAMES.spaces, updated);
    await enqueue("space", updated.id, "update");
    this.notify();
    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = await getDB();
    const existing = await db.get(STORE_NAMES.spaces, id);
    if (!existing) return;
    const now = new Date().toISOString();
    const tombstoned: Space = {
      ...existing,
      deletedAt: now,
      updatedAt: now,
      localUpdatedAt: now,
      syncState: "pending",
    };
    await db.put(STORE_NAMES.spaces, tombstoned);
    await enqueue("space", tombstoned.id, "delete");
    this.notify();
  }
}
