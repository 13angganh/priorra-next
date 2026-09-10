import type { SyncState } from "./sync";

/**
 * Space domain type (Development Phase #23).
 */
export interface Space {
  id: string;
  name: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;

  // --- Hybrid sync fields (Architecture Proposal section 3) ---
  syncState: SyncState;
  localUpdatedAt: string;
  serverUpdatedAt?: string;
  syncVersion?: number;
  deletedAt?: string;
}

export interface SpaceInput {
  name: string;
  icon?: string;
}

export type SpaceUpdate = Partial<Pick<Space, "name" | "icon" | "archived">>;
