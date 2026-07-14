// Server-only helper — filename enforces the boundary.
// Sets edge/CDN cache headers for public content routes.
import { createIsomorphicFn } from "@tanstack/react-start";

export const setPublicCacheHeaders = createIsomorphicFn()
  .client((_opts?: { sMaxAge?: number; swr?: number; immutable?: boolean }) => {
    /* no-op on client-side navigation */
  })
  .server(async (opts: { sMaxAge?: number; swr?: number; immutable?: boolean } = {}) => {
    const sMaxAge = opts.sMaxAge ?? 600;
    const swr = opts.swr ?? 86_400;
    try {
      const { setResponseHeader } = await import("@tanstack/react-start/server");
      const value = opts.immutable
        ? `public, max-age=60, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}, immutable`
        : `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`;
      setResponseHeader("cache-control", value);
      // Cloudflare tiered cache: keep edge copy longer than browser copy.
      setResponseHeader(
        "cdn-cache-control",
        `public, s-maxage=${sMaxAge * 2}, stale-while-revalidate=${swr}`,
      );
      setResponseHeader("vary", "accept-encoding");
    } catch {
      /* not in a server request context */
    }
  });
