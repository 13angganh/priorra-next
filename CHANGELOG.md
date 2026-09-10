# Changelog

All notable changes to this project are documented here. Format
follows [Keep a Changelog](https://keepachangelog.com/), per
Architecture Proposal section 10 / Master Instruction section 14.

For releases that touch the data or cache layer, the `Migration` and
`PWA` categories are always listed explicitly — including stating
"no change" — so this file never leaves the reader guessing whether
a migration happened.

## [Unreleased]

### Added

- Project scaffold: Next.js 16 + TypeScript, App Router, `src/`
  layout, Tailwind, ESLint. Folder structure matches Architecture
  Proposal section 2.
- Test runner: Vitest, scoped to `tests/unit` and
  `tests/integration`. `tests/e2e` and `tests/integration/firestore-rules`
  need a running browser/emulator respectively and are not part of
  `npm run test` — see "Known limitations" below.
- **Domain model and validation (Phase #23)**: full `Task`, `Space`,
  `AppSettings`, and sync-support types in `src/types/`, plus Zod
  schemas with 13 passing unit tests.
- **Repository interfaces (Phase #24)**: `TaskRepository`,
  `SpaceRepository`, `SettingsRepository` contracts in
  `src/lib/db/repositories/`.
- **IndexedDB implementation (Phase #25)**: full CRUD, soft-delete
  tombstones, atomic manual reorder, subscribe()-based live-query
  pub-sub. 14 passing integration tests against `fake-indexeddb`.
- **Firestore adapter (Phase #26)**: env-based Firebase config with
  an `isFirebaseConfigured()` guard (the app runs fully offline if
  unset, rather than crashing), anonymous auth, `FirestoreTaskRepository`
  partitioned under `users/{uid}/...`, and a real (not deny-all
  placeholder) `firestore.rules`. Rules tests are written (5
  scenarios) but not yet run — see "Known limitations".
- **CRUD hooks (Phase #27)**: `useTaskList`/`useTaskActions`,
  `useSpaceList`/`useSpaceActions`, `useSettings`, `useUndo` (5s
  undo window per Master Instruction section 6).
- **Priority/sorting (Phase #28)**: `smartSort()` — the 4-level
  tie-break order from Architecture Proposal section 6, 9 passing
  unit tests covering each rule individually and in combination.
- **Dashboard/UI (Phase #30)**: all four routes are fully functional
  — `/tasks` (space switcher, smart-sorted list, create/edit/complete/
  delete, undo toast), `/spaces` (create/edit/delete), `/completed`
  (most-recently-completed-first, one-tap uncomplete), `/settings`
  (theme, default sort, Firebase connection status). Premium/native
  feel per explicit UI/UX request: spring-physics modal (bottom
  sheet on mobile), animated stroke-draw checkmark, shared-layout
  tab-pill glide (`layoutId`), shimmer skeletons in place of "Loading...",
  scale-down tap feedback throughout, page-transition fade between
  routes.
- **PWA manifest and service worker (Phase #33-34)**: `app/manifest.ts`
  (the current App Router file convention — auto-linked into every
  page's `<head>`, confirmed by inspecting the actual built HTML
  output rather than assumed), four generated icons (192/512/512-maskable/32px,
  designed to match the app's single-accent identity), and a real
  service worker via Serwist (`@serwist/next`) with `skipWaiting`/
  `clientsClaim` — and, critically, `reloadOnOnline: false` set
  explicitly, because the library's own default is `true`, which
  would force a page reload the instant connectivity returns, even
  mid-keystroke in the task form. That is exactly the failure mode
  Architecture Proposal section 7's "Poin kritis" warns against.
  Verified by inspecting the actual generated `public/sw.js` (not
  just a successful build exit code): confirmed a real ~44KB
  precache manifest listing every build chunk and all four icons
  with content-hash revisions, confirmed `skipWaiting`/`clientsClaim`
  are actually present in the bundled output, and confirmed
  `<link rel="manifest" href="/manifest.webmanifest">` and the
  service worker's own `navigator.serviceWorker.register(...)` call
  are both present in the real built HTML/JS.
- **Sync engine (Phase #36)**: `SyncQueue` (its own IndexedDB store,
  with FIFO-per-entity and global-FIFO indexes), `SyncEngine`
  (`drainQueue()` — pushes queued writes to Firestore with
  exponential backoff, 1s/2s/4s/8s/16s across up to 5 attempts,
  processing different entities concurrently but each entity's own
  operations strictly in order per Architecture Proposal section 4.3;
  `pullChanges()` — reconciles remote Task/Space changes against
  local IndexedDB via last-write-wins per section 4.2), and
  `FirestoreSpaceRepository` (Task-side existed since Phase #26;
  Space-side added here). Every `IndexedDB{Task,Space}Repository`
  write method now also enqueues a sync operation — this was NOT
  optional per-call wiring; it's built into create/update/complete/
  uncomplete/delete/reorder directly, so no call site can forget it.
  `startSyncEngine()` mounts once via a new `SyncEngineProvider`
  client component in `AppShell`, and is a safe no-op end-to-end
  when Firebase isn't configured. A UI sync indicator ("Menyinkronkan...",
  "Tersimpan", "Offline") — deliberately NOT a separately-tracked
  boolean, but derived live from the queue's actual pending count +
  online status per section 5, so it structurally cannot drift out
  of sync with reality — now shows in `TopBar` (every dashboard page)
  and on `/settings`. 24 new tests (`sync-queue`, `conflict-resolution`,
  `sync-engine` — the last with Firestore mocked, since no emulator
  access exists in this environment; everything else in the chain —
  IndexedDB, the queue, FIFO ordering, retry bookkeeping,
  reconciliation logic — is exercised for real).

### Fixed

- **`tsconfig.sw.json` was silently broken since the moment it was
  created — `src/app/sw.ts` was never actually being typechecked.**
  It `extends: "./tsconfig.json"`, which excludes `src/app/sw.ts`
  (deliberately — so the main app typecheck doesn't choke on the
  service worker's `webworker`-only globals). `tsconfig.sw.json`
  inherited that exclusion without overriding it, while also trying
  to `include` that same file — so every run of
  `tsc --noEmit -p tsconfig.sw.json` failed immediately with
  `TS18003: No inputs were found`. `npm run build` never caught this
  because webpack successfully *bundles* `sw.ts` regardless of
  whether TypeScript validates it — bundling and typechecking are
  separate steps, and only the first one was actually running. Found
  by manually running the config directly (`npx tsc --noEmit -p
  tsconfig.sw.json`) — something no script in this project did
  automatically until this fix. Fixed by adding an explicit
  `"exclude": []` to `tsconfig.sw.json`, and a new `npm run
  typecheck` script (`next typegen && tsc --noEmit && tsc --noEmit -p
  tsconfig.sw.json`) so this three-step sequence — none of which is
  optional for a genuinely complete typecheck — is one command
  instead of tribal knowledge.

- **Real bug, found via Playwright browser testing, not just unit
  tests**: every hook file (`use-task-list`, `use-task-actions`,
  `use-space-list`, `use-space-actions`, `use-settings`) was
  constructing its own `new IndexedDB*Repository()`. Since each
  repository's `listeners` pub-sub set is an *instance* field, a
  write through the actions hook's instance never notified the list
  hook's *separate* instance — so the UI silently never re-rendered
  after create/update/complete/delete, even though the write reached
  IndexedDB correctly. Fixed by introducing
  `src/lib/db/repositories/singletons.ts`, one shared instance per
  store, imported by every hook. Existing integration tests didn't
  catch this because they each construct and use a single repository
  instance directly; two new regression tests in
  `tests/integration/indexeddb-repository/singleton-notify.test.ts`
  specifically assert the two-instance failure mode and the
  singleton fix.
- `BottomNav` was implemented but never mounted — `AppShell` (which
  renders it) was never wired into `app/layout.tsx`. Found the same
  way, via a screenshot of the running app. Fixed by wrapping
  `{children}` in `AppShell` in the root layout, and changing `/`
  from a static placeholder into `redirect("/tasks")` now that a
  real dashboard exists to redirect to.
- `.gitignore`'s `.env*` pattern was also hiding `.env.example` (a
  template file that must be committed, not a secret). Added
  `!.env.example`.
- `package.json`'s `lint` script was a bare `eslint` with no target;
  changed to `eslint .`.
- **`ReferenceError: indexedDB is not defined` — crashed `next
  build`'s static generation.** `use-space-list.ts`/`use-task-list.ts`
  originally used `useState`+`useEffect` for live-query, which
  `eslint-plugin-react-hooks@7`'s `set-state-in-effect`/`purity`
  rules correctly flagged (calling `setState` synchronously inside
  an effect body, and `Date.now()` called directly in a render body
  elsewhere, are both real anti-patterns per React's own docs). The
  fix — switching to `useSyncExternalStore`, the API React
  recommends for "subscribe to an external store, render its current
  value" — introduced a NEW bug: the backing cache
  (`src/lib/db/live-query-cache.ts`) called its first IndexedDB
  `read()` eagerly, at module/construction time. Next.js imports
  page and hook modules on the server too (during `next build`
  static generation and SSR), where `indexedDB` doesn't exist —
  so the build crashed the moment those hook modules were imported,
  even though `npm run test` stayed green (Vitest's IndexedDB tests
  all polyfill `indexedDB` via `fake-indexeddb/auto`, which masked
  this). Fixed by making `createLiveQueryCache` fully lazy — no
  IndexedDB access happens until the first real `subscribe()` call,
  which `useSyncExternalStore` only ever makes on the client. Caught
  by actually running `npm run build` after the refactor, not by
  trusting a green test suite alone. A new regression test,
  `tests/unit/sync/live-query-cache-ssr-safety.test.ts`, deliberately
  runs WITHOUT the `fake-indexeddb` polyfill (matching Next's
  server environment) and asserts the module can be imported and a
  cache constructed with zero `indexedDB` access — verified to
  correctly fail against the old eager-read code before confirming
  it passes against the fix.
- **`next dev` refused to start at all** after Serwist was wired in:
  Turbopack (the `next dev` default) detected the `webpack` config
  key `withSerwistInit` adds to `next.config.ts` and hard-errored
  rather than just warning, since it couldn't tell whether that was
  intentional. Found by actually running `next dev` after the
  Serwist changes, not assumed to still work. Fixed with an explicit
  `turbopack: {}` in `next.config.ts`, confirming to Next.js that the
  webpack config is deliberate (used only by `npm run build --webpack`)
  and dev-mode Turbopack should proceed normally.
- **Real bug, found via Playwright with a live (dummy-credentialed)
  Firebase config** — the default empty `.env.example` config hides
  this entirely, which is exactly why it wasn't caught earlier:
  `pullChanges()` had no try/catch around its Firestore calls. An
  auth failure (e.g. invalid/placeholder credentials) threw all the
  way up through `startSyncEngine()`'s un-awaited `.then()` chain
  with no `.catch()`, surfacing as a repeated unhandled promise
  rejection — visible in the browser console and as Next's red
  dev-error overlay overlapping the bottom nav. Fixed by wrapping
  `pullChanges()`'s body in try/catch (logs and returns rather than
  throwing) plus a second defensive `.catch()` at both call sites in
  `startSyncEngine()`. A new regression test intentionally rejects
  the mocked Firestore call and asserts `pullChanges()` still
  resolves — confirmed to fail against the pre-fix code (the
  try/catch was deliberately removed to watch the test catch it,
  then restored) before confirming it passes against the fix.

### Changed

- **`npm run build` now runs `next build --webpack` instead of the
  Turbopack default.** `@serwist/next` (the standard, actively-
  documented Serwist package) does not support Turbopack — confirmed
  by a real failed production build, not a guess or a docs footnote.
  An experimental alternative, `@serwist/turbopack`, was installed
  and its actual source read in full; it turned out to use a
  fundamentally different integration shape (a dynamic Route Handler
  serving the worker script, rather than a webpack-plugin-style
  config wrapper) that no concrete working example could be found
  for. Rather than ship that unverified, it was uninstalled and
  `--webpack` was used instead — one of Next.js's own suggested
  workarounds when this exact incompatibility is detected. `next dev`
  is unaffected and still uses Turbopack; Serwist is disabled outside
  production anyway (`disable: process.env.NODE_ENV !== "production"`
  in `next.config.ts`), so dev-mode compile speed doesn't change.
- `src/app/sw.ts` needed the `webworker` TypeScript lib (for global
  types like `ServiceWorkerGlobalScope`), which conflicts with the
  `dom` lib the rest of the app's `tsconfig.json` correctly uses —
  `self`, for instance, has an incompatible type between the two.
  Rather than compromise the main `tsconfig.json`, `sw.ts` is
  excluded from it and type-checked separately via a new
  `tsconfig.sw.json` that extends the main config and swaps in
  `["esnext", "webworker"]`.
- `eslint.config.mjs`: added `public/sw.js` (Serwist's generated,
  minified output — regenerated every build, not source code) to
  `globalIgnores`, alongside the existing `.next/**`.
- `/tasks` and `/completed`: the "auto-select the first Space until
  the user picks one" logic was rewritten from
  `useEffect`+`setState` into a value derived directly during
  render (no effect at all) — the `set-state-in-effect` fix
  described above.
- `/settings`: removed an unnecessary `useState`+`useEffect` around
  `isFirebaseConfigured()` — it reads build-time-inlined env vars,
  so it's safe to call directly during render with no hydration risk.
- `eslint.config.mjs`: added an `argsIgnorePattern`/`varsIgnorePattern`
  of `^_` to `@typescript-eslint/no-unused-vars` — the standard
  convention for an intentionally-discarded destructured field (e.g.
  omitting `syncState`/`localUpdatedAt` before sending a Task to
  Firestore).
- Removed `next/font/google` (Geist/Geist Mono) from the default
  scaffold in favor of a system font stack. The Google Fonts
  build-time fetch is an unnecessary external dependency that
  conflicts with the offline-first/privacy principles in Master
  Instruction section 2. A typeface can be self-hosted via
  `next/font/local` if chosen later.
- `next.config.ts`: `devIndicators.position` set to `bottom-right`
  (dev-only route badge; default `bottom-left` overlapped the app's
  own bottom-nav). Never appears in production builds.
- `layout.tsx`: `themeColor` moved from `metadata` into a separate
  `viewport` export — `metadata.themeColor` was deprecated in
  Next.js 14, confirmed against local docs before making the change
  rather than carrying over an old habit.

### Known limitations at this stage

- **Firestore rules tests are written but not run.** The Firestore
  emulator needs to download a JAR from `storage.googleapis.com` on
  first run, which this build environment's network allowlist
  doesn't permit. Run `firebase emulators:start` once (needs
  outbound network access) and then `npm run test:rules` to actually
  execute `tests/integration/firestore-rules/firestore-rules.test.ts`.
- **Sync engine (Phase #36) is implemented; Firestore rules tests
  and the sync engine's own Firestore calls are mocked/unverified
  against a real project** — no emulator or live Firestore access
  exists in this build environment (see the Firestore rules point
  above; the same constraint applies here). Every piece of logic
  that doesn't require an actual Firestore connection — the queue,
  FIFO ordering, retry/backoff bookkeeping, last-write-wins
  reconciliation — is tested for real. What's unverified is
  specifically the live network round-trip to a real Firestore
  project.
- **Migrations (Phase #35): deliberately empty, not unfinished.**
  Schema is still v1, and since this project has never had a real
  release (still `[Unreleased]`), there's no prior-version data that
  would need a migration path. `lib/db/indexeddb/migrations/README.md`
  documents exactly what to do the first time a schema change ships
  after a real release, and `example-v1-to-v2.ts.txt` is a worked
  skeleton of the pattern (kept as `.txt` so it's never picked up by
  the build).
- **`tests/e2e/` is reserved for a browser-based runner** (e.g.
  Playwright) per Architecture Proposal section 11.6 — not
  configured as a project dependency, since it was only used
  transiently for manual verification during development (including
  confirming multiple real bugs against a real running browser, with
  IndexedDB and console state read back directly) and removed
  afterward each time to keep the shipped project lean.
- No CI workflow file exists yet. As of this entry: `npm run lint`
  is 0 errors/0 warnings, `npm run test` is 66/66 passing across 10
  files, and `npm run build` completes cleanly from a fresh `.next`
  directory with no errors printed anywhere in its output (not just
  a successful exit code) — all verified in this same session,
  manually, immediately before this entry was written.

### Migration

- N/A — IndexedDB schema is still v1. Note: this entry's work added
  two indexes (`entityId`, `queuedAt`) to the `syncQueue` store,
  which IS a schema change — but since this project has never had a
  real release (still `[Unreleased]`, no installed base with old-
  shape data to migrate), it was made directly to the v1 `upgrade()`
  callback rather than versioned as a v1→v2 migration. Any schema
  change made AFTER the first real release will need an actual
  migration file, not this shortcut.

### PWA

- **First service worker shipped.** Installable (manifest +
  4 icons), precaches the app shell via Serwist with
  content-hash-based invalidation (only changed files are
  re-fetched on update, not the whole cache). Update flow:
  `skipWaiting: true` + `clientsClaim: true` (a new service worker
  activates immediately rather than waiting for all tabs to close),
  paired with `reloadOnOnline: false` so reconnecting never force-
  reloads the page out from under an in-progress edit. Disabled in
  `next dev` (`disable: process.env.NODE_ENV !== "production"`) —
  only present in production builds and thus only relevant starting
  from whichever release first ships this entry.
