import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    const { title, template, mode, synopsis, language } = await req.json();

    if (!synopsis) {
      return new Response(JSON.stringify({ error: "No synopsis provided" }), { status: 400 });
    }

    const { object } = await generateObject({
      model: openai('gpt-4o'), // Use gpt-4o for better creative drafting
      system: `You are a professional screenwriter and story outliner. Your job is to take a short synopsis/concept and draft an initial sequence of screenplay scenes to give the writer a head start. Provide a robust sequence of 3 to 6 scenes that establishes the world and characters.\n\nIMPORTANT: You MUST write the actual scene content in the requested language: ${language || 'English'}.\n\nREQUIRED FORMATTING FOR THE 'content' FIELD:\nThe 'content' field MUST BE valid HTML strictly using these TipTap node formats:\n- Action lines: <p data-type="action">Action description here.</p>\n- Character Names: <p data-type="character">CHARACTER NAME</p>\n- Dialogue: <p data-type="dialogue">The spoken dialogue.</p>\n- Parentheticals: <p data-type="parenthetical">(smiling)</p>\nDo not use standard paragraphs. Only use these <p data-type="..."> tags. For Scene Headings, DO NOT write them in the content, they correspond to the location and time parameters.`,
      prompt: `Title: ${title}
Format: ${template}
Style: ${mode}
Language: ${language || 'English'}
Synopsis/Storyline: ${synopsis}

Please draft 3 to 6 logical starting scenes for this project based on the synopsis.
For each scene, provide:
1. scene_number
2. location (e.g., INT. COFFEE SHOP)
3. time_of_day (e.g., DAY)
4. synopsis (a brief one-sentence summary of what happens in this scene)
5. content (the actual screenplay text formatted EXACTLY with TipTap HTML nodes. No raw text). Keep the content relatively brief but highly professional.`,
      schema: z.object({
        scenes: z.array(z.object({
          scene_number: z.number(),
          location: z.string(),
          time_of_day: z.string(),
          synopsis: z.string(),
          content: z.string()
        }))
      })
    });

    return new Response(JSON.stringify(object), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error("AI Draft Generation Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to generate draft." }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
