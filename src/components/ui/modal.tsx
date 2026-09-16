"use client";

import { type ReactNode, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Pure UI primitive — no domain knowledge (Architecture Proposal
 * section 2). Development Phase #30.
 *
 * Spring-based enter/exit, matching native bottom-sheet feel on
 * mobile and a centered dialog feel on larger screens — per the
 * "elegant, premium, professional, smooth" UI/UX requirement.
 *
 * BACKDROP POINTER-EVENTS: the backdrop is position:fixed inset-0
 * z-50, so while it exists it captures every tap on screen —
 * including taps on BottomNav behind it. Its exit is animated, and
 * the panel's exit is a spring (damping: 32, stiffness: 380) with
 * no fixed duration, so the backdrop can linger in the DOM for a
 * few hundred ms after a close is requested. During that window,
 * taps aimed at whatever is behind the modal would hit the backdrop
 * instead and silently do nothing.
 *
 * `pointerEvents: "none"` is therefore part of the EXIT target, not
 * a style prop: Framer Motion applies it the moment the exit
 * animation starts, so the backdrop stops swallowing taps right
 * away while still fading out visually. (A `style={{ pointerEvents:
 * open ? ... }}` version of this does NOT work — the whole element
 * lives inside `{open && ...}`, so that expression never re-evaluates
 * for the element that's already exiting. An earlier attempt using a
 * separate `interactive` state synced via useEffect also tripped
 * react-hooks/set-state-in-effect, for good reason.)
 */
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] p-0 sm:p-4"
          initial={{ opacity: 0, pointerEvents: "auto" }}
          animate={{ opacity: 1, pointerEvents: "auto" }}
          exit={{ opacity: 0, pointerEvents: "none" }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            className="w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-[28px] sm:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.6 }}
            transition={{ type: "spring", damping: 32, stiffness: 380 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="w-9 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700 mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between mb-5">
              <h2 id="modal-title" className="text-[17px] font-semibold tracking-tight">
                {title}
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-7 h-7 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 active:scale-90 transition-all"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M4.3 4.3a1 1 0 011.4 0L10 8.6l4.3-4.3a1 1 0 111.4 1.4L11.4 10l4.3 4.3a1 1 0 01-1.4 1.4L10 11.4l-4.3 4.3a1 1 0 01-1.4-1.4L8.6 10 4.3 5.7a1 1 0 010-1.4z" />
                </svg>
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
