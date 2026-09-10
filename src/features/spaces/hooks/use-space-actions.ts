"use client";

import { useCallback } from "react";
import type { SpaceInput, SpaceUpdate } from "@/types/space";
import { spaceRepository as repo } from "@/lib/db/repositories/singletons";

/**
 * Space CRUD actions (Development Phase #27).
 */
export function useSpaceActions() {
  const createSpace = useCallback((input: SpaceInput) => repo.create(input), []);
  const updateSpace = useCallback((id: string, patch: SpaceUpdate) => repo.update(id, patch), []);
  const deleteSpace = useCallback((id: string) => repo.delete(id), []);

  return { createSpace, updateSpace, deleteSpace };
}
