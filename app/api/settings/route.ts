// GET/PUT /api/settings — editable opportunity-engine thresholds (app_settings table).
// Uses the user's session (RLS: authenticated users can read/write), not the admin client.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase.from("app_settings").select("*").order("key");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function PUT(req: NextRequest) {
  const supabase = createClient();
  const body = await req.json();

  if (!body?.key || body.value === undefined) {
    return NextResponse.json({ error: "key and value are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("app_settings")
    .update({ value: body.value })
    .eq("key", body.key)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ setting: data });
}
