"use client"; // Error boundaries must be Client Components

/**
 * Last-resort error boundary for failures in the root layout itself
 * (Next.js `global-error.tsx` file convention). error.tsx cannot
 * catch those — it only wraps what's BELOW it in the tree.
 *
 * Per this Next.js version's own docs: global-error renders its own
 * document and does NOT include the app's global styles, so
 * everything here is inline-styled rather than using Tailwind
 * classes or CSS variables (which simply wouldn't resolve). It also
 * can't export metadata, hence the React <title> element.
 *
 * See error.tsx's docstring for why error boundaries were added at
 * all — short version: there were none, so any crash showed a blank
 * screen with nothing actionable.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          background: "#ffffff",
          color: "#171717",
        }}
      >
        <title>Something went wrong — PRIORRA Next</title>
        <div style={{ textAlign: "center", padding: "0 24px", maxWidth: 360 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 8px" }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "#71717a", margin: "0 0 20px" }}>
            Your tasks are stored on this device and were not affected. Reloading
            usually clears this.
          </p>
          <button
            onClick={retry}
            style={{
              fontSize: 14,
              fontWeight: 500,
              padding: "10px 20px",
              borderRadius: 999,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <pre
            style={{
              marginTop: 20,
              padding: 12,
              borderRadius: 12,
              background: "#f4f4f5",
              color: "#52525b",
              fontSize: 11,
              textAlign: "left",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {error.message}
            {error.digest ? `\n\ndigest: ${error.digest}` : ""}
          </pre>
        </div>
      </body>
    </html>
  );
}
