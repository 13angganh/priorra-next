"use client";

import { motion } from "framer-motion";
import type { Priority } from "@/types/task";

/**
 * Inline 1-8 priority picker. Development Phase #30.
 */
export function PrioritySelector({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (p: Priority) => void;
}) {
  const priorities: Priority[] = [1, 2, 3, 4, 5, 6, 7, 8];
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Priority">
      {priorities.map((p) => (
        <motion.button
          key={p}
          type="button"
          role="radio"
          aria-checked={value === p}
          onClick={() => onChange(p)}
          whileTap={{ scale: 0.88 }}
          className={`w-8 h-8 rounded-full text-[13px] font-semibold transition-colors duration-150 ${
            value === p
              ? "bg-[var(--color-accent)] text-white shadow-sm shadow-[var(--color-accent)]/30"
              : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          }`}
        >
          {p}
        </motion.button>
      ))}
    </div>
  );
}
