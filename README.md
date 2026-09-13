# PRIORRA Next

Personal task/prioritization PWA. Offline-first (IndexedDB as the
source of truth) with optional Firestore cloud sync — Architecture C
("Hybrid") from the approved Architecture Proposal.

## Status

`1.0.0`. Core app — domain model, IndexedDB persistence, sync
engine, dashboard UI, PWA install/offline support — is implemented
and verified (lint/typecheck/tests all green, production build
clean). This release also fixed a real intermittent render crash and
several real UI bugs found via direct testing (icon picker,
undo-toast/modal overlap, unbalanced empty-state layouts) — see
`CHANGELOG.md`'s `[1.0.0]` entry for the full detail on each. See
`CHANGELOG.md` generally for the complete, detailed history of
what's been built, fixed, and what's deliberately not yet
implemented (migrations — none needed yet, since this is the
baseline release; live Firestore-rules testing against a real
project).

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The app works immediately with no
setup — it runs fully offline-only (IndexedDB, no cloud sync) until
Firebase is configured (see below).

## Available scripts

| Script                | What it does                                                        |
| ---------------------- | --------------------------------------------------------------------- |
| `npm run dev`          | Start the dev server (Turbopack).                                    |
| `npm run build`        | Production build. Uses `--webpack`, not Turbopack — see note below.  |
| `npm run start`        | Serve the production build (`npm run build` first).                  |
| `npm run lint`         | ESLint.                                                               |
| `npm run typecheck`    | Full typecheck — see note below, don't run a bare `tsc --noEmit`.    |
| `npm run test`         | Unit + integration tests (Vitest).                                   |
| `npm run test:rules`   | Firestore Security Rules tests — needs a running emulator, see below.|

**Why `npm run build` uses `--webpack`:** the service worker
(Serwist) doesn't yet support Turbopack for the production build
step. `npm run dev` is unaffected and still uses Turbopack normally.
Full detail in `CHANGELOG.md`.

**Typecheck:** use `npm run typecheck`, not a bare `tsc --noEmit`.
It runs three things in sequence: `next typegen` (some of Next's own
types, like `LayoutProps`, are generated — they don't exist until a
build/dev/typegen pass has run at least once), the main app
typecheck, and a separate typecheck of `src/app/sw.ts` against
`tsconfig.sw.json` (the service worker needs the `webworker` lib,
which conflicts with the `dom` lib the rest of the app correctly
uses, so it's checked on its own).

## Setting up Firebase (optional — for cross-device sync)

The app runs completely fine without this. Skip it if you only want
local, single-device task tracking.

1. Create a Firebase project at <https://console.firebase.google.com>.
2. Enable **Firestore Database** and **Authentication → Anonymous**
   sign-in.
3. In Project Settings → General → "Your apps", add a Web app and
   copy the config values.
4. Copy `.env.example` to `.env.local` and fill in the
   `NEXT_PUBLIC_FIREBASE_*` values from step 3. These are safe to be
   public — Firebase's client config isn't a secret; access control
   is enforced by `firestore.rules`, not by hiding this config.
5. Deploy the security rules and indexes that are already written in
   this repo:
   ```bash
   npx firebase deploy --only firestore:rules,firestore:indexes
   ```
   (`firestore.rules` partitions all data under `users/{uid}/...` and
   denies everything else by default — see the file itself for the
   full rule.)
6. Restart `npm run dev` (or redeploy). `/settings` in the app shows
   live connection/sync status once this is done.

To actually run the Firestore Security Rules test suite
(`npm run test:rules`), you need the Firebase emulator, which
downloads a JAR on first run:
```bash
npx firebase emulators:start
# in a second terminal:
npm run test:rules
```

## Deploying to Vercel

This is a standard Next.js App Router project — connect the repo in
the Vercel dashboard and it deploys with no special configuration.
Add the `NEXT_PUBLIC_FIREBASE_*` environment variables in the Vercel
project settings if you want cloud sync in production (same values
as `.env.local` above).

## Project structure

See the Architecture Proposal (section 2, "Folder Structure") for
the full rationale — in short:

- `src/app/` — routes (App Router), plus `manifest.ts` (PWA) and
  `sw.ts` (service worker source).
- `src/components/` — UI, grouped by domain (`task/`, `space/`,
  `priority/`) plus `ui/` (domain-free primitives) and `layout/`.
- `src/features/` — hooks and UI-only state per feature area.
- `src/lib/db/` — IndexedDB (source of truth) and Firestore
  (sync-only) repository implementations, behind a shared interface.
- `src/lib/sync/` — the sync engine: queue, conflict resolution,
  network detection.
- `src/lib/sorting/` — `smartSort()`, a pure function.
- `src/types/` — domain types (`Task`, `Space`, `AppSettings`, sync
  types).
- `tests/` — `unit/` and `integration/` run via `npm run test`;
  `integration/firestore-rules/` needs the emulator (see above);
  `e2e/` is reserved for a future browser-based runner, not yet
  configured.

## License

Personal project — no license file included. Add one if you intend
to make this public or share it beyond personal use.
