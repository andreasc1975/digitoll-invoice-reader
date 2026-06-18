import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const MASTER_FIELDS = "id, state_id, reference, status, digitoll_status, document_number, document_type, gross_weight, transport_equipment, loading_location, unloading_location";
const HOUSE_FIELDS  = "id, state_id, reference, goods_description, hs_code, gross_weight, exporter, importer, customs_status, tracking_number, customs_procedure, transport_equipment, loading_location, unloading_location, digitoll_status";

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("transports")
    .select(`*, masters(${MASTER_FIELDS}, houses(${HOUSE_FIELDS})), houses(${HOUSE_FIELDS})`)
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
      reference:                      body.reference ?? null,
      transport_mode:                 body.transport_mode ?? null,
      carrier:                        body.carrier ?? null,
      border_crossing:                body.border_crossing ?? null,
      eta:                            body.eta ?? null,
      scheduled_arrival:              body.scheduled_arrival ?? null,
      identification_number:          body.identification_number ?? null,
      type_of_identification:         body.type_of_identification ?? null,
      conveyance_reference_number:    body.conveyance_reference_number ?? null,
      operator_name:                  body.operator_name ?? null,
      operator_id:                    body.operator_id ?? null,
      customs_office:                 body.customs_office ?? null,
      status:                         body.status ?? "incomplete",
      source:                         body.source ?? "manual",
      tms_trip_ref:                   body.tms_trip_ref ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
