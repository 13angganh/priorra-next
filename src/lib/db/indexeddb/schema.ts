/**
 * IndexedDB object store + index definitions, versioned
 * (Development Phase #25).
 *
 * Object stores:
 *   tasks       - keyPath 'id', indexes on spaceId, status, deletedAt
 *   spaces      - keyPath 'id', index on deletedAt
 *   settings    - keyPath 'id' (single 'singleton' row)
 *   syncQueue   - keyPath 'id', indexes on entityId (FIFO-per-entity
 *                 drain) and queuedAt (global FIFO order). A
 *                 SEPARATE store from domain data (Architecture
 *                 Proposal section 4.1, step 3) so the queue
 *                 survives the app closing before sync completes
 */

export const DB_NAME = "priorra-next";

/**
 * schemaVersion is tracked independently from the app's release
 * version and the service worker cache version (Architecture
 * Proposal section 8) — bump this only when the IndexedDB structure
 * itself changes, and add a corresponding file under
 * lib/db/indexeddb/migrations/.
 */
export const DB_SCHEMA_VERSION = 1;

export const STORE_NAMES = {
  tasks: "tasks",
  spaces: "spaces",
  settings: "settings",
  syncQueue: "syncQueue",
} as const;

export type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES];
