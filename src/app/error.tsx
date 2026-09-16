"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

/**
 * Route-level error boundary (Next.js `error.tsx` file convention).
 *
 * WHY THIS EXISTS: this app previously had NO error boundary at all
 * — confirmed by searching for error.tsx/global-error.tsx and
 * finding neither. That meant any React render error anywhere in a
 * page produced a blank or generic screen with no message, no
 * recovery path, and nothing the person using the app could report
 * back beyond "it crashed". A user reported exactly that symptom
 * ("saat klik menu bottom kadang crash/bug/error"), and despite
 * extensive reproduction attempts — rapid nav clicking, double
 * clicks, clicking with modals open, 6x CPU throttling to emulate a
 * slow phone, 20-round stress loops — it could not be reproduced in
 * a controlled environment. Rather than keep guessing at scenarios,
 * this makes the failure legible WHEN it happens on a real device:
 * the error message and digest are shown on screen and logged, so
 * there's something concrete to act on instead of a blank page.
 *
 * `retry` (not `reset` — that was the prop name in older Next.js
 * versions; verified against this version's own local docs) re-runs
 * the failed render, which genuinely recovers from transient errors.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[PRIORRA Next] Render error caught by error boundary:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 min-h-[var(--content-height)]">
      <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center mb-5 text-red-500">
        <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9">
          <path
            d="M12 8v5M12 16.5v.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
      <h2 className="text-[16px] font-semibold mb-1.5">Something went wrong</h2>
      <p className="text-[13px] text-zinc-400 max-w-[280px] leading-relaxed mb-5">
        Your tasks are safe — they&apos;re stored on this device and nothing was lost.
        Try again, and if this keeps happening, the detail below helps pin down why.
      </p>

      <button
        onClick={retry}
        className="font-medium text-sm px-5 py-2.5 rounded-full bg-[var(--color-accent)] text-white active:scale-96 transition-transform mb-5"
      >
        Try again
      </button>

      <details className="w-full max-w-[320px] text-left">
        <summary className="text-[12px] text-zinc-400 cursor-pointer select-none">
          Error detail
        </summary>
        <pre className="mt-2 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 text-[11px] text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap break-words">
          {error.message}
          {error.digest ? `\n\ndigest: ${error.digest}` : ""}
        </pre>
      </details>
    </div>
  );
}
