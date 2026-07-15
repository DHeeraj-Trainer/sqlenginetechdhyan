import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/features/dashboard/Dashboard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SQL Academy" },
      {
        name: "description",
        content:
          "Track your SQL learning progress: solved challenges, XP, streak, accuracy, and domain-by-domain mastery across interview-grade practice.",
      },
      { property: "og:title", content: "SQL Academy Dashboard" },
      {
        property: "og:description",
        content: "Your personal SQL learning dashboard with progress, streaks, and interview prep.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: Dashboard,
});
