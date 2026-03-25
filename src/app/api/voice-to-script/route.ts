import { NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export const maxDuration = 45;

export async function POST(req: Request) {
  try {
    const { transcript } = await req.json();

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json({ error: "Empty transcript" }, { status: 400 });
    }

    const { text } = await generateText({
      model: openai('gpt-4o'),
      system: `You are an expert AI Screenwriter Assistant. The user has dictated a chaotic stream of consciousness for their script using voice-to-text.
Your job is to read their dictated transcript, interpret the creative intent, and format it PERFECTLY into a pristine, industry-standard screenplay snippet.

CRITICAL FORMATTING RULES:
You MUST output ONLY raw HTML tags matching the exact TipTap schema our editor expects. No markdown code blocks like \`\`\`html.
- Action description: <p data-type="action">Action description here.</p>
- Character speaking: <p data-type="character">CHARACTER NAME</p>
- Their Spoken Dialogue: <p data-type="dialogue">The spoken dialogue.</p>
- Parentheticals (if implied): <p data-type="parenthetical">(smiling)</p>
- Scene Headings: <p data-type="scene_heading">INT. COFFEE SHOP - DAY</p>

If the user says "Bob walks in he says where is the money", output:
<p data-type="action">Bob walks in.</p><p data-type="character">BOB</p><p data-type="dialogue">Where is the money?</p>

Fix any obvious speech-to-text typos contextually. Output purely the HTML string.`,
      prompt: `Here is the raw dictated transcript from the user:\n\n"${transcript}"\n\nPlease convert this entirely into TipTap Screenplay HTML nodes.`
    });

    // Strip any inadvertent markdown code block wrapping from the LLM just in case
    const safeHtml = text.replace(/^```html\s*/i, '').replace(/\s*```$/i, '').trim();

    return NextResponse.json({ html: safeHtml });

  } catch (error: any) {
    console.error("AI Voice Formatting Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
