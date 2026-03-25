import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ charId: string }> }
) {
  try {
    const { charId } = await context.params;

    const body = await req.json();
    const { lore, portrait_url } = body;

    const updates: Record<string, any> = {};

    if (lore !== undefined) updates.lore = lore;
    if (portrait_url !== undefined) updates.portrait_url = portrait_url;

    const { data, error } = await supabase
      .from("characters")
      .update(updates)
      .eq("id", charId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}