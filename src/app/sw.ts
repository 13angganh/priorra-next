import { Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";
import { defaultCache } from "@serwist/next/worker";

/**
 * Service worker source (Development Phase #33-34).
 *
 * Controlled update flow, per Architecture Proposal section 7 /
 * Master Instruction section 8:
 *
 *   install  -> new assets cached under the new cache version
 *               (old cache untouched until activate)
 *   waiting  -> skipWaiting/clientsClaim below mean a new SW takes
 *               over on its own once installed, WITHOUT forcing a
 *               page reload — see reloadOnOnline: false in
 *               next.config.ts, which is the other half of this:
 *               Serwist's client-side reload-on-reconnect defaults
 *               to true, which would force-reload mid-typing in the
 *               task form the moment connectivity returns. That is
 *               exactly the failure mode Architecture Proposal
 *               section 7's "Poin kritis" warns against, so it is
 *               overridden explicitly, not left at its default.
 *   activate -> old, no-longer-referenced caches are cleaned up
 *               automatically by Serwist's precaching layer
 *
 * IndexedDB is never touched by any step in this file — caching
 * here only covers the app shell (HTML/JS/CSS/icons), never
 * application data.
 */
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
