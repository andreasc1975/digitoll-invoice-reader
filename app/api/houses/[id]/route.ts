import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ALLOWED = [
  "reference", "master_id", "transport_id", "exporter", "importer", "importer_org_no",
  "goods_description", "hs_code", "gross_weight", "net_weight",
  "packages", "country_origin", "customs_status", "tms_order_id",
  "tracking_number", "customs_procedure", "import_declaration_ref",
  "export_declaration_ref", "ncts_reference", "transport_equipment",
  "loading_location", "unloading_location", "relevant_documents",
  "digitoll_status", "mrn", "submitted_at",
];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("houses")
    .select("*, masters(id, state_id, reference, consignor, consignee, document_number, document_type, gross_weight, transport_equipment, loading_location, unloading_location, digitoll_status, transports(id, state_id, reference, identification_number, type_of_identification, operator_name, transport_mode, border_crossing, customs_office, scheduled_arrival, eta, ata, status, mrn, digitoll_status)), transports(id, state_id, reference, identification_number, type_of_identification, operator_name, transport_mode, border_crossing, customs_office, scheduled_arrival, eta, ata, status, mrn, digitoll_status)")
    .eq("id", id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const body = await req.json();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of ALLOWED) {
    if (key in body) update[key] = body[key];
  }
  const { data, error } = await db
    .from("houses")
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
  const { error } = await db.from("houses").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
