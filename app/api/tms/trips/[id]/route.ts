import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const body = await req.json();
  const update: any = { ...body };
  if (body.from) { update.from_city = body.from; delete update.from; }
  if (body.to)   { update.to_city   = body.to;   delete update.to; }
  const { data, error } = await db
    .from("tms_trips")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, from: data.from_city, to: data.to_city });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { error } = await db.from("tms_trips").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
