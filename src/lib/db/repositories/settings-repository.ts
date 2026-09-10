import type { AppSettings, AppSettingsUpdate } from "@/types/settings";

/**
 * SettingsRepository — persists AppSettings (device-local only).
 * AppSettings is never synced to Firestore — see Architecture
 * Proposal section 3, AppSettings type note (Development Phase #24).
 */
export interface SettingsRepository {
  get(): Promise<AppSettings>;
  update(patch: AppSettingsUpdate): Promise<AppSettings>;
}
