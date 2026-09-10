import type { Priority } from "@/types/task";

/**
 * Priority display components (Architecture Proposal section 2).
 * UI/UX note (Master Instruction section 21): one accent color, not
 * eight separate priority colors — intensity/weight communicates
 * priority, not a rainbow of hues. Development Phase #30.
 */
export function PriorityBadge({ priority }: { priority: Priority }) {
  // Opacity scales with priority — same hue throughout, varying weight.
  const opacity = 0.35 + (priority / 8) * 0.65;
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold text-white shrink-0"
      style={{ backgroundColor: `color-mix(in srgb, var(--color-accent) ${opacity * 100}%, transparent)` }}
      title={`Priority ${priority}`}
    >
      P{priority}
    </span>
  );
}
