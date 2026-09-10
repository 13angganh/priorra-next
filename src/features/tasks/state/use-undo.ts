"use client";

import { useState, useCallback, useRef } from "react";

/**
 * Task-level UI state for the "Undo" toast shown briefly after
 * complete() (Master Instruction section 6: "Jangan meminta
 * confirmation setiap kali. Berikan Undo singkat setelah complete.")
 *
 * This is UI-only state — never written to IndexedDB. The actual
 * undo action (uncomplete()) is a normal repository call; this hook
 * only tracks which task's toast is currently showing and auto-hides
 * it after a short window.
 *
 * Development Phase #29.
 */
const UNDO_WINDOW_MS = 5000;

export function useUndo() {
  const [pendingUndoTaskId, setPendingUndoTaskId] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showUndo = useCallback((taskId: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPendingUndoTaskId(taskId);
    timeoutRef.current = setTimeout(() => {
      setPendingUndoTaskId(null);
    }, UNDO_WINDOW_MS);
  }, []);

  const dismissUndo = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPendingUndoTaskId(null);
  }, []);

  return { pendingUndoTaskId, showUndo, dismissUndo };
}
