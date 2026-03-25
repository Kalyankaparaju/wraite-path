import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json();
  const { mode, context } = body;

  let systemPrompt = "You are an expert screenwriter assistant. CRITICAL RULE: You must STRICTLY use the same language, dialect, and script as the provided text. If the user writes in a transliterated language (like 'Tiglish' Telugu-in-English, or 'Hinglish'), you MUST reply and write scene actions/dialogues exclusively in that same transliterated language. DO NOT translate the text into proper English.";
  let finalPrompt = "";

  if (mode === 'suggest') {
    systemPrompt += " The user wants you to suggest the next logical line of dialogue or action based on the script so far. Provide ONLY the suggested text, nothing else. Do not use markdown code blocks.";
    finalPrompt = `Script so far:\n${context}\n\nSuggest the next line of action or dialogue:`;
  } else if (mode === 'improve') {
    systemPrompt += " The user wants you to improve the pacing, description, and formatting of their scene. Rewrite it to be more professional and dramatic, keeping the same core meaning. Return ONLY the rewritten text. Do not use markdown code blocks.";
    finalPrompt = `Improve this scene snippet:\n${context}`;
  } else if (mode === 'format') {
    systemPrompt += " The user wants you to format their rough text strictly into standard screenplay format. Ensure Character Names are strictly uppercase. Return ONLY the formatted text. Do not use markdown code blocks.";
    finalPrompt = `Format this text into proper screenplay format:\n${context}`;
  } else {
    return new Response("Invalid mode", { status: 400 });
  }

  try {
    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      prompt: finalPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("AI SDK Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown AI Error" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
