import type { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";
import { PageTransition } from "./page-transition";
import { SyncEngineProvider } from "./sync-engine-provider";

/**
 * Root app frame: content area + fixed bottom nav, mobile-first
 * (Master Instruction section 21). Development Phase #30.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SyncEngineProvider />
      <main className="flex-1 pb-20 max-w-2xl w-full mx-auto px-4">
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
    </div>
  );
}
