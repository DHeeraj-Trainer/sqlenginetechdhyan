import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

/**
 * Runtime request/error logger.
 * Captures loader/route exceptions with stack + request metadata so future
 * 500s are diagnosable from Server Logs. Emits one structured JSON line per
 * failure — trivially grep-able (e.g. `search: "ssr_error"`).
 */
const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  const req = request as Request | undefined;
  const started = Date.now();
  const url = req ? new URL(req.url) : null;
  const requestId =
    req?.headers.get("x-request-id") ??
    req?.headers.get("cf-ray") ??
    (globalThis.crypto?.randomUUID?.() ?? String(started));
  const meta = {
    request_id: requestId,
    method: req?.method,
    path: url?.pathname,
    search: url?.search || undefined,
    ua: req?.headers.get("user-agent") ?? undefined,
    ref: req?.headers.get("referer") ?? undefined,
  };

  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    const err = error as Error;
    const payload = {
      tag: "ssr_error",
      ...meta,
      status: 500,
      duration_ms: Date.now() - started,
      error_name: err?.name,
      error_message: err?.message,
      stack: err?.stack,
    };
    // Log both structured (for machine parsing) and raw (for stack preservation).
    try {
      console.error(JSON.stringify(payload));
    } catch {
      /* ignore serialization failure */
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "x-request-id": requestId,
      },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
