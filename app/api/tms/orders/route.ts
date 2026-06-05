import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("tms_orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const db = supabaseAdmin();
  const body = await req.json();
  const { data, error } = await db
    .from("tms_orders")
    .insert({
      reference:            body.reference,
      tags:                 body.tags ?? null,
      service_code:         body.service_code ?? null,
      consignor:            body.consignor ?? null,
      consignee:            body.consignee ?? null,
      departure:            body.departure ?? null,
      arrival:              body.arrival ?? null,
      customs_status:       body.customs_status ?? "Cleared",
      gross_weight:         body.gross_weight ?? null,
      packages:             body.packages ?? null,
      planning_status:      body.planning_status ?? "Confirmed",
      departure_status:     body.departure_status ?? "On time",
      communication_status: body.communication_status ?? "OK",
      trip_ids:             body.trip_ids ?? [],
      digitoll_id:          body.digitoll_id ?? null,
      cms_id:               body.cms_id ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
