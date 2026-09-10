import { describe, it, expect } from "vitest";
import { smartSort } from "@/lib/sorting/smart-sort";
import type { Task } from "@/types/task";

/**
 * Minimal Task factory for test readability — only the fields
 * smartSort actually reads are meaningful per-case; the rest are
 * filled with harmless constants.
 */
function makeTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    spaceId: "space-1",
    title: `Task ${overrides.id}`,
    priority: 1,
    status: "pending",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    sortOrder: 0,
    syncState: "synced",
    localUpdatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("smartSort", () => {
  it("does not mutate the input array", () => {
    const input = [makeTask({ id: "a", priority: 1 }), makeTask({ id: "b", priority: 8 })];
    const originalOrder = input.map((t) => t.id);
    smartSort(input);
    expect(input.map((t) => t.id)).toEqual(originalOrder);
  });

  it("rule 1: pending sorts before completed, regardless of priority", () => {
    const low = makeTask({ id: "low-pending", priority: 1, status: "pending" });
    const high = makeTask({ id: "high-completed", priority: 8, status: "completed" });
    const result = smartSort([high, low]);
    expect(result.map((t) => t.id)).toEqual(["low-pending", "high-completed"]);
  });

  it("rule 2: higher priority (P8) sorts before lower priority (P1)", () => {
    const p1 = makeTask({ id: "p1", priority: 1 });
    const p8 = makeTask({ id: "p8", priority: 8 });
    const p4 = makeTask({ id: "p4", priority: 4 });
    const result = smartSort([p1, p8, p4]);
    expect(result.map((t) => t.id)).toEqual(["p8", "p4", "p1"]);
  });

  it("rule 3: earlier due date sorts first, when priority ties", () => {
    const later = makeTask({ id: "later", priority: 5, dueDate: "2026-12-01" });
    const sooner = makeTask({ id: "sooner", priority: 5, dueDate: "2026-09-01" });
    const result = smartSort([later, sooner]);
    expect(result.map((t) => t.id)).toEqual(["sooner", "later"]);
  });

  it("rule 3: tasks without a due date sort AFTER tasks with one, when priority ties", () => {
    const undated = makeTask({ id: "undated", priority: 5 });
    const dated = makeTask({ id: "dated", priority: 5, dueDate: "2026-12-01" });
    const result = smartSort([undated, dated]);
    expect(result.map((t) => t.id)).toEqual(["dated", "undated"]);
  });

  it("rule 4: earlier createdAt is the final tie-breaker", () => {
    const newer = makeTask({ id: "newer", priority: 5, createdAt: "2026-06-01T00:00:00.000Z" });
    const older = makeTask({ id: "older", priority: 5, createdAt: "2026-01-01T00:00:00.000Z" });
    const result = smartSort([newer, older]);
    expect(result.map((t) => t.id)).toEqual(["older", "newer"]);
  });

  it("applies all four rules together in the correct precedence order", () => {
    const tasks: Task[] = [
      makeTask({ id: "completed-p8", priority: 8, status: "completed" }),
      makeTask({ id: "pending-p3-later-due", priority: 3, dueDate: "2026-12-01" }),
      makeTask({ id: "pending-p8-no-due", priority: 8 }),
      makeTask({ id: "pending-p8-due-soon", priority: 8, dueDate: "2026-09-01" }),
      makeTask({ id: "pending-p3-sooner-due", priority: 3, dueDate: "2026-10-01" }),
    ];
    const result = smartSort(tasks);
    expect(result.map((t) => t.id)).toEqual([
      "pending-p8-due-soon",
      "pending-p8-no-due",
      "pending-p3-sooner-due",
      "pending-p3-later-due",
      "completed-p8",
    ]);
  });

  it("returns an empty array unchanged", () => {
    expect(smartSort([])).toEqual([]);
  });

  it("returns a single-task array unchanged", () => {
    const only = makeTask({ id: "only" });
    expect(smartSort([only])).toEqual([only]);
  });
});
