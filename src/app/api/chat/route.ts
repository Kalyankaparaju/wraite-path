import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json();

    const result = streamText({
      model: openai('gpt-4o'), // Use 4o for superior contextual chat interaction
      system: `You are an expert Hollywood Screenwriter and an AI Co-Writer assistant. 
Your job is to brainstorm, rewrite, and help the user flesh out their script. 
You will be provided with the current context of the scene they are working on.
Always respond in a helpful, creative, and professional tone.
If the user asks you to rewrite a portion, provide the rewritten text directly.
If the user asks for suggestions, provide 2-3 brilliant and concise ideas.

CURRENT SCRIPT CONTEXT:
${context || 'No script context provided yet.'}`,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to generate response." }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
