"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

/**
 * Pure UI primitive — a real empty state (illustration + message +
 * optional action), not just a line of gray text floating in a
 * mostly-blank screen. Development Phase #30 (revisited).
 *
 * REAL PROBLEM FIXED: a full visual audit (screenshots of every
 * page) found /tasks, /spaces, and /completed all left roughly 70%
 * of the screen blank whenever there wasn't much data yet — just a
 * small gray sentence centered in an otherwise-empty viewport. That
 * reads as unfinished rather than considered, which is exactly what
 * was raised as feedback. This doesn't add content that isn't
 * there — it makes the fact that there's nothing there yet feel
 * like a deliberate, designed moment instead of a placeholder that
 * got forgotten.
 *
 * This component itself has no fixed vertical padding — even after
 * adding a real illustration/title/description/action, a screenshot
 * still showed a large gap below it, just smaller than before.
 * Vertical centering is the caller's job (via flex), not this
 * component's, since the available height differs per page (whether
 * SpaceTabs is present, whether TopBar has an action slot filled,
 * etc) — see any of /tasks, /spaces, /completed for the
 * `flex-1 flex items-center justify-center` wrapper pattern.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col items-center text-center px-6"
    >
      <div className="w-20 h-20 rounded-3xl bg-[var(--color-accent)]/8 flex items-center justify-center mb-5 text-[var(--color-accent)]">
        {icon}
      </div>
      <h2 className="text-[16px] font-semibold mb-1.5">{title}</h2>
      <p className="text-[13px] text-zinc-400 max-w-[240px] leading-relaxed mb-5">
        {description}
      </p>
      {action}
    </motion.div>
  );
}
