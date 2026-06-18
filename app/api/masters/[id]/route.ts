import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ALLOWED = [
  "reference", "transport_id",
  "gross_weight", "status",
  "document_number", "document_type", "carrier_id",
  "transport_equipment", "loading_location", "unloading_location", "relevant_documents",
  "digitoll_status", "mrn", "submitted_at",
];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("masters")
    .select("*, transports(id, state_id, reference, identification_number, type_of_identification, operator_name, transport_mode, border_crossing, customs_office, scheduled_arrival, eta, ata, status, mrn, digitoll_status), houses!houses_master_id_fkey(id, state_id, reference, customs_status, goods_description, hs_code, gross_weight, exporter, importer, tracking_number, customs_procedure, transport_equipment, loading_location, unloading_location, digitoll_status)")
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
    .from("masters")
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
  const { error } = await db.from("masters").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
