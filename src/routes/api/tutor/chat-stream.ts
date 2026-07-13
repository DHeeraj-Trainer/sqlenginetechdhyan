import { createFileRoute } from "@tanstack/react-router";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const MODEL = "google/gemini-3-flash-preview";

const SYSTEM_PROMPT = `You are an expert SQL tutor embedded in an interactive SQL Workbench.
You can help with:
- Explaining SQL errors and how to fix them.
- Translating English requirements into SQL.
- Suggesting optimizations (indexes, join order, avoiding SELECT *).
- Explaining execution plans and joins.
- Fixing broken queries.
Rules:
- Use concise markdown. Wrap SQL in \`\`\`sql code blocks.
- When the user provides a schema, always reference exact table and column names.
- Prefer standard SQL that works on SQLite and PostgreSQL; call out dialect-specific parts.`;

interface ChatBody {
  messages?: UIMessage[];
  context?: {
    engine?: string;
    schema?: Array<{ name: string; columns: { name: string; type: string }[] }>;
    lastQuery?: string;
    lastError?: string | null;
  };
}

export const Route = createFileRoute("/api/tutor/chat-stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as ChatBody;
          if (!Array.isArray(body.messages)) {
            return new Response("Messages required", { status: 400 });
          }
          const key = process.env.LOVABLE_API_KEY;
          if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

          const gateway = createOpenAICompatible({
            name: "lovable",
            baseURL: "https://ai.gateway.lovable.dev/v1",
            headers: { "Lovable-API-Key": key },
          });

          const schemaText = body.context?.schema?.length
            ? `\nActive schema (${body.context.engine ?? "sql"}):\n${body.context.schema
                .map(
                  (t) =>
                    `- ${t.name}(${t.columns.map((c) => `${c.name} ${c.type}`).join(", ")})`,
                )
                .join("\n")}`
            : "";
          const failureContext =
            body.context?.lastQuery && body.context?.lastError
              ? `\n\nMost recent failed query:\n\`\`\`sql\n${body.context.lastQuery}\n\`\`\`\nError: ${body.context.lastError}`
              : "";
          const system = `${SYSTEM_PROMPT}${schemaText}${failureContext}`;

          const result = streamText({
            model: gateway(MODEL),
            system,
            messages: await convertToModelMessages(body.messages),
          });

          return result.toUIMessageStreamResponse({ originalMessages: body.messages });
        } catch (e) {
          const status = (e as { statusCode?: number; status?: number })?.statusCode ??
            (e as { statusCode?: number; status?: number })?.status;
          if (status === 429) return new Response("Rate limit reached.", { status: 429 });
          if (status === 402)
            return new Response("AI credits exhausted. Add credits in Settings → Plans & credits.", {
              status: 402,
            });
          console.error("chat-stream error", e);
          return new Response("AI service error", { status: 500 });
        }
      },
    },
  },
});
