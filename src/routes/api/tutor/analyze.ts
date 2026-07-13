import { createFileRoute } from "@tanstack/react-router";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";

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

function mapGatewayError(status: number) {
  if (status === 429) return { status: 429, message: "Rate limit reached. Please try again in a moment." };
  if (status === 402) return { status: 402, message: "AI credits exhausted. Add credits in Settings → Plans & credits." };
  return { status: 500, message: "AI service temporarily unavailable." };
}

export const Route = createFileRoute("/api/tutor/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { query, errorMessage, schemaContext, questionContext } = await request.json();
          if (!query) {
            return Response.json({ error: "No query provided for analysis." }, { status: 400 });
          }

          const systemInstruction =
            "You are an encouraging, professional SQL Database Tutor in an interactive bootcamp. " +
            "Your goal is to help students understand why their SQL query failed and guide them to correct it. " +
            "Explain the root cause clearly, avoid heavy academic jargon, use markdown formatting, and provide a corrected, fully working query block.";

          const prompt = `
A student's SQL query has failed in our in-memory AlaSQL interactive environment. Please analyze it and guide them.

--- FAILED QUERY ---
${query}

--- SQL ENGINE ERROR MESSAGE ---
${errorMessage || "N/A (Syntax or logical mismatch)"}

--- CURRENT TABLE SCHEMAS (CONTEXT) ---
${JSON.stringify(schemaContext, null, 2)}

--- ACTIVE CHALLENGE (IF APPLICABLE) ---
${questionContext ? `Challenge Name: ${questionContext.name}\nObjective: ${questionContext.prompt}\nExpected target database state context.` : "Ad-hoc query exploration"}

Please respond in a structured markdown format with the following sections:
1. **🔍 Root Cause**: Explain in plain English exactly why the query failed.
2. **💡 Step-by-Step Guidance**: Give a short 2-3 step explanation on how to resolve the issue.
3. **✅ Corrected Syntax**: Provide the corrected, fully working SQL query inside a single \`\`\`sql block.
4. **🧠 Tutor Tip**: Provide a short, memorable tip about the SQL concept involved.`;

          const gateway = getGateway();
          const { text } = await generateText({
            model: gateway(MODEL),
            system: systemInstruction,
            prompt,
            temperature: 0.2,
          });

          return Response.json({ analysis: text });
        } catch (error: any) {
          console.error("AI Tutor Analysis Error:", error);
          const status = error?.statusCode ?? error?.status;
          if (status === 429 || status === 402) {
            const mapped = mapGatewayError(status);
            return Response.json({ error: mapped.message }, { status: mapped.status });
          }
          return Response.json(
            { error: error?.message || "An unexpected error occurred during AI analysis." },
            { status: 500 },
          );
        }
      },
    },
  },
});
