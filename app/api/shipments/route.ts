import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET — list all shipments with linked transport reference
export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("shipments")
    .select("*, transports(reference)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — create shipment with auto-incrementing state_id (S-2000+)
export async function POST(req: NextRequest) {
  const db = supabaseAdmin();
  const body = await req.json();

  // Get highest existing state_id to determine next number
  const { data: existing } = await db
    .from("shipments")
    .select("state_id")
    .like("state_id", "S-%")
    .order("state_id", { ascending: false })
    .limit(1);

  let nextNum = 2000;
  if (existing && existing.length > 0 && existing[0].state_id) {
    const lastNum = parseInt(existing[0].state_id.replace("S-", ""), 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  const state_id = `S-${nextNum}`;

  const { data, error } = await db
    .from("shipments")
    .insert({
      state_id,
      reference:          body.reference ?? null,
      transport_id:       body.transport_id ?? null,
      border_crossing:    body.border_crossing ?? null,
      eta:                body.eta ?? null,
      carrier:            body.carrier ?? null,
      responsible:        body.responsible ?? null,
      actor:              body.actor ?? null,
      status:             body.status ?? "incomplete",
      declaration_status: body.declaration_status ?? "none",
      own_transport:      body.own_transport ?? false,
      source:             body.source ?? "manual",
      tms_order_ref:      body.tms_order_ref ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
