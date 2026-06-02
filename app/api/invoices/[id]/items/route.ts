import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  line_nr: number;
  article: string | null;
  description: string | null;
  hs_code: string | null;
  origin_country: string | null;
  procedure_code: string | null;
  no_of_parcels: number | null;
  net_weight: number | null;
  gross_weight: number | null;
  amount: number | null;
  currency: string | null;
  quantity: number | null;
  quantity_unit: string | null;
  marks_and_numbers: string | null;
}

// GET – list items for invoice
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", id)
    .order("line_nr", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST – create or replace all items for invoice
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const items: InvoiceItem[] = await req.json();

  // Delete existing and re-insert
  await db.from("invoice_items").delete().eq("invoice_id", id);

  if (items.length > 0) {
    const rows = items.map((item, idx) => ({
      ...item,
      invoice_id: id,
      line_nr: idx + 1,
    }));
    const { error } = await db.from("invoice_items").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Aggregate totals ──────────────────────────────────────────────────────
  const totals = items.reduce((acc, item) => ({
    net_weight:   (acc.net_weight   ?? 0) + (item.net_weight   ?? 0),
    gross_weight: (acc.gross_weight ?? 0) + (item.gross_weight ?? 0),
    amount:       (acc.amount       ?? 0) + (item.amount       ?? 0),
    no_of_parcels:(acc.no_of_parcels?? 0) + (item.no_of_parcels?? 0),
    quantity:     (acc.quantity     ?? 0) + (item.quantity     ?? 0),
  }), { net_weight: 0, gross_weight: 0, amount: 0, no_of_parcels: 0, quantity: 0 });

  const firstItem = items[0];
  const currency  = firstItem?.currency ?? null;
  const amountStr = totals.amount.toFixed(2);

  const upsertRows = [
    // ── SAD fields ───────────────────────────────────────────────────────────
    // Box 35 — Gross Mass
    { invoice_id: id, field_key: "sad_35", field_value: totals.gross_weight.toFixed(3), confidence: "high", source: "items" },
    // Box 38 — Net Mass
    { invoice_id: id, field_key: "sad_38", field_value: totals.net_weight.toFixed(3),   confidence: "high", source: "items" },
    // Box 42 — Item Price (total amount)
    { invoice_id: id, field_key: "sad_42", field_value: amountStr,                       confidence: "high", source: "items" },
    // Box 46 — Statistical Value
    { invoice_id: id, field_key: "sad_46", field_value: amountStr,                       confidence: "high", source: "items" },
    // Box 22 — Currency and Total Invoice Amount
    { invoice_id: id, field_key: "sad_22", field_value: currency ? `${currency} ${amountStr}` : amountStr, confidence: "high", source: "items" },
    // Box 6 — Total Packages
    { invoice_id: id, field_key: "sad_6",  field_value: totals.no_of_parcels.toString(), confidence: "high", source: "items" },
    // Box 5 — Items (number of line items)
    { invoice_id: id, field_key: "sad_5",  field_value: items.length.toString(),          confidence: "high", source: "items" },

    // ── Digitoll fields ──────────────────────────────────────────────────────
    { invoice_id: id, field_key: "totalNetWeight",   field_value: totals.net_weight.toFixed(3),   confidence: "high", source: "items" },
    { invoice_id: id, field_key: "totalGrossWeight", field_value: totals.gross_weight.toFixed(3), confidence: "high", source: "items" },
    { invoice_id: id, field_key: "totalValue",       field_value: amountStr,                       confidence: "high", source: "items" },
    { invoice_id: id, field_key: "customsValue",     field_value: amountStr,                       confidence: "high", source: "items" },
    ...(currency ? [
      { invoice_id: id, field_key: "currency", field_value: currency, confidence: "high", source: "items" },
    ] : []),

    // ── Single-item specific fields ──────────────────────────────────────────
    ...(items.length === 1 && firstItem?.hs_code ? [
      { invoice_id: id, field_key: "sad_33",  field_value: firstItem.hs_code, confidence: "high", source: "items" },
      { invoice_id: id, field_key: "hsCode",  field_value: firstItem.hs_code, confidence: "high", source: "items" },
    ] : []),
    ...(items.length === 1 && firstItem?.origin_country ? [
      { invoice_id: id, field_key: "sad_16",       field_value: firstItem.origin_country, confidence: "high", source: "items" },
      { invoice_id: id, field_key: "sad_34",       field_value: firstItem.origin_country, confidence: "high", source: "items" },
      { invoice_id: id, field_key: "originCountry",field_value: firstItem.origin_country, confidence: "high", source: "items" },
    ] : []),
    ...(items.length === 1 && firstItem?.procedure_code ? [
      { invoice_id: id, field_key: "sad_37",       field_value: firstItem.procedure_code, confidence: "high", source: "items" },
      { invoice_id: id, field_key: "procedureCode",field_value: firstItem.procedure_code, confidence: "high", source: "items" },
    ] : []),
    ...(items.length === 1 && firstItem?.marks_and_numbers ? [
      { invoice_id: id, field_key: "sad_31", field_value: firstItem.marks_and_numbers, confidence: "high", source: "items" },
    ] : []),
  ];

  await db.from("invoice_fields").upsert(upsertRows, { onConflict: "invoice_id,field_key" });

  return NextResponse.json({ success: true, totals });
}
