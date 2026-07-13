import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import App from "@/legacy/App";

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
  component: Index,
});

function Index() {
  // App uses localStorage in a useState initializer, so render client-only.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading SQL Portal…
      </div>
    );
  }
  return <App />;
}
