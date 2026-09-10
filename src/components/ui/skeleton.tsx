"use client";

import { motion } from "framer-motion";

/**
 * Pure UI primitive — shimmer skeleton block, no domain knowledge
 * (Architecture Proposal section 2). Development Phase #30.
 *
 * Replaces plain "Loading..." text — a skeleton that mirrors the
 * shape of the content it's standing in for reads as considerably
 * more polished, and avoids the layout jump when real content
 * arrives.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`rounded-lg bg-zinc-200 dark:bg-zinc-800 ${className}`}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/** Preset: mimics a row of TaskItem while tasks are loading. */
export function TaskListSkeleton() {
  return (
    <div className="py-1">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 py-3 px-1">
          <Skeleton className="w-5 h-5 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-[60%]" />
          </div>
          <Skeleton className="w-6 h-6 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}
