import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("transports")
    .select("*, masters(id, state_id, reference, status, houses(id, state_id, goods_description, hs_code, gross_weight, exporter, importer, customs_status))")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const db = supabaseAdmin();
  const body = await req.json();
  const { data, error } = await db
    .from("transports")
    .insert({
      reference:       body.reference ?? null,
      transport_mode:  body.transport_mode ?? null,
      carrier:         body.carrier ?? null,
      border_crossing: body.border_crossing ?? null,
      eta:             body.eta ?? null,
      status:          body.status ?? "incomplete",
      source:          body.source ?? "manual",
      tms_trip_ref:    body.tms_trip_ref ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
