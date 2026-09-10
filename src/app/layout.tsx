import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/layout";
import "./globals.css";

// Intentionally NOT using next/font/google here. This app is
// offline-first and privacy-conscious by design (Master Instruction
// section 2: "Offline reliability", "Privacy", "Tidak ada ... third
// party service yang tidak diperlukan") — a build-time fetch to
// fonts.googleapis.com is a fragile, unnecessary external
// dependency. System font stack for now; if a custom typeface is
// chosen during Development Phase #30 (Dashboard/UI), self-host it
// via next/font/local rather than next/font/google.

export const metadata: Metadata = {
  title: "PRIORRA Next",
  description:
    "Personal task/prioritization PWA. Offline-first (IndexedDB) with Firestore cloud sync.",
  // No `manifest:` field here — Next.js's app/manifest.ts file
  // convention is auto-linked (confirmed by inspecting the actual
  // build output's <link rel="manifest">), so setting it explicitly
  // would be redundant.
};

// themeColor lives in `viewport`, not `metadata` — themeColor inside
// `metadata` was deprecated in Next.js 14 (confirmed against local
// docs). Matches --color-accent in globals.css.
export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
