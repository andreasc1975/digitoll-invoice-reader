import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET — list all transports with linked shipments
export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("transports")
    .select("*, shipments(*)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — create transport with auto-incrementing state_id (T-1000+)
export async function POST(req: NextRequest) {
  const db = supabaseAdmin();
  const body = await req.json();

  // Get highest existing state_id to determine next number
  const { data: existing } = await db
    .from("transports")
    .select("state_id")
    .like("state_id", "T-%")
    .order("state_id", { ascending: false })
    .limit(1);

  let nextNum = 1000;
  if (existing && existing.length > 0 && existing[0].state_id) {
    const lastNum = parseInt(existing[0].state_id.replace("T-", ""), 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  const state_id = `T-${nextNum}`;

  const { data, error } = await db
    .from("transports")
    .insert({
      state_id,
      reference:        body.reference ?? null,
      transport_mode:   body.transport_mode ?? null,
      border_crossing:  body.border_crossing ?? null,
      eta:              body.eta ?? null,
      carrier:          body.carrier ?? null,
      responsible:      body.responsible ?? null,
      actor:            body.actor ?? null,
      status:           body.status ?? "incomplete",
      declaration_status: body.declaration_status ?? "none",
      source:           body.source ?? "manual",
      tms_trip_ref:     body.tms_trip_ref ?? null,
      tms_order_ids:    body.tms_order_ids ?? [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
