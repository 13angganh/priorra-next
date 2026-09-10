import type { SyncState } from "./sync";

/**
 * Task domain type (Development Phase #23).
 *
 * Priority is a fixed 1..8 scale — see Architecture Proposal
 * section 6 / Master Instruction section 7. Higher number = higher
 * priority (P8 is most urgent).
 */
export type Priority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type TaskStatus = "pending" | "completed";

export interface Task {
  id: string;
  spaceId: string;
  title: string;
  note?: string;
  priority: Priority;
  status: TaskStatus;
  /** ISO 8601 date string (date only, no time component). */
  dueDate?: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /**
   * ISO 8601 timestamp — last logically meaningful edit (title,
   * priority, due date, etc). Distinct from `localUpdatedAt`, which
   * is sync bookkeeping (Architecture Proposal section 3.2).
   */
  updatedAt: string;
  /** ISO 8601 timestamp, set when status transitions to 'completed'. */
  completedAt?: string;
  /** Manual-mode ordering position within its Space. */
  sortOrder: number;

  // --- Hybrid sync fields (Architecture Proposal section 3) ---
  syncState: SyncState;
  /** ISO 8601 timestamp — when this record last changed on THIS device. */
  localUpdatedAt: string;
  /** ISO 8601 timestamp — when the server last accepted a write for this record. */
  serverUpdatedAt?: string;
  syncVersion?: number;
  /**
   * ISO 8601 timestamp. Set instead of physically deleting the row,
   * so the deletion itself can propagate through sync (a tombstone).
   * Rows with deletedAt set are excluded from normal reads.
   */
  deletedAt?: string;
}

/**
 * Fields required to create a new Task. System-generated fields
 * (id, createdAt, updatedAt, localUpdatedAt, syncState, sortOrder
 * default) are supplied by the repository, not the caller.
 */
export interface TaskInput {
  spaceId: string;
  title: string;
  note?: string;
  priority: Priority;
  dueDate?: string;
}

/** Partial update — every domain field is optional except what identifies the record. */
export type TaskUpdate = Partial<
  Pick<Task, "title" | "note" | "priority" | "dueDate" | "status" | "sortOrder">
>;
