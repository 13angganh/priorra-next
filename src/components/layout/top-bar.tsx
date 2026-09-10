import type { ReactNode } from "react";
import { SyncIndicator } from "./sync-indicator";

/**
 * Simple top bar, sticky, with an optional trailing action slot.
 * Always shows the sync status indicator (Architecture Proposal
 * section 5) between the title and the action slot — every page
 * that uses TopBar gets it automatically, no per-page wiring
 * needed. Development Phase #30, extended #36.
 */
export function TopBar({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-100 dark:border-zinc-800">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-lg font-semibold">{title}</h1>
        <SyncIndicator />
      </div>
      {action}
    </header>
  );
}
