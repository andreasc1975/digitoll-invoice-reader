import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("masters")
    .select("*, transports(id, state_id, reference), houses!houses_master_id_fkey(id, state_id, reference, customs_status)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const db = supabaseAdmin();
  const body = await req.json();
  const { data, error } = await db
    .from("masters")
    .insert({
      reference:      body.reference ?? null,
      transport_id:   body.transport_id ?? null,
      consignor:      body.consignor ?? null,
      consignee:      body.consignee ?? null,
      incoterm:       body.incoterm ?? null,
      incoterm_place: body.incoterm_place ?? null,
      invoice_number: body.invoice_number ?? null,
      invoice_date:   body.invoice_date ?? null,
      invoice_value:  body.invoice_value ?? null,
      currency:       body.currency ?? null,
      gross_weight:   body.gross_weight ?? null,
      net_weight:     body.net_weight ?? null,
      status:         body.status ?? "incomplete",
      source:         body.source ?? "manual",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
