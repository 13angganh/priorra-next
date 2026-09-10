import type { Task } from "@/types/task";

/**
 * smartSort() — pure function, fully unit-testable without a DB.
 *
 * Tie-break order (Architecture Proposal section 6 / Master
 * Instruction section 7):
 *   1. pending before completed
 *   2. priority descending (P8 -> P1)
 *   3. due date ascending; tasks without a due date sort after
 *      tasks that have one
 *   4. createdAt ascending as final tie-breaker
 *
 * Manual mode never calls this function — it is a fully separate
 * code path (`ORDER BY sortOrder`) so section 7 point 6 is enforced
 * structurally, not by convention.
 *
 * Does not mutate the input array.
 */
export function smartSort(tasks: readonly Task[]): Task[] {
  return [...tasks].sort(compareTasks);
}

function compareTasks(a: Task, b: Task): number {
  // 1. pending before completed
  if (a.status !== b.status) {
    return a.status === "pending" ? -1 : 1;
  }

  // 2. priority descending
  if (a.priority !== b.priority) {
    return b.priority - a.priority;
  }

  // 3. due date ascending; undated sorts after dated
  const aDue = a.dueDate ? Date.parse(a.dueDate) : null;
  const bDue = b.dueDate ? Date.parse(b.dueDate) : null;
  if (aDue !== bDue) {
    if (aDue === null) return 1;
    if (bDue === null) return -1;
    return aDue - bDue;
  }

  // 4. createdAt ascending
  return Date.parse(a.createdAt) - Date.parse(b.createdAt);
}
