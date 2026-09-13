"use client";

import { AnimatePresence } from "framer-motion";
import type { Task } from "@/types/task";
import { smartSort } from "@/lib/sorting/smart-sort";
import { TaskItem } from "./task-item";
import { EmptyState, TasksEmptyIcon, Button } from "@/components/ui";

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
  onAddTask,
}: {
  tasks: Task[];
  sortMode: "smart" | "manual";
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAddTask?: () => void;
}) {
  const ordered =
    sortMode === "smart"
      ? smartSort(tasks)
      : [...tasks].sort((a, b) => a.sortOrder - b.sortOrder);

  if (ordered.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[var(--content-height)]">
        <EmptyState
          icon={<TasksEmptyIcon />}
          title="Nothing on your plate"
          description="Add your first task to this space and it'll show up right here, sorted by what matters most."
          action={onAddTask && <Button onClick={onAddTask}>+ Add task</Button>}
        />
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
