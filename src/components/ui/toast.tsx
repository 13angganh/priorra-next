"use client";

import { AnimatePresence, motion } from "framer-motion";

/**
 * Pure UI primitive — no domain knowledge (Architecture Proposal
 * section 2). Development Phase #30.
 *
 * REAL BUG FIXED: z-index was z-50, identical to Modal's backdrop —
 * a real screenshot caught the undo toast from completing a task
 * visually overlapping the Edit Task modal's Due Date field and
 * partially covering the Save button, opened less than 5s later
 * (the undo window). Fixed two ways: (1) callers now call
 * dismissUndo() whenever they open another modal (see
 * /tasks/page.tsx), so this shouldn't normally still be showing;
 * (2) as defense in depth, z-index dropped to z-40 (below Modal's
 * z-50) so if a toast IS still showing when a modal opens, the
 * modal correctly wins visually instead of the stacking order being
 * whatever DOM order happened to produce.
 */
export interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
}

export function Toast({ message, actionLabel, onAction, onDismiss }: ToastProps) {
  return (
    <AnimatePresence>
      <motion.div
        role="status"
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{ type: "spring", damping: 28, stiffness: 400 }}
        className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-zinc-900/95 text-white dark:bg-white/95 dark:text-zinc-900 backdrop-blur-sm rounded-full pl-4 pr-2 py-2 shadow-xl text-[13px]"
      >
        <span>{message}</span>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="font-semibold underline underline-offset-2 px-1 active:opacity-60 transition-opacity"
          >
            {actionLabel}
          </button>
        )}
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-white dark:hover:text-zinc-900 active:scale-90 transition-all"
        >
          ×
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
