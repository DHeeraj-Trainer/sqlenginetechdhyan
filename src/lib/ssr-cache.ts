// Server-only helper — filename enforces the boundary.
// Sets edge/CDN cache headers for public content routes.
import { createIsomorphicFn } from "@tanstack/react-start";

export const setPublicCacheHeaders = createIsomorphicFn()
  .client((_opts?: { sMaxAge?: number; swr?: number }) => {
    /* no-op on client-side navigation */
  })
  .server(async (opts: { sMaxAge?: number; swr?: number } = {}) => {
    const sMaxAge = opts.sMaxAge ?? 300;
    const swr = opts.swr ?? 3600;
    try {
      const { setResponseHeader } = await import("@tanstack/react-start/server");
      setResponseHeader(
        "cache-control",
        `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
      );
      setResponseHeader("vary", "accept-encoding");
    } catch {
      /* not in a server request context */
    }
  });
