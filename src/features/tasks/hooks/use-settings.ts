"use client";

import { useEffect, useState, useCallback } from "react";
import { DEFAULT_APP_SETTINGS, type AppSettings, type AppSettingsUpdate } from "@/types/settings";
import { settingsRepository as repo } from "@/lib/db/repositories/singletons";

/**
 * Hook for reading/updating the singleton AppSettings row.
 * Development Phase #27/#30.
 */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    repo.get().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const updateSettings = useCallback(async (patch: AppSettingsUpdate) => {
    const updated = await repo.update(patch);
    setSettings(updated);
    return updated;
  }, []);

  return { settings, loading, updateSettings };
}
