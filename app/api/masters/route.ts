import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("masters")
    .select("*, transports(id, state_id, reference, identification_number, type_of_identification, operator_name, transport_mode, border_crossing, customs_office, scheduled_arrival, eta, ata, status, mrn, digitoll_status), houses!houses_master_id_fkey(id, state_id, reference, customs_status, goods_description, hs_code, gross_weight, exporter, importer, tracking_number, customs_procedure, transport_equipment, loading_location, unloading_location, digitoll_status)")
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
      reference:           body.reference ?? null,
      transport_id:        body.transport_id ?? null,
      gross_weight:        body.gross_weight ?? null,
      document_number:     body.document_number ?? null,
      document_type:       body.document_type ?? null,
      carrier_id:          body.carrier_id ?? null,
      transport_equipment: body.transport_equipment ?? null,
      loading_location:    body.loading_location ?? null,
      unloading_location:  body.unloading_location ?? null,
      relevant_documents:  body.relevant_documents ?? null,
      status:              body.status ?? "incomplete",
      source:              body.source ?? "manual",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}