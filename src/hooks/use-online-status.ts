"use client";

import { useSyncExternalStore } from "react";

/**
 * React hook wrapping browser online/offline detection for UI
 * consumption (e.g. sync indicator, per Architecture Proposal
 * section 5). Development Phase #30.
 *
 * navigator.onLine is itself a synchronous external source, so this
 * is a direct, textbook useSyncExternalStore case — no cache/async
 * bridge needed, unlike the IndexedDB-backed live-query hooks.
 */
function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true; // no network signal during SSR; assume online
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
