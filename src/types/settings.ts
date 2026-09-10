/**
 * AppSettings domain type (Development Phase #23).
 *
 * AppSettings is intentionally NOT synced to Firestore — it is
 * device-local preference, not shared domain data (Architecture
 * Proposal section 3).
 */
export interface AppSettings {
  /** Always exactly one row, with this fixed id. */
  id: "singleton";
  theme: "light" | "dark" | "system";
  defaultSpaceId?: string;
  defaultSort: "smart" | "manual";
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: "singleton",
  theme: "system",
  defaultSort: "smart",
};

export type AppSettingsUpdate = Partial<
  Pick<AppSettings, "theme" | "defaultSpaceId" | "defaultSort">
>;
