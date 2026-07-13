// Server-only helper — filename enforces the boundary.
// Sets edge/CDN cache headers for public content routes.
import { setResponseHeader } from "@tanstack/react-start/server";

export function setPublicCacheHeaders(opts: { sMaxAge?: number; swr?: number } = {}) {
  const sMaxAge = opts.sMaxAge ?? 300;
  const swr = opts.swr ?? 3600;
  try {
    setResponseHeader(
      "cache-control",
      `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
    );
    setResponseHeader("vary", "accept-encoding");
  } catch {
    /* not in a server request context (client-side navigation) */
  }
}
