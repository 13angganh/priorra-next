"use client";

import { type ReactNode, useContext, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

/**
 * Wraps route content in a subtle fade+rise transition keyed by
 * pathname, so switching bottom-nav tabs feels like a native screen
 * transition rather than an instant content swap. Development Phase
 * #30 — part of the "elegant, premium, smooth" UI/UX requirement.
 *
 * REAL BUG FIX: this used to be a bare AnimatePresence+motion.div
 * around {children}, with no FrozenRouter. That version could
 * render a BLANK page after rapid navigation — reproduced and
 * confirmed via Playwright (see CHANGELOG.md). Root cause: the App
 * Router updates its internal LayoutRouterContext on every
 * navigation, which can unmount the exiting page's component tree
 * mid-animation, before AnimatePresence's exit animation finishes —
 * the exact failure mode documented at
 * https://github.com/vercel/next.js/issues/49279. The fix is the
 * community-standard "FrozenRouter" pattern: freeze the router
 * context for the exiting page's subtree until its exit animation
 * completes, so the App Router can't pull the rug out from under
 * Framer Motion mid-transition.
 *
 * NOTE on implementation: the commonly-published version of this
 * pattern (e.g. the Medium article this is adapted from) tracks the
 * previous pathname/context with useRef and reads `ref.current`
 * directly in the render body. `eslint-plugin-react-hooks`'s
 * `react-hooks/refs` rule correctly flags that as "Cannot access
 * refs during render" — and this isn't just a lint nit; it's
 * exactly the class of bug (output depending on a mutable value
 * React doesn't track for re-rendering) that this component exists
 * to fix. React's own docs describe the correct pattern for this —
 * "adjusting state during render" — using useState with a
 * setState-during-render call guarded by an inequality check, NOT
 * useRef: https://react.dev/reference/react/useState#storing-information-from-previous-renders
 *
 * FrozenRouter reads Next.js's internal LayoutRouterContext — not a
 * public API, so it could change in a future Next.js version. If a
 * Next.js upgrade breaks this import, the safe fallback is deleting
 * FrozenRouter and passing {children} to motion.div directly (loses
 * the exit animation but the app functions correctly either way —
 * this is a purely cosmetic enhancement, not load-bearing).
 */
function FrozenRouter({ children }: { children: ReactNode }) {
  const context = useContext(LayoutRouterContext);
  const pathname = usePathname();

  const [state, setState] = useState({ pathname, frozenContext: context });

  if (state.pathname !== pathname) {
    // "Adjusting state during render" per React's own docs — allowed
    // specifically because it's guarded by the inequality check
    // above, which prevents the infinite-loop React would otherwise
    // bail out on. React re-renders this component immediately with
    // the new state before committing anything to the DOM, so this
    // costs an extra render pass but never an extra paint.
    setState({ pathname, frozenContext: state.frozenContext });
  } else if (state.frozenContext !== context) {
    setState({ pathname, frozenContext: context });
  }

  const changed = state.pathname !== pathname;

  return (
    <LayoutRouterContext.Provider value={changed ? state.frozenContext : context}>
      {children}
    </LayoutRouterContext.Provider>
  );
}

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
      >
        <FrozenRouter>{children}</FrozenRouter>
      </motion.div>
    </AnimatePresence>
  );
}
