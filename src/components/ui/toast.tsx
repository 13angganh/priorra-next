"use client";

import { AnimatePresence, motion } from "framer-motion";

/**
 * Pure UI primitive — no domain knowledge (Architecture Proposal
 * section 2). Development Phase #30.
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
        className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-900/95 text-white dark:bg-white/95 dark:text-zinc-900 backdrop-blur-sm rounded-full pl-4 pr-2 py-2 shadow-xl text-[13px]"
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
