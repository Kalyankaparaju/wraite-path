import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export const maxDuration = 45;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ charId: string }> }
) {
  try {
    const { charId } = await context.params;

    // 1. Get Character
    const { data: char, error: charErr } = await supabase
      .from("characters")
      .select("*")
      .eq("id", charId)
      .single();

    if (charErr || !char) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 }
      );
    }

    // 2. Fetch scenes for context
    const { data: scenes } = await supabase
      .from("scenes")
      .select("content")
      .eq("project_id", char.project_id);

    const charContext = (scenes || [])
      .map((s) => s.content)
      .filter((content) => content && content.includes(char.name))
      .join("\n\n--- SCENE BREAK ---\n\n")
      .substring(0, 15000);

    // 3. Generate Lore
    const { text } = await generateText({
      model: openai("gpt-4o"),
      system: `You are an expert psychological profiler and character designer for screenplays.
Your task is to analyze the script excerpts and deeply understand the character named ${char.name}.
Create a rich, compelling "Character Bible" entry.`,
      prompt: `Analyze the character: ${char.name}

Here are excerpts from scenes where they appear or are mentioned:
${charContext || "(No scenes yet. Innovate based on their name.)"}

Provide a robust psychological profile in Markdown format including:
- Background & Motivations
- Flaws & Weaknesses
- Physical Description
- Voice & Mannerisms`,
    });

    // 4. Save Lore
    const { data: updatedChar, error: updateErr } = await supabase
      .from("characters")
      .update({ lore: text.trim() })
      .eq("id", charId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ lore: updatedChar.lore });
  } catch (error) {
    console.error("AI Lore Generation Error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}