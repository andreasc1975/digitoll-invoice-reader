import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { calcCompletion, buildDigitollJSON } from "@/lib/fields";

// PATCH /api/invoices/[id] – update a single field
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const body = await req.json();
  const { fieldKey, fieldValue } = body;

  const { error } = await db.from("invoice_fields").upsert(
    { invoice_id: id, field_key: fieldKey, field_value: fieldValue, source: "manual", confidence: null },
    { onConflict: "invoice_id,field_key" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recalculate completion
  const { data: allFields } = await db.from("invoice_fields").select("field_key, field_value").eq("invoice_id", id);
  const valueMap: Record<string, string | null> = {};
  (allFields ?? []).forEach((f) => { valueMap[f.field_key] = f.field_value; });
  const { pct } = calcCompletion(valueMap);
  await db.from("invoices").update({ completion_pct: pct, status: pct === 100 ? "reviewed" : "extracted" }).eq("id", id);

  return NextResponse.json({ success: true, completionPct: pct });
}

// POST /api/invoices/[id] – export to Digitoll JSON and save export record
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: invoice } = await db.from("invoices").select("file_name").eq("id", id).single();
  const { data: allFields } = await db.from("invoice_fields").select("field_key, field_value").eq("invoice_id", id);

  const valueMap: Record<string, string | null> = {};
  (allFields ?? []).forEach((f) => { valueMap[f.field_key] = f.field_value; });

  const exportedAt = new Date().toISOString();
  const payload = buildDigitollJSON(invoice?.file_name ?? "", valueMap, exportedAt);

  await db.from("exports").insert({ invoice_id: id, payload });
  await db.from("invoices").update({ status: "exported" }).eq("id", id);

  return NextResponse.json({ payload });
}
