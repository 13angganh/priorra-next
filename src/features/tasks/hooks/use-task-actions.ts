"use client";

import { useCallback } from "react";
import { taskInputSchema, taskUpdateSchema } from "@/lib/validation/task-schema";
import type { TaskInput, TaskUpdate } from "@/types/task";
import { taskRepository as repo } from "@/lib/db/repositories/singletons";

/**
 * Task CRUD actions, with Zod validation applied before every write
 * (Development Phase #27, section 23 validation boundary).
 */
export function useTaskActions() {
  const createTask = useCallback(async (input: TaskInput) => {
    const parsed = taskInputSchema.parse(input);
    return repo.create(parsed);
  }, []);

  const updateTask = useCallback(async (id: string, patch: TaskUpdate) => {
    const parsed = taskUpdateSchema.parse(patch);
    return repo.update(id, parsed);
  }, []);

  const completeTask = useCallback((id: string) => repo.complete(id), []);
  const uncompleteTask = useCallback((id: string) => repo.uncomplete(id), []);
  const deleteTask = useCallback((id: string) => repo.delete(id), []);
  const reorderTasks = useCallback(
    (spaceId: string, orderedIds: string[]) => repo.reorder(spaceId, orderedIds),
    []
  );

  return { createTask, updateTask, completeTask, uncompleteTask, deleteTask, reorderTasks };
}
