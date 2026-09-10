import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Task } from "@/types/task";
import type { Space } from "@/types/space";
import type { AppSettings } from "@/types/settings";
import type { SyncQueueEntry } from "@/types/sync";
import { DB_NAME, DB_SCHEMA_VERSION, STORE_NAMES } from "./schema";

/**
 * IndexedDB connection wrapper — opens the database at the active
 * schema version and exposes it to the repository layer
 * (Development Phase #25).
 */
export interface PriorraDBSchema extends DBSchema {
  [STORE_NAMES.tasks]: {
    key: string;
    value: Task;
    indexes: { spaceId: string; status: string; deletedAt: string };
  };
  [STORE_NAMES.spaces]: {
    key: string;
    value: Space;
    indexes: { deletedAt: string };
  };
  [STORE_NAMES.settings]: {
    key: string;
    value: AppSettings;
  };
  [STORE_NAMES.syncQueue]: {
    key: string;
    value: SyncQueueEntry;
    indexes: { entityId: string; queuedAt: string };
  };
}

let dbPromise: Promise<IDBPDatabase<PriorraDBSchema>> | null = null;

/**
 * Returns the (singleton, memoized) open database connection.
 * Safe to call multiple times — subsequent calls reuse the same
 * open connection rather than re-opening.
 */
export function getDB(): Promise<IDBPDatabase<PriorraDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<PriorraDBSchema>(DB_NAME, DB_SCHEMA_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAMES.tasks)) {
          const tasks = db.createObjectStore(STORE_NAMES.tasks, { keyPath: "id" });
          tasks.createIndex("spaceId", "spaceId");
          tasks.createIndex("status", "status");
          tasks.createIndex("deletedAt", "deletedAt");
        }
        if (!db.objectStoreNames.contains(STORE_NAMES.spaces)) {
          const spaces = db.createObjectStore(STORE_NAMES.spaces, { keyPath: "id" });
          spaces.createIndex("deletedAt", "deletedAt");
        }
        if (!db.objectStoreNames.contains(STORE_NAMES.settings)) {
          db.createObjectStore(STORE_NAMES.settings, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_NAMES.syncQueue)) {
          const syncQueue = db.createObjectStore(STORE_NAMES.syncQueue, { keyPath: "id" });
          // entityId: FIFO-per-entity drain (Architecture Proposal
          // section 4.3, "FIFO per entity untuk menghindari race").
          // queuedAt: global FIFO order for the full-queue drain.
          syncQueue.createIndex("entityId", "entityId");
          syncQueue.createIndex("queuedAt", "queuedAt");
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Test-only: drops the memoized connection so the next getDB() call
 * opens fresh. Needed between test cases that use fake-indexeddb,
 * since the module-level singleton otherwise leaks state across
 * tests.
 */
export function __resetDBConnectionForTests(): void {
  dbPromise = null;
}
