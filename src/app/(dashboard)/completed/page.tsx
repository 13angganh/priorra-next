"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TopBar } from "@/components/layout";
import { SpaceTabs } from "@/components/space";
import { Skeleton, EmptyState, CompletedEmptyIcon } from "@/components/ui";
import { useSpaceList } from "@/features/spaces/hooks/use-space-list";
import { useTaskList } from "@/features/tasks/hooks/use-task-list";
import { useTaskActions } from "@/features/tasks/hooks/use-task-actions";
import { PriorityBadge } from "@/components/priority";

/**
 * /completed — completed tasks for the active Space, most recently
 * completed first. Uncomplete is a single tap, no confirmation
 * (Master Instruction section 6). Development Phase #30.
 */
export default function CompletedPage() {
  const { spaces, loading: spacesLoading } = useSpaceList();

  // See /tasks/page.tsx for why this is derived at render time
  // rather than synced via useEffect + setState.
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const activeSpaceId =
    selectedSpaceId && spaces.some((s) => s.id === selectedSpaceId)
      ? selectedSpaceId
      : (spaces[0]?.id ?? null);

  const { tasks, loading: tasksLoading } = useTaskList(activeSpaceId);
  const { uncompleteTask } = useTaskActions();


  const completedTasks = [...tasks]
    .filter((t) => t.status === "completed")
    .sort((a, b) => Date.parse(b.completedAt ?? "0") - Date.parse(a.completedAt ?? "0"));

  return (
    <>
      <TopBar title="Completed" />

      {!spacesLoading && spaces.length > 0 && (
        <div className="py-3">
          <SpaceTabs
            spaces={spaces}
            activeSpaceId={activeSpaceId}
            onSelect={setSelectedSpaceId}
          />
        </div>
      )}

      {tasksLoading ? (
        <div className="space-y-2 py-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : completedTasks.length === 0 ? (
        <div className="flex items-center justify-center min-h-[var(--content-height)]">
          <EmptyState
            icon={<CompletedEmptyIcon />}
            title="Nothing finished yet"
            description="Tasks you complete in this space will land here, most recent first."
          />
        </div>
      ) : (
        <AnimatePresence initial={false} mode="popLayout">
          {completedTasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -24, transition: { duration: 0.15 } }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="flex items-center gap-3 py-3 px-1 border-b border-zinc-100 dark:border-zinc-800/80"
            >
              <button
                onClick={() => uncompleteTask(task.id)}
                aria-label="Mark as pending"
                className="w-[22px] h-[22px] rounded-full bg-[var(--color-accent)] flex items-center justify-center shrink-0 active:scale-90 transition-transform"
              >
                <svg viewBox="0 0 20 20" fill="none" className="w-full h-full p-[3px]">
                  <path
                    d="M4 10.5l3.5 3.5L16 5.5"
                    stroke="white"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] leading-snug truncate opacity-45 line-through decoration-zinc-400">
                  {task.title}
                </p>
                {task.completedAt && (
                  <p className="text-[12px] mt-0.5 text-zinc-400">
                    Completed {new Date(task.completedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <PriorityBadge priority={task.priority} />
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </>
  );
}
