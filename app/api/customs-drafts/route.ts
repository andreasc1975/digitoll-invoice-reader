import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Fixed defaults matching the CMS application
const DEFAULTS = {
  declaration_type: "FU - Complete",
  managed_by:       "Karlsson, Andreas Nils",
  customs_unit:     "Maritech TVINN TEST",
};

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("customs_drafts")
    .select("*, invoices(file_name)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const db   = supabaseAdmin();
  const body = await req.json();

  const { data, error } = await db
    .from("customs_drafts")
    .insert({
      invoice_id:          body.invoice_id ?? null,
      import_export:       body.import_export ?? "Export",
      declaration_type:    DEFAULTS.declaration_type,
      managed_by:          DEFAULTS.managed_by,
      customs_unit:        DEFAULTS.customs_unit,
      declaration_date:    body.declaration_date ?? new Date().toISOString().split("T")[0],

      // Consignor (Brreg-validated)
      consignor_name:      body.consignor_name ?? null,
      consignor_org_no:    body.consignor_org_no ?? null,
      consignor_address:   body.consignor_address ?? null,
      consignor_city:      body.consignor_city ?? null,
      consignor_postcode:  body.consignor_postcode ?? null,
      consignor_country:   body.consignor_country ?? null,
      brreg_validated:     body.brreg_validated ?? false,
      brreg_validated_at:  body.brreg_validated ? new Date().toISOString() : null,

      // Consignee
      consignee_name:      body.consignee_name ?? null,
      consignee_org_no:    body.consignee_org_no ?? null,
      consignee_address:   body.consignee_address ?? null,
      consignee_city:      body.consignee_city ?? null,
      consignee_postcode:  body.consignee_postcode ?? null,
      consignee_country:   body.consignee_country ?? null,

      // Invoice
      invoice_number:      body.invoice_number ?? null,
      invoice_date:        body.invoice_date ?? null,
      currency:            body.currency ?? null,
      invoice_value:       body.invoice_value ? parseFloat(body.invoice_value) : null,

      // Goods
      goods_description:   body.goods_description ?? null,
      hs_code:             body.hs_code ?? null,
      gross_weight:        body.gross_weight ? parseFloat(body.gross_weight) : null,
      net_weight:          body.net_weight ? parseFloat(body.net_weight) : null,
      packages:            body.packages ?? null,
      country_origin:      body.country_origin ?? null,

      status: "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
