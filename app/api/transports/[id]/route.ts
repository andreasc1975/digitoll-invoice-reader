import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ALLOWED = [
  "reference", "transport_mode", "carrier", "border_crossing",
  "eta", "ata", "scheduled_arrival", "status", "tms_trip_ref", "mrn", "submitted_at",
  "identification_number", "type_of_identification", "conveyance_reference_number",
  "operator_name", "operator_id", "customs_office", "digitoll_status",
];

const MASTER_FIELDS = "id, state_id, reference, status, digitoll_status, document_number, document_type, gross_weight, transport_equipment, loading_location, unloading_location";
const HOUSE_FIELDS  = "id, state_id, reference, goods_description, hs_code, gross_weight, exporter, importer, customs_status, tracking_number, customs_procedure, transport_equipment, loading_location, unloading_location, digitoll_status";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("transports")
    .select(`*, masters(${MASTER_FIELDS}, houses(${HOUSE_FIELDS})), houses(${HOUSE_FIELDS})`)
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
    .from("transports")
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
  const { error } = await db.from("transports").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
