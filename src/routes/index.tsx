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
  errorComponent: IndexError,
  notFoundComponent: IndexNotFound,
});

function IndexError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error("[route:/] error", error);
    reportLovableError(error, { boundary: "route_index", route: "/" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">The workbench didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong while loading the SQL Workbench. Try again, or head home.
        </p>
        <pre className="mt-3 max-h-32 overflow-auto rounded bg-muted p-2 text-left text-xs text-muted-foreground">
          {error?.message ?? "Unknown error"}
        </pre>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Reload
          </a>
        </div>
      </div>
    </div>
  );
}

function IndexNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-foreground">Nothing here</h1>
        <p className="mt-2 text-sm text-muted-foreground">This workbench view isn't available.</p>
      </div>
    </div>
  );
}

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
