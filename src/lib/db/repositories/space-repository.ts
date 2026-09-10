import type { Space, SpaceInput, SpaceUpdate } from "@/types/space";

/**
 * SpaceRepository — mirrors TaskRepository's structure (Development
 * Phase #24).
 */
export interface SpaceRepository {
  getAll(): Promise<Space[]>;
  getById(id: string): Promise<Space | null>;
  create(input: SpaceInput): Promise<Space>;
  update(id: string, patch: SpaceUpdate): Promise<Space>;
  /** Soft delete: sets deletedAt (tombstone). */
  delete(id: string): Promise<void>;
  subscribe(callback: () => void): () => void;
}
