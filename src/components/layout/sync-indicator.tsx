"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSyncStatus } from "@/hooks/use-sync-status";

/**
 * Small sync-status indicator — a dot + label, matching the
 * "Menyinkronkan...", "Tersimpan", "Offline", "Gagal sinkron" states
 * from Architecture Proposal section 5. Development Phase #36,
 * "error" state added to fix the indefinite-"Menyinkronkan..." bug
 * — see use-sync-status.ts's docstring for the full root cause.
 *
 * Renders nothing when Firebase isn't configured — an offline-only
 * deployment shouldn't show a permanent "not configured" nag in the
 * middle of every page; that state is already explained on
 * /settings, which is the right place for a one-time explanation
 * rather than a persistent header element.
 */
export function SyncIndicator() {
  const status = useSyncStatus();

  if (status === "not-configured") return null;

  const config = {
    offline: { label: "Offline", dot: "bg-zinc-400 dark:bg-zinc-500" },
    syncing: { label: "Menyinkronkan...", dot: "bg-amber-500" },
    synced: { label: "Tersimpan", dot: "bg-emerald-500" },
    error: { label: "Gagal sinkron — lihat Settings", dot: "bg-red-500" },
  }[status];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="flex items-center gap-1.5 text-[12px] text-zinc-400 dark:text-zinc-500"
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === "syncing" ? "animate-pulse" : ""}`}
        />
        {config.label}
      </motion.div>
    </AnimatePresence>
  );
}
