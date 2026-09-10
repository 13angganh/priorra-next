"use client";

import { AnimatePresence } from "framer-motion";
import type { Task } from "@/types/task";
import { smartSort } from "@/lib/sorting/smart-sort";
import { TaskItem } from "./task-item";

/**
 * Renders a Space's tasks in the given sort mode. Manual mode is a
 * fully separate code path (ORDER BY sortOrder) from smart mode —
 * see lib/sorting/smart-sort.ts docstring, Master Instruction
 * section 7 point 6. Development Phase #30.
 *
 * Wrapped in AnimatePresence so TaskItem's exit animation actually
 * plays on delete/complete-and-remove, instead of the row vanishing
 * instantly.
 */
export function TaskList({
  tasks,
  sortMode,
  onToggleComplete,
  onEdit,
  onDelete,
}: {
  tasks: Task[];
  sortMode: "smart" | "manual";
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const ordered =
    sortMode === "smart"
      ? smartSort(tasks)
      : [...tasks].sort((a, b) => a.sortOrder - b.sortOrder);

  if (ordered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <span className="text-3xl opacity-30">✓</span>
        <p className="text-sm text-zinc-400">No tasks yet. Add one to get started.</p>
      </div>
    );
  }

  return (
    <div>
      <AnimatePresence initial={false} mode="popLayout">
        {ordered.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggleComplete={onToggleComplete}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
