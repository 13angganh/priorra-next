"use client";

import { motion } from "framer-motion";
import { TopBar } from "@/components/layout";
import { useSettings } from "@/features/tasks/hooks/use-settings";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { DB_SCHEMA_VERSION } from "@/lib/db/indexeddb/schema";
import { useSyncStatus } from "@/hooks/use-sync-status";

/**
 * /settings — theme, default sort mode, and read-only app info.
 * Development Phase #30.
 */
const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

const SORT_MODES = [
  { value: "smart", label: "Smart" },
  { value: "manual", label: "Manual" },
] as const;

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="relative flex bg-zinc-100 dark:bg-zinc-800/70 rounded-full p-1">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="relative flex-1 py-1.5 text-[13px] font-medium text-center rounded-full"
          >
            {active && (
              <motion.span
                layoutId={`segment-${options.map((o) => o.value).join("-")}`}
                className="absolute inset-0 bg-white dark:bg-zinc-700 rounded-full shadow-sm"
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
              />
            )}
            <span
              className={`relative ${
                active
                  ? "text-zinc-900 dark:text-white"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SettingsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3.5 border-b border-zinc-100 dark:border-zinc-800/80">
      <p className="text-[13px] font-medium text-zinc-500 mb-2">{label}</p>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { settings, loading, updateSettings } = useSettings();
  // isFirebaseConfigured() reads NEXT_PUBLIC_* env vars, which
  // Next.js inlines at build time — safe to call directly during
  // render (server or client) with no hydration mismatch, so no
  // state/effect is needed just to defer it past mount.
  const firebaseOk = isFirebaseConfigured();
  const syncStatus = useSyncStatus();

  if (loading) return <TopBar title="Settings" />;

  return (
    <>
      <TopBar title="Settings" />

      <div className="py-2">
        <SettingsRow label="Theme">
          <SegmentedControl
            options={THEMES}
            value={settings.theme}
            onChange={(theme) => updateSettings({ theme })}
          />
        </SettingsRow>

        <SettingsRow label="Default sort">
          <SegmentedControl
            options={SORT_MODES}
            value={settings.defaultSort}
            onChange={(defaultSort) => updateSettings({ defaultSort })}
          />
        </SettingsRow>

        <SettingsRow label="Cloud sync">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                syncStatus === "syncing"
                  ? "bg-amber-500 animate-pulse"
                  : syncStatus === "synced"
                    ? "bg-emerald-500"
                    : "bg-zinc-300 dark:bg-zinc-600"
              }`}
            />
            <p className="text-[13px] text-zinc-600 dark:text-zinc-400">
              {!firebaseOk
                ? "Not configured — running offline-only (see .env.example)"
                : syncStatus === "offline"
                  ? "Offline — changes will sync when you're back online"
                  : syncStatus === "syncing"
                    ? "Menyinkronkan..."
                    : "Tersimpan — tasks sync across devices"}
            </p>
          </div>
        </SettingsRow>

        <SettingsRow label="About">
          <p className="text-[13px] text-zinc-400">
            PRIORRA Next · IndexedDB schema v{DB_SCHEMA_VERSION}
          </p>
        </SettingsRow>
      </div>
    </>
  );
}
