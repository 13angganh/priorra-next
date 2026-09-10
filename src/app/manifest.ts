import type { MetadataRoute } from "next";

/**
 * Web App Manifest, generated via the App Router's `manifest.ts`
 * file convention (Development Phase #33). Confirmed against
 * Next.js's own local docs — the modern equivalent of a static
 * public/manifest.json, resolved automatically at /manifest.webmanifest.
 *
 * Colors match the app's single-accent design (Master Instruction
 * section 21) — see src/app/globals.css's --color-accent.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PRIORRA Next",
    short_name: "PRIORRA",
    description:
      "Personal task/prioritization PWA. Offline-first with optional cloud sync.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
