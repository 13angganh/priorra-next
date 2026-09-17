# Changelog

All notable changes to this project are documented here. Format
follows [Keep a Changelog](https://keepachangelog.com/), per
Architecture Proposal section 10 / Master Instruction section 14.

For releases that touch the data or cache layer, the `Migration` and
`PWA` categories are always listed explicitly — including stating
"no change" — so this file never leaves the reader guessing whether
a migration happened.

## [Unreleased]

## [1.0.2] - 2026-09-16

Bug-fix release for a real error reported from a live deployment's
browser console after 1.0.1 fixed anonymous auth: Firestore's
realtime connection failing with "A ServiceWorker intercepted the
request and encountered an unexpected error."

### Fixed

- **The service worker was intercepting Firestore's realtime `Listen`
  channel and breaking it**, reported verbatim from a real deployed
  user's DevTools console:
  `Failed to load 'https://firestore.googleapis.com/.../Listen/channel?...'.
  A ServiceWorker intercepted the request and encountered an
  unexpected error.` Root cause, found by reading
  `@serwist/next/worker`'s actual `defaultCache` source (not
  guessed): its last specific rule is a catch-all for any
  cross-origin request —
  `matcher: ({ sameOrigin }) => !sameOrigin` — handled with
  `NetworkFirst`, a strategy built around "fetch once, cache the
  response". Firestore's Listen channel is not that: it's a
  long-lived streaming connection
  (`TYPE=xmlhttp`, kept open for realtime updates) that never
  "completes" the way NetworkFirst expects, so Workbox's strategy
  handling broke on it. Fixed by adding an explicit rule to
  `src/app/sw.ts`, matching any `*.googleapis.com` or
  `*.firebaseio.com` hostname (covers Firestore, Firebase Auth's
  `identitytoolkit.googleapis.com`, and Realtime Database if ever
  used) to `NetworkOnly` — no caching involvement at all — placed
  BEFORE `defaultCache`'s rules in the `runtimeCaching` array, since
  Workbox evaluates rules in order and stops at the first match.
  Verified three ways: (1) inspected the actual built, minified
  `public/sw.js` and confirmed the new rule (`eS`) is genuinely
  first in the final array (`runtimeCaching:[eS,...eq]`) — an
  earlier naive string-search check gave a misleading "it's after
  cross-origin" result, which turned out to be finding an unrelated
  string inside `defaultCache`'s own constant definition elsewhere
  in the bundle, not the actual rule order; (2) evaluated the
  matcher's regex directly inside the real, running service worker
  via CDP and confirmed it matches `firestore.googleapis.com`; (3)
  ran identical fetch probes against the old and new `sw.js` and
  got byte-identical results in both — which is an honest limitation,
  not a success: that specific probe (a plain REST `fetch()` to a
  Firestore endpoint) fails on CORS before the service worker's
  routing logic is even relevant, so it could not actually exercise
  the difference. There is no real Firebase project connected in
  this environment to test the genuine streaming `Listen` channel
  against, so this fix is verified correct by construction (matcher
  + rule order, confirmed against the real built and running
  service worker) but not verified to resolve the exact reported
  symptom end-to-end. If this specific error recurs after deploying
  this version, that would be a meaningful, actionable signal.

## [1.0.1] - 2026-09-14

Bug-fix release responding to reported issues: a sync indicator that
never stopped saying "Menyinkronkan...", and taps on the bottom nav
sometimes appearing to do nothing / the app appearing to crash.

### Fixed

- **"Menyinkronkan..." never stopped, even when nothing was actually
  syncing.** Root cause found by reading the code rather than
  guessing: `SyncEngine` gives up on a queue entry after
  `MAX_SYNC_RETRY_ATTEMPTS` (5) failed pushes — but the entry stays
  in the queue afterwards, and `useSyncStatus` derived its state
  from a single undifferentiated `pendingCount > 0`. So once a push
  failed permanently (Firestore rules not yet published, wrong
  project config in Vercel env vars, App Check blocking writes —
  anything that makes every attempt fail), the queue count never
  reached zero, and the UI claimed it was still syncing forever
  while SyncEngine had in fact stopped trying entirely. The
  indicator was, quite literally, lying about what the app was
  doing. Fixed by replacing `getPendingCount(): number` with
  `getSyncQueueSummary(): { activeCount, stuckCount }`, which
  distinguishes "still being retried" from "gave up", and adding a
  distinct `"error"` status the UI shows as a red dot reading
  "Gagal sinkron — lihat Settings" instead of an indefinite
  "Menyinkronkan...".
- **No way to recover from a permanently-stuck sync.** Even once the
  underlying cause was fixed (e.g. rules finally published), stuck
  entries stayed stuck: `drainEntityQueue` skips anything at max
  retries, and nothing ever reset that counter. Added
  `retryStuckEntries()` plus a real **"Retry sync"** button on
  `/settings`, shown only when the status is `error`, which resets
  those counters and re-runs the drain.
- **Taps on the bottom nav could silently do nothing right after
  closing a modal** — the most likely cause of the reported "klik
  menu bottom kadang crash/bug/error". The modal backdrop is
  `position: fixed inset-0 z-50`, so it captures every tap on
  screen while it exists. Its exit is animated and the panel's exit
  is a spring (no fixed duration), so it lingered in the DOM for a
  few hundred milliseconds after a close — and during that window it
  kept `pointer-events: auto`, swallowing taps aimed at the nav
  behind it. Measured directly, before the fix: `pointer-events`
  stayed `auto` at +0ms through +300ms after pressing Escape. After
  the fix: `none` from +0ms onward, while the fade-out still plays
  normally. `pointerEvents: "none"` is applied as part of Framer
  Motion's **exit target**, not a style prop — a
  `style={{ pointerEvents: open ? ... }}` version does not work,
  because the element lives inside `{open && ...}` and that
  expression never re-evaluates for an element that is already
  exiting.

### Added

- **Error boundaries — the app previously had none at all.**
  Confirmed by searching for `error.tsx` / `global-error.tsx` and
  finding neither, which meant any React render error produced a
  blank or generic screen with no message, no recovery path, and
  nothing reportable beyond "it crashed". Added both: `error.tsx`
  (route-level, recoverable) and `global-error.tsx` (root-layout
  failures, renders its own document with inline styles since global
  CSS does not apply there). Both show a calm explanation, reassure
  that tasks are stored locally and unaffected, offer a working
  "Try again", and expose the error message + digest behind a
  disclosure so there is something concrete to report. Verified by
  deliberately throwing from a temporary page: the boundary renders,
  and the bottom nav stays usable so it's still possible to navigate
  away rather than being stuck.
- 4 new regression tests for the sync-status bug (70 total, up from
  66), covering: an entry that exhausts retries moves from
  `activeCount` to `stuckCount`; an entry below the limit stays
  `active`; `retryStuckEntries()` resets given-up entries; and it
  leaves still-retrying entries untouched. Verified these actually
  detect the bug by temporarily restoring the old implementation —
  2 tests went red, then green again after reverting.

### Changed

- `MAX_SYNC_RETRY_ATTEMPTS` moved into `types/sync.ts` as a shared
  constant. It was previously a local `const` in `sync-engine.ts`,
  but `sync-queue.ts` now needs the same value to classify entries —
  and `sync-engine.ts` already imports from `sync-queue.ts`, so
  importing back the other way would have been circular.

### Known limitations

- **The reported bottom-nav crash could not be reproduced directly.**
  Eight-plus scenarios were tried against a real browser — rapid nav
  clicking, double-clicks, clicking with a modal open, 6x CPU
  throttling to emulate a slower phone, 20-round stress loops,
  navigation faster than the page-transition duration — with zero
  console errors and zero blank renders in every one. The backdrop
  fix above is the strongest candidate cause found and is verified
  fixed on its own terms, but it cannot be claimed as definitively
  *the* reported bug without a reproduction. The error boundaries
  added in this release exist precisely so that if it does recur on
  a real device, it produces a readable message and digest instead
  of a blank screen.
- An earlier diagnosis in this session — "the first click on the
  modal's X button does nothing" — was **wrong**, and is recorded
  here rather than quietly dropped: the measurement waited too
  little time after the click and caught the modal mid-exit-
  animation, when it is legitimately still in the DOM. A longer wait
  showed it closing correctly on the first click. Methodology error,
  not an app bug.

## [1.0.0] - 2026-09-12

### Added

- **v1.0.0 release.** Everything below this entry in the "Fixed" and
  "Changed" sections of this release was found through direct user
  feedback ("terasa sangat mentah asal jadi... tidak seperti apps
  pada umumnya... beberapa render kadang crash") followed by a
  systematic visual + functional audit — real screenshots of every
  page in both light and dark mode, real Playwright reproduction
  scripts, not just a lint/typecheck/test pass. Several of the fixes
  below found NEW bugs while fixing the reported ones; each is
  documented separately rather than folded together.
- `EmptyState` — a real empty-state primitive (icon + title +
  description + optional action) in `components/ui/`, replacing
  bare gray sentences floating in mostly-blank pages, plus three
  custom line-art SVG icons (`TasksEmptyIcon`, `SpacesEmptyIcon`,
  `CompletedEmptyIcon`) matching the app's single-accent identity
  rather than generic large unicode characters (✓, ▢, ☑).
- `IconPicker` — a real tappable grid of 24 curated emoji for Space
  icons, replacing a bare `<input type="text" placeholder="📋">`
  that had no real way to be filled in on most devices.
- `--content-height` CSS custom property in `globals.css`, computed
  from TopBar's and BottomNav's actual measured heights (53px/54px,
  confirmed via `getBoundingClientRect()` in a real browser, not
  guessed) using `100dvh` rather than `100vh` (accounts for mobile
  browser chrome show/hide, which `vh` does not). Used by every
  empty-state wrapper so content centers in the space that's
  actually available instead of an arbitrary `vh` percentage.
- `/settings`'s version line now reads `packageJson.version`
  directly rather than being hand-maintained separately from
  `package.json`.

### Fixed

- **Critical security vulnerability in Next.js itself, caught during
  final pre-ship verification.** `npm audit` against a freshly
  extracted, freshly `npm install`-ed copy of this exact release —
  not the working directory used throughout development, which had
  an older `npm audit` snapshot cached — surfaced a *critical*
  advisory affecting Next.js 16.0.0-16.3.2 (the version used
  throughout this project until this point): unauthenticated remote
  code execution on Windows-hosted servers, and a second
  unauthenticated RCE in the Image Optimization API when AVIF files
  are used (GHSA-p293-qw3h-jr36, GHSA-2xp9-vwfh-vxw4). Fixed by
  upgrading to `next@16.3.5`, which resolves both. Re-verified in
  full after the upgrade: lint 0/0, typecheck clean, 66/66 tests
  passing, production build clean. This is exactly why "verify
  against a freshly extracted zip" is a real, separate check from
  "the working directory's tests pass" — a security advisory
  published after the last `npm install` in a long-lived working
  directory is invisible until something forces a fresh install.
- **Real, intermittent render crash — reproduced and confirmed,
  not just theorized.** Rapid navigation between bottom-nav tabs
  could render a fully blank page (confirmed via screenshot: a
  page's `<main>` content area was empty except for the nav itself,
  with zero console errors — a silent React render failure, not a
  thrown exception). Root cause: `PageTransition`'s
  `AnimatePresence` wrapped `{children}` directly with no
  protection against the App Router updating its internal
  `LayoutRouterContext` mid-exit-animation, which can unmount a
  page's component tree before Framer Motion finishes animating it
  out — documented at https://github.com/vercel/next.js/issues/49279.
  Fixed with the community-standard "FrozenRouter" pattern (freeze
  the router context for an exiting page's subtree until its exit
  animation completes). The commonly-published version of this
  pattern reads a ref's `.current` directly during render, which
  `eslint-plugin-react-hooks@7`'s `react-hooks/refs` rule correctly
  rejects — rewritten twice to land on React's own documented
  "adjusting state during render" pattern (`useState` + a
  setState-during-render call guarded by an inequality check)
  instead of `useRef`. Verified with 20 rapid-navigation rounds
  post-fix (0 blank renders) after the original bug was caught via
  the same kind of test.
- **Icon picker was fundamentally unusable, not just unpolished.**
  `SpaceForm`'s icon field was a plain text input with an emoji
  placeholder and no actual way to type an emoji on most devices —
  addressed by building `IconPicker` (see Added above). Building it
  surfaced two more real bugs, found via Playwright, not guessed:
  (1) positioned with `position: absolute` relative to its trigger
  button, the popover either ran off the bottom of the viewport or,
  once flipped upward, spilled outside its parent Modal's bounds —
  Modal's full-viewport backdrop (`z-50`) then silently ate clicks
  for whatever part fell outside Modal's rendered box (confirmed via
  a real Playwright click timing out with an "intercepts pointer
  events" error, not assumed); (2) even after that, the popover's
  `z-10` also lost to Modal's backdrop `z-50` for clicks. Both fixed
  by rendering the popover through a `react-dom` portal directly
  into `document.body` with `position: fixed` computed from the
  trigger's real on-screen coordinates (`getBoundingClientRect()`),
  making it fully independent of Modal's size, scroll position, or
  z-index stacking — verified end-to-end: picking an icon, saving
  the form, and confirming the icon actually persists and displays
  in the Spaces list afterward, not just that the click succeeds.
- **Undo toast could visually overlap an open modal, covering
  interactive controls.** A visual audit screenshot caught the
  "Task completed / Undo" toast from completing one task rendering
  on top of the Edit Task modal's Due Date field and partially
  covering the Save button when that modal was opened within the
  5-second undo window — both elements used identical `z-50`, so
  which one visually won depended on DOM insertion order, not
  anything deliberate. Fixed two ways: every call site that opens a
  modal now calls `dismissUndo()` first (see `/tasks/page.tsx`), and
  `Toast`'s z-index dropped to `z-40` (below Modal's `z-50`) as
  defense in depth, so a modal correctly wins visually even if a
  toast is somehow still showing when one opens.
- **A dead "+" button on `/completed`.** `SpaceTabs`'s "add space"
  button was always rendered, but `/completed` had no real action
  for it (creating a Space doesn't belong on a completed-tasks
  review screen) and passed `onAddSpace={() => {}}` — a button
  visually identical to the working one elsewhere that silently did
  nothing when tapped. `onAddSpace` is now optional; omitting it
  hides the button entirely instead of rendering a dead control.
- **Large unbalanced blank areas on `/tasks`, `/spaces`, and
  `/completed`'s empty states, and on `/settings` generally** — a
  full-page screenshot audit (light AND dark mode) found every one
  of these left roughly 60-70% of the screen blank below a small
  gray sentence, which read as unfinished rather than designed.
  `/tasks`, `/spaces`, `/completed` fixed via `EmptyState` +
  `--content-height` centering (see Added above). `/settings` — not
  an empty state, just genuinely short content — fixed by pinning
  its "About" footer (app name, version, schema version) to the
  bottom of the available space via flex instead of leaving it
  stacked at the top with nothing below it; this is the layout
  pattern real settings screens use rather than padding the gap
  with unrelated decorative content.

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

- Version bumped `0.1.0` → `1.0.0`. This reflects that the reported
  quality issues above have been found, reproduced, and fixed with
  verification evidence (not just addressed cosmetically) — not a
  claim that every possible edge case has been audited; see "Known
  limitations" for what remains explicitly unverified (Firestore
  rules against a real project, the sync engine against a real
  Firestore connection).
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
  Schema is still v1, and this is the first real release — there's
  no prior-version data that would need a migration path yet.
  `lib/db/indexeddb/migrations/README.md`
  documents exactly what to do the first time a schema change ships
  after 1.0.0, and `example-v1-to-v2.ts.txt` is a worked
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

- N/A — IndexedDB schema is still v1. Note: this release's work
  added two indexes (`entityId`, `queuedAt`) to the `syncQueue`
  store, which IS a schema change — but since this was made before
  the 1.0.0 release cut (no installed base with old-shape data to
  migrate), it went directly into the v1 `upgrade()` callback rather
  than being versioned as a v1→v2 migration. Any schema change made
  in a version AFTER this one will need an actual migration file,
  not this shortcut — 1.0.0 is the baseline that migrations
  going forward are measured against.

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
