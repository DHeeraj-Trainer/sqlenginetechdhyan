import { createFileRoute, useRouter } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

// Workbench uses Monaco + WASM engines; keep on client to avoid SSR of
// browser-only libraries and to preserve fast first paint.
const Workbench = lazy(() =>
  import("@/features/workbench/Workbench").then((m) => ({ default: m.Workbench })),
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SQL Workbench — Interactive SQL IDE with AI Tutor" },
      {
        name: "description",
        content:
          "A browser-based SQL IDE with Monaco editor, SQLite (sql.js) and Postgres (PGlite), a schema explorer, data grid, and a streaming AI SQL tutor.",
      },
      { property: "og:title", content: "SQL Workbench — Interactive SQL IDE" },
      {
        property: "og:description",
        content:
          "Write, run and learn SQL in the browser with real WASM engines, a full schema explorer, and an AI tutor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: Index,
});

function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const fallback = (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      Loading SQL Workbench…
    </div>
  );
  if (!mounted) return fallback;
  return (
    <Suspense fallback={fallback}>
      <Workbench />
    </Suspense>
  );
}
