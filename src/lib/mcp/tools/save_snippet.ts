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
  name: "save_snippet",
  title: "Save SQL snippet",
  description: "Create a new SQL snippet in the signed-in user's workbench.",
  inputSchema: {
    name: z.string().trim().min(1).max(200).describe("Snippet display name."),
    sql: z.string().trim().min(1).describe("SQL body."),
    engine: z.enum(["sqlite", "postgres", "alasql"]).default("sqlite"),
    tags: z.array(z.string()).max(20).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ name, sql, engine, tags }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("workbench_snippets")
      .insert({ user_id: ctx.getUserId(), name, sql, engine, tags: tags ?? [] })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Saved snippet ${data.id}` }],
      structuredContent: { snippet: data },
    };
  },
});
