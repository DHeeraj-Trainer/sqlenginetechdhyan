import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

// Load the legacy Google-AI-Studio app on the client only. It uses
// localStorage at initialization and alasql (browser-only build), so
// SSR would crash or pull optional native deps.
const App = lazy(() => import("@/legacy/App"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SQL Online Training Portal — Interactive SQL Bootcamp" },
      {
        name: "description",
        content:
          "Interactive SQL bootcamp with a browser-based sandbox, 10 real-world domains, guided challenges, quizzes, and an AI SQL tutor.",
      },
      { property: "og:title", content: "SQL Online Training Portal" },
      {
        property: "og:description",
        content:
          "Learn SQL hands-on with an in-browser AlaSQL sandbox, domain-based challenges, and an AI tutor.",
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
      Loading SQL Portal…
    </div>
  );
  if (!mounted) return fallback;
  return (
    <Suspense fallback={fallback}>
      <App />
    </Suspense>
  );
}
