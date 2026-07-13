import { createFileRoute } from "@tanstack/react-router";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, type ModelMessage } from "ai";

const MODEL = "google/gemini-3-flash-preview";

function getGateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured.");
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": key },
  });
}

export const Route = createFileRoute("/api/tutor/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { history, message } = await request.json();
          if (!message) {
            return Response.json({ error: "No message provided for chat." }, { status: 400 });
          }

          const systemInstruction =
            "You are an encouraging, expert SQL Database Tutor. Provide helpful, conversational, and precise answers to " +
            "student questions about SQL syntax, schemas, optimization, views, triggers, and other relational concepts. " +
            "Use markdown for formatting and SQL code blocks when providing examples.";

          // Convert Gemini-style history ({ role: 'user'|'model', parts:[{text}] })
          // to AI SDK ModelMessage[] ('user' | 'assistant').
          const messages: ModelMessage[] = Array.isArray(history)
            ? history.map((m: any) => ({
                role: m.role === "model" ? "assistant" : "user",
                content: (m.parts?.map((p: any) => p.text).join("") ?? "") as string,
              }))
            : [];
          messages.push({ role: "user", content: message });

          const gateway = getGateway();
          const { text } = await generateText({
            model: gateway(MODEL),
            system: systemInstruction,
            messages,
          });

          return Response.json({ response: text });
        } catch (error: any) {
          console.error("AI Tutor Chat Error:", error);
          const status = error?.statusCode ?? error?.status;
          if (status === 429) {
            return Response.json({ error: "Rate limit reached. Please retry shortly." }, { status: 429 });
          }
          if (status === 402) {
            return Response.json(
              { error: "AI credits exhausted. Add credits in Settings → Plans & credits." },
              { status: 402 },
            );
          }
          return Response.json(
            { error: error?.message || "An unexpected error occurred during chat." },
            { status: 500 },
          );
        }
      },
    },
  },
});
