import { createFileRoute } from "@tanstack/react-router";

/**
 * Lightweight health endpoint for external monitoring.
 *
 * Checks:
 *  - SSR runtime is executing (we reached this handler)
 *  - The generated route tree is importable and has the expected shape
 *  - The router factory can be constructed without throwing
 *
 * Returns 200 with `{ status: "ok" }` when healthy, 503 with details otherwise.
 * Never returns 500 — a health probe that itself 500s is useless for monitoring.
 */
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const started = Date.now();
        const checks: Record<string, { ok: boolean; error?: string }> = {};

        try {
          const mod = await import("../../../routeTree.gen");
          checks.routeTree = {
            ok: !!mod.routeTree && typeof mod.routeTree === "object",
          };
        } catch (err) {
          checks.routeTree = { ok: false, error: (err as Error).message };
        }

        try {
          const { getRouter } = await import("../../../router");
          const router = getRouter();
          checks.router = { ok: !!router && typeof router.buildLocation === "function" };
        } catch (err) {
          checks.router = { ok: false, error: (err as Error).message };
        }

        const healthy = Object.values(checks).every((c) => c.ok);
        const body = {
          status: healthy ? "ok" : "degraded",
          checks,
          duration_ms: Date.now() - started,
          timestamp: new Date().toISOString(),
        };

        return new Response(JSON.stringify(body), {
          status: healthy ? 200 : 503,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
