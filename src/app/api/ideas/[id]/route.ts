import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await context.params;

    // Fetch Project
    const { data: project, error: pError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (pError) {
      return NextResponse.json(
        { error: pError.message },
        { status: 500 }
      );
    }

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

    return NextResponse.json({
      project,
      scenes,
      characters,
      ideas,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await context.params;

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}