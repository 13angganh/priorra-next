"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout";
import { SpaceTabs, SpaceForm } from "@/components/space";
import { TaskList, TaskForm } from "@/components/task";
import { Modal, Button, Toast, TaskListSkeleton, EmptyState, SpacesEmptyIcon } from "@/components/ui";
import { useSpaceList } from "@/features/spaces/hooks/use-space-list";
import { useSpaceActions } from "@/features/spaces/hooks/use-space-actions";
import { useTaskList } from "@/features/tasks/hooks/use-task-list";
import { useTaskActions } from "@/features/tasks/hooks/use-task-actions";
import { useUndo } from "@/features/tasks/state/use-undo";
import type { Task } from "@/types/task";

/**
 * /tasks — the main dashboard (Development Phase #30/#31).
 * Pending tasks only; completed tasks live at /completed.
 */
export default function TasksPage() {
  const { spaces, loading: spacesLoading } = useSpaceList();
  const { createSpace } = useSpaceActions();

  // Tracks the user's EXPLICIT selection only. The effective active
  // space (falling back to the first space once spaces load) is
  // derived below, at render time — not synced via an effect. This
  // avoids the extra render pass that setState-in-effect causes,
  // and it's simpler: there's no "space just appeared, catch up"
  // step to get wrong.
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const activeSpaceId =
    selectedSpaceId && spaces.some((s) => s.id === selectedSpaceId)
      ? selectedSpaceId
      : (spaces[0]?.id ?? null);

  const { tasks, loading: tasksLoading } = useTaskList(activeSpaceId);
  const pendingTasks = tasks.filter((t) => t.status === "pending");

  const { createTask, updateTask, completeTask, uncompleteTask, deleteTask } = useTaskActions();
  const { pendingUndoTaskId, showUndo, dismissUndo } = useUndo();


  const [editingTask, setEditingTask] = useState<Task | "new" | null>(null);
  const [creatingSpace, setCreatingSpace] = useState(false);

  const handleToggleComplete = async (task: Task) => {
    if (task.status === "pending") {
      await completeTask(task.id);
      showUndo(task.id);
    } else {
      await uncompleteTask(task.id);
    }
  };

  if (!spacesLoading && spaces.length === 0) {
    return (
      <>
        <TopBar title="Tasks" />
        <div className="flex items-center justify-center min-h-[var(--content-height)]">
          <EmptyState
            icon={<SpacesEmptyIcon />}
            title="Let's set up your first space"
            description="Spaces keep different areas of your life separate — Work, Personal, whatever fits how you think. You'll add tasks once you've got one."
            action={<Button onClick={() => setCreatingSpace(true)}>Create your first space</Button>}
          />
        </div>
        <Modal open={creatingSpace} onClose={() => setCreatingSpace(false)} title="New space">
          <SpaceForm
            onSubmit={async (values) => {
              const space = await createSpace(values);
              setSelectedSpaceId(space.id);
              setCreatingSpace(false);
            }}
            onCancel={() => setCreatingSpace(false)}
          />
        </Modal>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Tasks"
        action={
          <Button
            size="sm"
            onClick={() => {
              dismissUndo();
              setEditingTask("new");
            }}
            disabled={!activeSpaceId}
          >
            + Add
          </Button>
        }
      />

      <div className="py-3">
        <SpaceTabs
          spaces={spaces}
          activeSpaceId={activeSpaceId}
          onSelect={setSelectedSpaceId}
          onAddSpace={() => {
            dismissUndo();
            setCreatingSpace(true);
          }}
        />
      </div>

      {tasksLoading ? (
        <TaskListSkeleton />
      ) : (
        <TaskList
          tasks={pendingTasks}
          sortMode="smart"
          onToggleComplete={handleToggleComplete}
          onEdit={(task) => {
            dismissUndo();
            setEditingTask(task);
          }}
          onDelete={(task) => deleteTask(task.id)}
          onAddTask={() => {
            dismissUndo();
            setEditingTask("new");
          }}
        />
      )}

      <Modal
        open={editingTask !== null}
        onClose={() => setEditingTask(null)}
        title={editingTask === "new" ? "New task" : "Edit task"}
      >
        {activeSpaceId && (
          <TaskForm
            task={editingTask !== "new" ? (editingTask ?? undefined) : undefined}
            onSubmit={async (values) => {
              if (editingTask === "new") {
                await createTask({ ...values, spaceId: activeSpaceId });
              } else if (editingTask) {
                await updateTask(editingTask.id, values);
              }
              setEditingTask(null);
            }}
            onCancel={() => setEditingTask(null)}
          />
        )}
      </Modal>

      <Modal open={creatingSpace} onClose={() => setCreatingSpace(false)} title="New space">
        <SpaceForm
          onSubmit={async (values) => {
            const space = await createSpace(values);
            setSelectedSpaceId(space.id);
            setCreatingSpace(false);
          }}
          onCancel={() => setCreatingSpace(false)}
        />
      </Modal>

      {pendingUndoTaskId && (
        <Toast
          message="Task completed"
          actionLabel="Undo"
          onAction={async () => {
            await uncompleteTask(pendingUndoTaskId);
            dismissUndo();
          }}
          onDismiss={dismissUndo}
        />
      )}
    </>
  );
}
