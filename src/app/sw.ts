import { Serwist, NetworkOnly, type PrecacheEntry, type RuntimeCaching, type SerwistGlobalConfig } from "serwist";
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
 *
 * REAL BUG FIXED (v1.0.2): reported by a real deployed user via
 * their browser console — Firestore's realtime Listen channel
 * (`firestore.googleapis.com/.../Listen/channel?...`) failed with
 * "A ServiceWorker intercepted the request and encountered an
 * unexpected error." `@serwist/next/worker`'s `defaultCache` (used
 * below) includes a catch-all `!sameOrigin -> NetworkFirst` rule
 * intended for ordinary cross-origin HTTP requests (a font, an
 * image from another host). Firestore's Listen channel is not an
 * ordinary request — it is a long-lived streaming connection that
 * never "completes" the way NetworkFirst's cache-the-response model
 * expects, so Workbox's strategy handling broke on it. Fixed by
 * prepending an explicit NetworkOnly rule for `*.googleapis.com`
 * and `*.firebaseio.com` (covers Firestore, and Firebase Auth's
 * `identitytoolkit.googleapis.com`, and Realtime Database if ever
 * used) — matched BEFORE defaultCache's rules run, since Workbox
 * evaluates runtimeCaching rules in array order and stops at the
 * first match. NetworkOnly passes the request straight through with
 * no caching involvement at all, which is what a streaming
 * connection needs.
 */
const firebaseNetworkOnly: RuntimeCaching = {
  matcher: ({ url }) => /\.(?:googleapis|firebaseio)\.com$/i.test(url.hostname),
  handler: new NetworkOnly(),
};
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
  runtimeCaching: [firebaseNetworkOnly, ...defaultCache],
});

serwist.addEventListeners();
