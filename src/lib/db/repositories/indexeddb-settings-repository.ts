import { getDB } from "@/lib/db/indexeddb/client";
import { STORE_NAMES } from "@/lib/db/indexeddb/schema";
import { DEFAULT_APP_SETTINGS, type AppSettings, type AppSettingsUpdate } from "@/types/settings";
import type { SettingsRepository } from "./settings-repository";

/**
 * IndexedDBSettingsRepository — always exactly one row ('singleton').
 * Never touches Firestore; AppSettings is device-local only
 * (Development Phase #25).
 */
export class IndexedDBSettingsRepository implements SettingsRepository {
  async get(): Promise<AppSettings> {
    const db = await getDB();
    const existing = await db.get(STORE_NAMES.settings, "singleton");
    if (existing) return existing;
    await db.put(STORE_NAMES.settings, DEFAULT_APP_SETTINGS);
    return DEFAULT_APP_SETTINGS;
  }

  async update(patch: AppSettingsUpdate): Promise<AppSettings> {
    const db = await getDB();
    const current = await this.get();
    const updated: AppSettings = { ...current, ...patch };
    await db.put(STORE_NAMES.settings, updated);
    return updated;
  }
}
