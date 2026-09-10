"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Task } from "@/types/task";
import { PriorityBadge } from "@/components/priority";

/**
 * Single task row. Complete/uncomplete never asks for confirmation
 * (Master Instruction section 6). Development Phase #30.
 *
 * The checkmark path draws in via a stroke-dashoffset animation
 * rather than appearing instantly — this and the layout-aware
 * enter/exit (via the parent's <AnimatePresence>+layout) are what
 * separate a "smooth" list from a merely functional one.
 */
export function TaskItem({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
}: {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const isCompleted = task.status === "completed";

  // Date.now() called directly in the render body is an impure call
  // (eslint-plugin-react-hooks flags this — react.dev/reference/
  // rules/components-and-hooks-must-be-pure). A lazy useState
  // initializer runs exactly once, at mount, which IS an allowed
  // place to read the clock — "now" for overdue-checking purposes
  // doesn't need to be more live than "as of when this row mounted"
  // for a personal task app.
  const [nowMs] = useState(() => Date.now());
  const isOverdue = !isCompleted && task.dueDate && Date.parse(task.dueDate) < nowMs;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.15 } }}
      transition={{ type: "spring", damping: 30, stiffness: 400 }}
      className="flex items-center gap-3 py-3 px-1 border-b border-zinc-100 dark:border-zinc-800/80"
    >
      <motion.button
        onClick={() => onToggleComplete(task)}
        whileTap={{ scale: 0.85 }}
        aria-label={isCompleted ? "Mark as pending" : "Mark as complete"}
        className={`relative w-[22px] h-[22px] rounded-full border-2 shrink-0 transition-colors duration-200 ${
          isCompleted
            ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
            : "border-zinc-300 dark:border-zinc-600"
        }`}
      >
        <AnimatePresence>
          {isCompleted && (
            <motion.svg
              viewBox="0 0 20 20"
              fill="none"
              className="w-full h-full p-[3px] absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.path
                d="M4 10.5l3.5 3.5L16 5.5"
                stroke="white"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>

      <button onClick={() => onEdit(task)} className="flex-1 text-left min-w-0 py-0.5">
        <motion.p
          animate={{ opacity: isCompleted ? 0.45 : 1 }}
          className={`text-[15px] leading-snug truncate transition-[text-decoration-color] ${
            isCompleted ? "line-through decoration-zinc-400" : ""
          }`}
        >
          {task.title}
        </motion.p>
        {task.dueDate && (
          <p
            className={`text-[12px] mt-0.5 ${
              isOverdue ? "text-red-500 font-medium" : "text-zinc-400"
            }`}
          >
            {new Date(task.dueDate).toLocaleDateString()}
          </p>
        )}
      </button>

      <PriorityBadge priority={task.priority} />

      <motion.button
        onClick={() => onDelete(task)}
        whileTap={{ scale: 0.85 }}
        aria-label="Delete task"
        className="text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 px-1 shrink-0 transition-colors"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path
            fillRule="evenodd"
            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </motion.button>
    </motion.div>
  );
}
