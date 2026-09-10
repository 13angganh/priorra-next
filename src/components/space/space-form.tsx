"use client";

import { useState, type FormEvent } from "react";
import type { Space } from "@/types/space";
import { Button } from "@/components/ui";

/**
 * Create/edit form for a Space. Development Phase #30.
 */
const inputClass =
  "rounded-2xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/60 dark:bg-zinc-800/40 px-3.5 py-2.5 text-[15px] outline-none transition-all duration-150 focus:bg-white dark:focus:bg-zinc-800 focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent)]/10";

export function SpaceForm({
  space,
  onSubmit,
  onCancel,
}: {
  space?: Space;
  onSubmit: (values: { name: string; icon?: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(space?.name ?? "");
  const [icon, setIcon] = useState(space?.icon ?? "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    onSubmit({ name: name.trim(), icon: icon.trim() || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="space-name" className="block text-[13px] font-medium text-zinc-500 mb-1.5">
          Name
        </label>
        <input
          id="space-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
          maxLength={100}
          className={`w-full ${inputClass}`}
        />
      </div>
      <div>
        <label htmlFor="space-icon" className="block text-[13px] font-medium text-zinc-500 mb-1.5">
          Icon (optional emoji)
        </label>
        <input
          id="space-icon"
          type="text"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          maxLength={4}
          placeholder="📋"
          className={`w-20 text-center ${inputClass}`}
        />
      </div>
      <div className="flex gap-2 justify-end mt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim() || submitting}>
          {space ? "Save" : "Create space"}
        </Button>
      </div>
    </form>
  );
}
