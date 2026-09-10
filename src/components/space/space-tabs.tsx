"use client";

import { motion } from "framer-motion";
import type { Space } from "@/types/space";

/**
 * Horizontal tab bar for switching between Spaces. Development
 * Phase #30. The active pill uses layoutId so it glides between
 * tabs on selection instead of snapping.
 */
export function SpaceTabs({
  spaces,
  activeSpaceId,
  onSelect,
  onAddSpace,
}: {
  spaces: Space[];
  activeSpaceId: string | null;
  onSelect: (spaceId: string) => void;
  onAddSpace: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto px-1 pb-1 -mx-1">
      {spaces.map((space) => {
        const active = activeSpaceId === space.id;
        return (
          <motion.button
            key={space.id}
            onClick={() => onSelect(space.id)}
            whileTap={{ scale: 0.95 }}
            className={`relative shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap ${
              active ? "text-white" : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {active && (
              <motion.span
                layoutId="active-space-pill"
                className="absolute inset-0 rounded-full bg-[var(--color-accent)]"
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
              />
            )}
            {!active && (
              <span className="absolute inset-0 rounded-full bg-zinc-100 dark:bg-zinc-800" />
            )}
            <span className="relative">
              {space.icon ? `${space.icon} ` : ""}
              {space.name}
            </span>
          </motion.button>
        );
      })}
      <motion.button
        onClick={onAddSpace}
        whileTap={{ scale: 0.9 }}
        aria-label="Add space"
        className="shrink-0 w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 flex items-center justify-center text-lg"
      >
        +
      </motion.button>
    </div>
  );
}
