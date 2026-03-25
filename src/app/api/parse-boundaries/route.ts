import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export const maxDuration = 60; // Allows up to 60s for long scripts

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text } = body;
    
    if (!text) {
      return new Response(JSON.stringify({ error: "No text provided" }), { status: 400 });
    }

    // Number every line so the AI can safely just output integer boundaries
    const lines = text.split('\n');
    const numberedText = lines.map((line: string, i: number) => `[${i}] ${line.trim()}`).filter((line: string) => line.length > 4).join('\n');
    
    // Wait... if we filter lines, the index changes! We should map index first, then filter.
    const numberedTextSafely = lines.map((line: string, i: number) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      return `[${i}] ${trimmed}`;
    }).filter(Boolean).join('\n');

    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      system: "You are an expert script supervisor. Analyze the screenplay and find every single scene heading. Return an array of all scene boundaries.",
      prompt: `Analyze the following numbered screenplay text and extract EVERY SINGLE scene.
A new scene typically starts with a slugline (e.g., INT. CAFE - DAY or EXT. STREET - CONTINUOUS).
There can be dozens or over a hundred scenes. Do not miss any.

For each scene, provide:
1. start_line: The precise integer inside the brackets (e.g. 45) where the slugline appears.
2. location: The main location without INT/EXT prefixes if possible (e.g. "CAFE", "STREET").
3. time_of_day: The time stated (DAY, NIGHT, CONTINUOUS, etc). If none, just provide empty string.

Numbered Script:
${numberedTextSafely}
`,
      schema: z.object({
        scenes: z.array(z.object({
          start_line: z.number().describe("The exact line number where the scene starts"),
          location: z.string().describe("The physical location"),
          time_of_day: z.string().describe("The time of day")
        }))
      })
    });

    return new Response(JSON.stringify(object), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error("AI SDK Parse Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to intelligently parse the script boundaries." }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
