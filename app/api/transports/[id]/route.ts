import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const body = await req.json();

  const update: Record<string, unknown> = {};
  const allowed = [
    "reference", "transport_mode", "border_crossing", "eta", "carrier",
    "responsible", "actor", "status", "declaration_status", "source",
    "tms_trip_ref", "tms_order_ids",
  ];
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const { data, error } = await db
    .from("transports")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { error } = await db.from("transports").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
