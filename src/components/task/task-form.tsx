"use client";

import { useState, type FormEvent } from "react";
import type { Task, Priority } from "@/types/task";
import { PrioritySelector } from "@/components/priority";
import { Button } from "@/components/ui";

/**
 * Create/edit form for a Task. Same component for both modes —
 * pass `task` to edit, omit it to create. Development Phase #30.
 */
export interface TaskFormValues {
  title: string;
  note?: string;
  priority: Priority;
  dueDate?: string;
}

const inputClass =
  "w-full rounded-2xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/60 dark:bg-zinc-800/40 px-3.5 py-2.5 text-[15px] outline-none transition-all duration-150 focus:bg-white dark:focus:bg-zinc-800 focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent)]/10";

export function TaskForm({
  task,
  onSubmit,
  onCancel,
}: {
  task?: Task;
  onSubmit: (values: TaskFormValues) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [note, setNote] = useState(task?.note ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 4);
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    onSubmit({
      title: title.trim(),
      note: note.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="task-title" className="block text-[13px] font-medium text-zinc-500 mb-1.5">
          Title
        </label>
        <input
          id="task-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          required
          maxLength={500}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="task-note" className="block text-[13px] font-medium text-zinc-500 mb-1.5">
          Note (optional)
        </label>
        <textarea
          id="task-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={5000}
          className={`${inputClass} resize-none`}
        />
      </div>

      <div>
        <label className="block text-[13px] font-medium text-zinc-500 mb-2">Priority</label>
        <PrioritySelector value={priority} onChange={setPriority} />
      </div>

      <div>
        <label htmlFor="task-due" className="block text-[13px] font-medium text-zinc-500 mb-1.5">
          Due date (optional)
        </label>
        <input
          id="task-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex gap-2 justify-end mt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!title.trim() || submitting}>
          {task ? "Save" : "Add task"}
        </Button>
      </div>
    </form>
  );
}
