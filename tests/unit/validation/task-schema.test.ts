import { describe, it, expect } from "vitest";
import { taskInputSchema, taskUpdateSchema, prioritySchema } from "@/lib/validation/task-schema";

describe("prioritySchema", () => {
  it("accepts all values 1..8", () => {
    for (let p = 1; p <= 8; p++) {
      expect(prioritySchema.safeParse(p).success).toBe(true);
    }
  });

  it("rejects 0 and 9", () => {
    expect(prioritySchema.safeParse(0).success).toBe(false);
    expect(prioritySchema.safeParse(9).success).toBe(false);
  });

  it("rejects non-integers", () => {
    expect(prioritySchema.safeParse(3.5).success).toBe(false);
  });
});

describe("taskInputSchema", () => {
  it("accepts a minimal valid input", () => {
    const result = taskInputSchema.safeParse({
      spaceId: "space-1",
      title: "Buy milk",
      priority: 5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = taskInputSchema.safeParse({
      spaceId: "space-1",
      title: "",
      priority: 5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only title", () => {
    const result = taskInputSchema.safeParse({
      spaceId: "space-1",
      title: "   ",
      priority: 5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing spaceId", () => {
    const result = taskInputSchema.safeParse({
      title: "Buy milk",
      priority: 5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-range priority", () => {
    const result = taskInputSchema.safeParse({
      spaceId: "space-1",
      title: "Buy milk",
      priority: 99,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid dueDate string", () => {
    const result = taskInputSchema.safeParse({
      spaceId: "space-1",
      title: "Buy milk",
      priority: 5,
      dueDate: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid ISO dueDate", () => {
    const result = taskInputSchema.safeParse({
      spaceId: "space-1",
      title: "Buy milk",
      priority: 5,
      dueDate: "2026-09-01",
    });
    expect(result.success).toBe(true);
  });
});

describe("taskUpdateSchema", () => {
  it("accepts an empty update object (no-op update)", () => {
    expect(taskUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a status-only update", () => {
    expect(taskUpdateSchema.safeParse({ status: "completed" }).success).toBe(true);
  });

  it("rejects an invalid status value", () => {
    expect(taskUpdateSchema.safeParse({ status: "archived" }).success).toBe(false);
  });
});
