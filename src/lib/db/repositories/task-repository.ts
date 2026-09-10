import type { Task, TaskInput, TaskUpdate } from "@/types/task";

/**
 * TaskRepository — the single interface UI and domain logic depend
 * on for Task persistence. Neither layer is aware that IndexedDB or
 * Firestore exist underneath it.
 *
 *   TaskRepository (interface)
 *      |-- IndexedDBTaskRepository   -> source of truth, used by UI directly
 *      `-- FirestoreTaskRepository   -> used by SyncEngine only, never by UI
 *
 * All writes resolve immediately against local storage — callers
 * never await a network round-trip (Architecture Proposal section
 * 4.1). Soft-deleted (tombstoned) records are excluded from every
 * read method unless explicitly noted.
 */
export interface TaskRepository {
  /** All non-deleted tasks in a Space. */
  getBySpace(spaceId: string): Promise<Task[]>;
  getById(id: string): Promise<Task | null>;
  create(input: TaskInput): Promise<Task>;
  update(id: string, patch: TaskUpdate): Promise<Task>;
  /** Marks status='completed' and sets completedAt. */
  complete(id: string): Promise<Task>;
  /** Reverses complete() — status='pending', clears completedAt. */
  uncomplete(id: string): Promise<Task>;
  /** Soft delete: sets deletedAt (tombstone), does not physically remove the row. */
  delete(id: string): Promise<void>;
  /**
   * Persists a full manual-mode ordering for a Space in one
   * operation, so a drag-and-drop reorder is a single atomic write
   * rather than N separate updates.
   */
  reorder(spaceId: string, orderedIds: string[]): Promise<void>;

  /**
   * Subscribes to any change (create/update/delete) affecting this
   * Space's tasks. Used by the live-query hook in
   * features/tasks/hooks/ so the UI re-renders without a manual
   * refetch. Returns an unsubscribe function.
   */
  subscribe(spaceId: string, callback: () => void): () => void;
}
