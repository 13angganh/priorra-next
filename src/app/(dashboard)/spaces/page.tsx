"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TopBar } from "@/components/layout";
import { SpaceForm } from "@/components/space";
import { Modal, Button, Skeleton } from "@/components/ui";
import { useSpaceList } from "@/features/spaces/hooks/use-space-list";
import { useSpaceActions } from "@/features/spaces/hooks/use-space-actions";
import type { Space } from "@/types/space";

/**
 * /spaces — manage Spaces (Development Phase #30).
 */
export default function SpacesPage() {
  const { spaces, loading } = useSpaceList();
  const { createSpace, updateSpace, deleteSpace } = useSpaceActions();
  const [editingSpace, setEditingSpace] = useState<Space | "new" | null>(null);

  return (
    <>
      <TopBar
        title="Spaces"
        action={
          <Button size="sm" onClick={() => setEditingSpace("new")}>
            + New
          </Button>
        }
      />

      <div className="py-3">
        {loading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}

        {!loading && spaces.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="text-3xl opacity-30">▢</span>
            <p className="text-sm text-zinc-400">
              No spaces yet. Create one to start adding tasks.
            </p>
          </div>
        )}

        <AnimatePresence initial={false} mode="popLayout">
          {spaces.map((space) => (
            <motion.div
              key={space.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -24, transition: { duration: 0.15 } }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="flex items-center justify-between gap-2 mb-2 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 px-4 py-3.5"
            >
              <button
                onClick={() => setEditingSpace(space)}
                className="flex-1 text-left text-[15px] min-w-0"
              >
                <span className="truncate block">
                  {space.icon ? `${space.icon} ` : ""}
                  {space.name}
                  {space.archived && (
                    <span className="ml-2 text-xs text-zinc-400 font-normal">
                      (archived)
                    </span>
                  )}
                </span>
              </button>
              <motion.button
                onClick={() => deleteSpace(space.id)}
                whileTap={{ scale: 0.9 }}
                aria-label={`Delete ${space.name}`}
                className="shrink-0 text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 text-[13px] font-medium px-2 transition-colors"
              >
                Delete
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Modal
        open={editingSpace !== null}
        onClose={() => setEditingSpace(null)}
        title={editingSpace === "new" ? "New space" : "Edit space"}
      >
        <SpaceForm
          space={editingSpace !== "new" ? (editingSpace ?? undefined) : undefined}
          onSubmit={async (values) => {
            if (editingSpace === "new") {
              await createSpace(values);
            } else if (editingSpace) {
              await updateSpace(editingSpace.id, values);
            }
            setEditingSpace(null);
          }}
          onCancel={() => setEditingSpace(null)}
        />
      </Modal>
    </>
  );
}
