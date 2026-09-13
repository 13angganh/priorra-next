"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Pure UI primitive — a real picker (grid of tappable emoji), not a
 * bare text input the person has to type an emoji into themselves.
 * Fixes a real usability complaint: the previous SpaceForm just had
 * `<input placeholder="📋">` with no way to actually pick one on
 * most devices — most mobile users have no fast path to an emoji
 * keyboard from a plain text field, so the field was effectively
 * unusable. Development Phase #30 (revisited).
 *
 * Curated to Space-relevant categories (work, personal, home, etc)
 * rather than a full generic emoji keyboard — a Space icon is meant
 * to be a quick-glance category marker, not general text input.
 *
 * REAL BUG FIXED DURING BUILD: the first version positioned the
 * popover with `position: absolute` relative to the trigger button,
 * which sits inside SpaceForm -> Modal. Modal is a short bottom
 * sheet on mobile, so the popover either got clipped by the
 * viewport (rendered below the button, ran off the bottom of the
 * screen) or, once flipped to render above the button, spilled
 * outside Modal's own bounds — and in both cases, Modal's backdrop
 * (z-50, covering the full viewport, used to close Modal on
 * outside-click) sat at a HIGHER z-index than the popover for
 * whatever part of it fell outside Modal's rendered box, silently
 * eating clicks (confirmed via a real Playwright click timing out
 * with "intercepts pointer events" — not a guess). Fixed by
 * rendering the popover through a portal directly into
 * document.body, positioned with `position: fixed` from the
 * trigger's actual on-screen coordinates — this makes it fully
 * independent of Modal's size, scroll position, or z-index stacking
 * entirely, rather than trying to out-z-index a parent that can
 * change shape.
 */
const CURATED_ICONS = [
  "💼", "🏠", "👤", "🛒", "💪", "📚", "✈️", "🎨",
  "💰", "🍳", "🚗", "🎯", "📅", "🎓", "🐾", "🌱",
  "🎮", "🧘", "🏥", "🔧", "📝", "🎵", "⚽", "💡",
] as const;

export function IconPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (icon: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const openPicker = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Popover is 248px wide; keep it on-screen horizontally, and
    // place it above the button (mb-2 equivalent = 8px gap) since
    // the trigger is most often near the bottom of a bottom-sheet
    // Modal, where there's reliably more room above than below.
    const POPOVER_WIDTH = 248;
    const left = Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8);
    setPosition({ top: rect.top - 8, left: Math.max(8, left) });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="relative">
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        whileTap={{ scale: 0.94 }}
        aria-label={value ? `Change icon (currently ${value})` : "Choose an icon"}
        aria-expanded={open}
        className="w-14 h-14 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/60 dark:bg-zinc-800/40 flex items-center justify-center text-2xl transition-colors hover:border-[var(--color-accent)]"
      >
        {value ?? <span className="text-zinc-300 dark:text-zinc-600 text-lg">+</span>}
      </motion.button>

      {open &&
        position &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, scale: 0.95, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 4 }}
              transition={{ type: "spring", damping: 28, stiffness: 420 }}
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
                transform: "translateY(-100%)",
                width: 248,
              }}
              className="z-[100] p-2.5 rounded-2xl bg-white dark:bg-zinc-900 shadow-xl border border-zinc-100 dark:border-zinc-800"
            >
              <div className="grid grid-cols-6 gap-1">
                {CURATED_ICONS.map((icon) => (
                  <motion.button
                    key={icon}
                    type="button"
                    whileTap={{ scale: 0.85 }}
                    onClick={() => {
                      onChange(icon === value ? undefined : icon);
                      setOpen(false);
                    }}
                    aria-label={icon}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-colors ${
                      value === icon
                        ? "bg-[var(--color-accent)]/15"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {icon}
                  </motion.button>
                ))}
              </div>
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(undefined);
                    setOpen(false);
                  }}
                  className="w-full mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[12px] text-zinc-400 hover:text-red-500 transition-colors"
                >
                  Remove icon
                </button>
              )}
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
