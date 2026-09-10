/**
 * Note on cache naming (Development Phase #33, revisited):
 *
 * The original plan here was a hand-rolled single-source-of-truth
 * for cache names + version, shared between the service worker and
 * any UI (e.g. Settings) that wants to display it.
 *
 * That turned out to be unnecessary: Serwist (the library actually
 * used for the service worker — see src/app/sw.ts) manages its own
 * cache names and versioning internally (prefixed `serwist-`,
 * confirmed by inspecting the real generated public/sw.js). There
 * is no separate "cache version" for this app to track or expose —
 * Serwist's precache manifest is content-hash-based per file, not a
 * single incrementing version number, so it invalidates only the
 * specific assets that actually changed between builds.
 *
 * /settings' "IndexedDB schema v{DB_SCHEMA_VERSION}" line remains
 * the correct and only version number worth surfacing to the user;
 * this file is kept only as a documented dead end so a future
 * contributor doesn't re-attempt the same unnecessary abstraction.
 */

export {};
