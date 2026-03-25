import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request, { params }: { params: { projectId: string } }) {
  const { projectId } = await params;

  // Fetch Project
  const { data: project, error: pError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (pError) return NextResponse.json({ error: pError.message }, { status: 500 });

  // Fetch Scenes
  const { data: scenes } = await supabase
    .from("scenes")
    .select("*")
    .eq("project_id", projectId)
    .order("scene_number", { ascending: true });

  // Fetch Characters
  const { data: characters } = await supabase
    .from("characters")
    .select("*")
    .eq("project_id", projectId)
    .order("appearance_count", { ascending: false });

  // Fetch Ideas
  const { data: ideas } = await supabase
    .from("ideas")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ project, scenes, characters, ideas });
}

export async function DELETE(req: Request, { params }: { params: { projectId: string } }) {
  const { projectId } = await params;

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
