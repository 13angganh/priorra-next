import { IndexedDBTaskRepository } from "./indexeddb-task-repository";
import { IndexedDBSpaceRepository } from "./indexeddb-space-repository";
import { IndexedDBSettingsRepository } from "./indexeddb-settings-repository";

/**
 * Module-level singleton repository instances, shared by every hook
 * that needs them.
 *
 * This module exists to fix a real bug found via browser testing:
 * IndexedDB{Task,Space}Repository each hold their pub-sub
 * `listeners` Set as an INSTANCE field. When each hook file did its
 * own `new IndexedDB...Repository()`, actions (create/update/
 * delete) and list hooks (live-query) ended up with two separate
 * repository instances — writes from useTaskActions/useSpaceActions
 * notified a listener set that useTaskList/useSpaceList never
 * subscribed to, so the UI silently never re-rendered on write.
 * Confirmed via Playwright: the write reached IndexedDB correctly,
 * but the on-screen list never updated.
 *
 * Every hook must import its repository from here, not construct
 * its own instance.
 */
export const taskRepository = new IndexedDBTaskRepository();
export const spaceRepository = new IndexedDBSpaceRepository();
export const settingsRepository = new IndexedDBSettingsRepository();
