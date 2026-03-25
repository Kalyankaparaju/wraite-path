import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const parseCharacters = (content: string) => {
  const lines = content.split("\n");
  const detected: Record<string, number> = {};
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Original strict rule (Character name isolated on one line)
    const isStrict = trimmed === trimmed.toUpperCase() && trimmed.length < 30 && /^[A-Z\s]+$/.test(trimmed);
    if (isStrict) {
      detected[trimmed] = (detected[trimmed] || 0) + 1;
      continue;
    }

    // Relaxed rule based on how you typed it (e.g. "SREENU: Dialogue" or "ALI(action): Dialogue")
    const match = trimmed.match(/^([A-Z\s]+)[:\(]/);
    if (match && match[1].trim().length > 0 && match[1].trim().length < 30) {
      const name = match[1].trim();
      detected[name] = (detected[name] || 0) + 1;
    }
  }
  return detected;
};

const getRoleTag = (dialogueCount: number) => {
  if (dialogueCount >= 15) return "Main";
  if (dialogueCount >= 5) return "Supporting";
  return "Side";
};

export async function PUT(req: Request, { params }: { params: { sceneId: string } }) {
  const { sceneId } = await params;
  const body = await req.json();
  const { content, location, time_of_day, synopsis, scene_number, project_id, all_scenes } = body;

  // 1. Update the Scene Focus
  const { error: sError } = await supabase.from("scenes").update({
    content,
    location,
    time_of_day,
    synopsis,
    scene_number
  }).eq("id", sceneId);

  if (sError) return NextResponse.json({ error: sError.message }, { status: 500 });

  // 2. Parse Characters
  // We expect the client to send `all_scenes` containing the updated array of all scenes in the project
  const globalCharDialogues: Record<string, number> = {};
  const globalCharAppearances: Record<string, Set<string>> = {};

  for (const scene of all_scenes) {
    if (!scene.content) continue;
    const sceneChars = parseCharacters(scene.content);
    
    for (const [charName, count] of Object.entries(sceneChars)) {
      globalCharDialogues[charName] = (globalCharDialogues[charName] || 0) + count;
      
      if (!globalCharAppearances[charName]) {
        globalCharAppearances[charName] = new Set();
      }
      globalCharAppearances[charName].add(scene.id);
    }
  }

  // Fetch Existing Characters
  const { data: existingChars } = await supabase
    .from("characters")
    .select("*")
    .eq("project_id", project_id);

  const existingCharsMap = new Map(existingChars?.map(c => [c.name, c]) || []);
  const charsList = Object.keys(globalCharDialogues);
  
  const updatedCharacters = [];

  for (const charName of charsList) {
    const diagCount = globalCharDialogues[charName];
    const appCount = globalCharAppearances[charName].size;
    const roleTag = getRoleTag(diagCount);

    const existing = existingCharsMap.get(charName);
    
    if (existing) {
      const { data } = await supabase.from("characters").update({
        dialogue_count: diagCount,
        appearance_count: appCount,
        role_tag: roleTag
      }).eq("id", existing.id).select().single();
      if (data) updatedCharacters.push(data);
    } else {
      const { data } = await supabase.from("characters").insert([{
        project_id,
        name: charName,
        dialogue_count: diagCount,
        appearance_count: appCount,
        role_tag: roleTag
      }]).select().single();
      if (data) updatedCharacters.push(data);
    }
  }

  // We should also delete characters that no longer appear at all, but for MVP we skip it to save ops.

  return NextResponse.json({ success: true, updatedCharacters });
}

export async function DELETE(req: Request, { params }: { params: { sceneId: string } }) {
  const { sceneId } = await params;

  const { error } = await supabase
    .from("scenes")
    .delete()
    .eq("id", sceneId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
