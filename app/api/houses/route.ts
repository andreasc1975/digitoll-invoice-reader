import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("houses")
    .select("*, masters(id, state_id, reference, transports(id, state_id, reference))")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const db = supabaseAdmin();
  const body = await req.json();
  const { data, error } = await db
    .from("houses")
    .insert({
      reference:         body.reference ?? null,
      master_id:         body.master_id ?? null,
      exporter:          body.exporter ?? null,
      importer:          body.importer ?? null,
      importer_org_no:   body.importer_org_no ?? null,
      goods_description: body.goods_description ?? null,
      hs_code:           body.hs_code ?? null,
      gross_weight:      body.gross_weight ?? null,
      net_weight:        body.net_weight ?? null,
      packages:          body.packages ?? null,
      country_origin:    body.country_origin ?? null,
      customs_status:    body.customs_status ?? "pending",
      tms_order_id:      body.tms_order_id ?? null,
      source:            body.source ?? "manual",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
