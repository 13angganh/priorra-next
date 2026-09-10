"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

/**
 * Mobile-first bottom navigation (Master Instruction section 21).
 * Development Phase #30. Active icon lifts and glows subtly rather
 * than just changing color — a small detail that reads as native
 * rather than a styled <nav>.
 */
const NAV_ITEMS = [
  { href: "/tasks", label: "Tasks", icon: "\u2713" },
  { href: "/spaces", label: "Spaces", icon: "\u25A2" },
  { href: "/completed", label: "Done", icon: "\u2611" },
  { href: "/settings", label: "Settings", icon: "\u2699" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-zinc-100 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      {NAV_ITEMS.map((item) => {
        const active = pathname?.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className="relative flex-1">
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center gap-0.5 py-2.5"
            >
              <motion.span
                animate={{ y: active ? -1 : 0, scale: active ? 1.08 : 1 }}
                transition={{ type: "spring", damping: 20, stiffness: 400 }}
                className={`text-base leading-none ${
                  active ? "text-[var(--color-accent)]" : "text-zinc-400 dark:text-zinc-500"
                }`}
              >
                {item.icon}
              </motion.span>
              <span
                className={`text-[10px] font-medium ${
                  active ? "text-[var(--color-accent)]" : "text-zinc-400 dark:text-zinc-500"
                }`}
              >
                {item.label}
              </span>
            </motion.div>
          </Link>
        );
      })}
    </nav>
  );
}
