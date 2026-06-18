import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("houses")
    .select("*, masters(id, state_id, reference, consignor, consignee, document_number, document_type, gross_weight, transport_equipment, loading_location, unloading_location, digitoll_status, transports(id, state_id, reference, identification_number, type_of_identification, operator_name, transport_mode, border_crossing, customs_office, scheduled_arrival, eta, ata, status, mrn, digitoll_status)), transports(id, state_id, reference, identification_number, type_of_identification, operator_name, transport_mode, border_crossing, customs_office, scheduled_arrival, eta, ata, status, mrn, digitoll_status)")
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
      transport_id:      body.transport_id ?? null,
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
      tracking_number:       body.tracking_number ?? null,
      customs_procedure:     body.customs_procedure ?? null,
      import_declaration_ref: body.import_declaration_ref ?? null,
      export_declaration_ref: body.export_declaration_ref ?? null,
      ncts_reference:        body.ncts_reference ?? null,
      transport_equipment:   body.transport_equipment ?? null,
      loading_location:      body.loading_location ?? null,
      unloading_location:    body.unloading_location ?? null,
      relevant_documents:    body.relevant_documents ?? null,
      tms_order_id:      body.tms_order_id ?? null,
      source:            body.source ?? "manual",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
