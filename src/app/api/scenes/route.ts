import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json();

  if (Array.isArray(body)) {
    const { data, error } = await supabase
      .from("scenes")
      .insert(body.map(s => ({
        project_id: s.project_id,
        scene_number: s.scene_number,
        location: s.location || "SCENE",
        time_of_day: s.time_of_day || "",
        synopsis: s.synopsis || "",
        content: s.content || "",
      })))
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } else {
    const { project_id, scene_number, location, time_of_day, synopsis, content } = body;

    const { data, error } = await supabase
      .from("scenes")
      .insert([{ project_id, scene_number, location, time_of_day, synopsis, content }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
}
