import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ALLOWED = [
  "reference", "consignor", "consignee", "border_crossing", "status", "digitoll_id",
  "sad_exp_name", "sad_exp_address", "sad_exp_country", "sad_exp_org_no",
  "sad_imp_name", "sad_imp_address", "sad_imp_org_no", "sad_imp_vat_no",
  "sad_declarant_name", "sad_declarant_org_no", "sad_declaration_ref",
  "sad_invoice_number", "sad_invoice_date", "sad_prev_document",
  "sad_incoterm", "sad_incoterm_place", "sad_transport_mode_border",
  "sad_transport_ref_border", "sad_border_crossing", "sad_country_dispatch", "sad_country_destination",
  "sad_goods_description", "sad_hs_code", "sad_country_origin",
  "sad_gross_weight", "sad_net_weight", "sad_packages",
  "sad_invoice_value", "sad_currency", "sad_exchange_rate", "sad_statistical_value",
  "sad_customs_duty_rate", "sad_customs_duty_amount", "sad_vat_basis",
];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const body = await req.json();
  const update: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) update[key] = body[key];
  }
  const { data, error } = await db.from("customs").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { error } = await db.from("customs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
