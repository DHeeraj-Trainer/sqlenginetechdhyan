import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSnippets from "./tools/list_snippets";
import saveSnippet from "./tools/save_snippet";
import deleteSnippet from "./tools/delete_snippet";
import listSharedQueries from "./tools/list_shared_queries";
import listHistory from "./tools/list_history";
import whoami from "./tools/whoami";

// Direct Supabase issuer host (project ref survives publish; SUPABASE_URL is
// proxied via .lovable.cloud on publish and would fail RFC 8414 issuer match).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "sql-workbench-mcp",
  title: "SQL Workbench MCP",
  version: "0.1.0",
  instructions:
    "Tools for the SQL Workbench app. Use `whoami` to verify connectivity, `list_snippets` / `save_snippet` / `delete_snippet` to manage the signed-in user's saved SQL, `list_shared_queries` to browse their shared queries, and `list_history` to inspect recent executions. All tools act as the signed-in user under Row-Level Security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoami, listSnippets, saveSnippet, deleteSnippet, listSharedQueries, listHistory],
});
