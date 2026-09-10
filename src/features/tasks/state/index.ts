/**
 * Task-level UI state — NOT persistence state.
 *
 * Persistence state lives in IndexedDB and is read via live query
 * (see hooks/). What belongs here is ephemeral UI-only state: form
 * drafts not yet saved, modal open/closed, an Undo toast currently
 * showing (Architecture Proposal section 5). None of this is ever
 * written to IndexedDB.
 *
 * Scaffold placeholder — implemented in Development Phase #29
 * (Complete/uncomplete/Undo) and #30 (Dashboard/UI).
 */

export {};
