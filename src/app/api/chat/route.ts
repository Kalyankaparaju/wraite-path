import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { NextRequest } from "next/server";

export const maxDuration = 30;

type ChatRequestBody = {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  context?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const { messages, context } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid request: messages array is required." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const result = streamText({
      model: openai("gpt-4o"),
      system: `You are an expert Hollywood Screenwriter and an AI Co-Writer assistant.
Your job is to brainstorm, rewrite, and help the user flesh out their script.
You will be provided with the current context of the scene they are working on.
Always respond in a helpful, creative, and professional tone.
If the user asks you to rewrite a portion, provide the rewritten text directly.
If the user asks for suggestions, provide 2 to 3 brilliant and concise ideas.

CURRENT SCRIPT CONTEXT:
${context?.trim() || "No script context provided yet."}`,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat API Error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to generate response.";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}