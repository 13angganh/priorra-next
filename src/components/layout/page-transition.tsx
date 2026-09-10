"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Wraps route content in a subtle fade+rise transition keyed by
 * pathname, so switching bottom-nav tabs feels like a native screen
 * transition rather than an instant content swap. Development Phase
 * #30 — part of the "elegant, premium, smooth" UI/UX requirement.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
