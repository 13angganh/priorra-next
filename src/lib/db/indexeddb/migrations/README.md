# migrations/

One file per IndexedDB schema version bump (v1→v2, v2→v3, ...), per
Architecture Proposal section 2.

**Status as of this writing: empty, correctly.** The schema is still
at v1 (see `../schema.ts`'s `DB_SCHEMA_VERSION`), and this project
has never had a real release — everything so far has gone directly
into the v1 `upgrade()` callback in `../client.ts` rather than a
versioned migration, because there's no installed base with
old-shape data that a migration would need to reshape. That's a
legitimate, deliberate reason for this folder to be empty; it isn't
an unfinished task.

**The first time this folder needs a real file** is the first time a
schema change ships AFTER a real release — i.e. there's now a device
somewhere with v1 data that needs to become v2 data in place. At
that point:

1. Bump `DB_SCHEMA_VERSION` in `../schema.ts`.
2. Add a file here, e.g. `v1-to-v2.ts`, exporting a function that
   takes the open `IDBPDatabase`/upgrade transaction and performs the
   actual reshape (new object store, new index, a field rename via
   cursor iteration, etc).
3. Call it from the `upgrade(db, oldVersion, newVersion)` callback in
   `../client.ts`, gated on `oldVersion < 2`, so a fresh v1 install
   never runs it and an existing v1 install does.
4. Add a corresponding test under `tests/integration/indexeddb-repository/`
   that seeds v1-shaped data, runs the migration, and asserts the
   result is correctly v2-shaped — mirroring how every other
   IndexedDB behavior in this codebase is verified (see
   `indexeddb-task-repository.test.ts` for the pattern: real
   `fake-indexeddb`, not a mock of the migration logic itself).

See `example-v1-to-v2.ts.txt` in this folder for a worked-through
skeleton of what step 2 looks like — kept as `.txt` (not `.ts`) so it
is never accidentally picked up by the build or by `tsc`; rename it
to `.ts` and adapt it when a real migration is actually needed.
