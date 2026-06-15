import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("customs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const db = supabaseAdmin();
  const body = await req.json();

  console.log("customs POST body keys:", Object.keys(body));
  console.log("sad_exp_name in body:", body.sad_exp_name);

  const SAD_KEYS = [
    "sad_exp_name","sad_exp_address","sad_exp_country","sad_exp_org_no",
    "sad_imp_name","sad_imp_address","sad_imp_org_no","sad_imp_vat_no",
    "sad_declarant_name","sad_declarant_org_no","sad_declaration_ref",
    "sad_invoice_number","sad_invoice_date","sad_prev_document",
    "sad_incoterm","sad_incoterm_place","sad_transport_mode_border",
    "sad_transport_ref_border","sad_border_crossing","sad_country_dispatch","sad_country_destination",
    "sad_goods_description","sad_hs_code","sad_country_origin",
    "sad_gross_weight","sad_net_weight","sad_packages",
    "sad_invoice_value","sad_currency","sad_exchange_rate","sad_statistical_value",
    "sad_customs_duty_rate","sad_customs_duty_amount","sad_vat_basis",
  ];

  const sadFields: Record<string, string | null> = {};
  for (const key of SAD_KEYS) {
    sadFields[key] = body[key] ?? null;
  }

  console.log("sadFields:", JSON.stringify(sadFields));

  const insertObj: Record<string, unknown> = {
    reference:       body.reference,
    consignor:       body.consignor,
    consignee:       body.consignee,
    border_crossing: body.border_crossing,
    status:          body.status ?? "draft",
    digitoll_id:     body.digitoll_id ?? null,
    ...sadFields,
  };
  console.log("insertObj sad_exp_name:", insertObj.sad_exp_name);

  const { data, error } = await db
    .from("customs")
    .insert(insertObj)
    .select()
    .single();
  if (error) {
    console.error("customs insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  console.log("customs insert success, sad_exp_name:", data?.sad_exp_name);
  return NextResponse.json(data, { status: 201 });
}
