import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function supabaseForUser(ctx: ToolContext) {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_snippets",
  title: "List SQL snippets",
  description: "List the signed-in user's saved SQL snippets from the workbench.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).optional().describe("Max number of snippets to return (default 50)."),
    engine: z.enum(["sqlite", "postgres", "alasql"]).optional().describe("Filter by engine."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, engine }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = supabaseForUser(ctx)
      .from("workbench_snippets")
      .select("id,name,engine,sql,tags,updated_at")
      .eq("user_id", ctx.getUserId()!)
      .order("updated_at", { ascending: false })
      .limit(limit ?? 50);
    if (engine) q = q.eq("engine", engine);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { snippets: data ?? [] },
    };
  },
});
