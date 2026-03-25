import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function PUT(req: Request, { params }: { params: { charId: string } }) {
  try {
    const { charId } = await params;
    const body = await req.json();
    const { lore, portrait_url } = body;

    const updates: any = {};
    if (lore !== undefined) updates.lore = lore;
    if (portrait_url !== undefined) updates.portrait_url = portrait_url;

    const { data, error } = await supabase
      .from("characters")
      .update(updates)
      .eq("id", charId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
