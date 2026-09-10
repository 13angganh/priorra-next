import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  // Route indicator (dev-only, never shown in production builds) —
  // moved to bottom-right so it doesn't overlap the app's own
  // bottom-nav "Tasks" tab, which sits bottom-left. Compile/runtime
  // errors still surface either way; only the route badge moves.
  devIndicators: {
    position: "bottom-right",
  },
  // Empty but present: withSerwistInit (below) adds a `webpack` key
  // to this config. Turbopack (next dev's default) detects that and
  // refuses to start at all — a real error found by actually running
  // `next dev` after wiring Serwist, not a guess — unless it also
  // sees an explicit `turbopack` key confirming this is intentional.
  // The webpack config only matters for `npm run build --webpack`
  // (see package.json and the comment below); `next dev` never uses
  // it, since Serwist is disabled outside production anyway.
  turbopack: {},
};

// IMPORTANT: @serwist/next (the standard, non-experimental package)
// does not support Turbopack as of this writing — confirmed by a
// real failed `next build` during Development Phase #33/#34, not a
// guess. The alternative experimental package, @serwist/turbopack,
// uses a fundamentally different integration shape (a dynamic Route
// Handler rather than a config wrapper) that I could not find a
// concrete, verified working example for, so rather than ship an
// unverified integration, `npm run build` explicitly passes
// `--webpack` (see package.json) — one of Next.js's own suggested
// workarounds when it detects this exact situation. `next dev`
// keeps using Turbopack as normal; Serwist is disabled outside
// production anyway (see `disable` below), so dev-mode compilation
// speed is unaffected.
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  // IMPORTANT: @serwist/next's own default for this is `true`. Left
  // at that default, going from offline back online would call
  // location.reload() unconditionally — including in the middle of
  // someone typing in the task form, discarding whatever they were
  // mid-edit. This is exactly the failure mode Architecture Proposal
  // section 7's "Poin kritis" warns against, so it is set to
  // `false` explicitly here, not left implicit.
  reloadOnOnline: false,
});

export default withSerwist(nextConfig);
