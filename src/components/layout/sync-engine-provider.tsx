"use client";

import { useEffect } from "react";
import { startSyncEngine } from "@/lib/sync/sync-engine";

/**
 * Mounts once at the app root to start SyncEngine (Development
 * Phase #36). Renders nothing — this is a side-effect-only
 * component, kept separate from AppShell so AppShell itself can
 * stay a Server Component.
 *
 * startSyncEngine() itself is a safe no-op when Firebase isn't
 * configured (see isFirebaseConfigured() checks inside
 * lib/sync/sync-engine.ts), so this is always safe to mount
 * regardless of whether the person deploying this has set up
 * Firebase yet.
 */
export function SyncEngineProvider() {
  useEffect(() => {
    const stop = startSyncEngine();
    return stop;
  }, []);

  return null;
}
