/**
 * Online/offline detection for SyncEngine (non-React — see
 * src/hooks/use-online-status.ts for the UI-facing React hook,
 * which is a separate, thin wrapper for component consumption).
 * Development Phase #36.
 *
 * Drives the offline->online reconnect flow (Architecture Proposal
 * section 4.3): "network-status.ts mendeteksi transisi
 * offline->online" -> SyncEngine runs a full drain.
 */

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true; // SSR/build-time: assume online, no-op anyway
  return navigator.onLine;
}

/**
 * Subscribes to the specific offline->online TRANSITION (not just
 * "online" events, which browsers can fire in other circumstances
 * too) — calls `onReconnect` only when the browser was offline and
 * has just come back online. Returns an unsubscribe function.
 */
export function onReconnect(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  let wasOffline = !isOnline();

  const handleOnline = () => {
    if (wasOffline) {
      wasOffline = false;
      callback();
    }
  };
  const handleOffline = () => {
    wasOffline = true;
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
