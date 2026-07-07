import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/tms/orders/[id]/goods-lines
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = supabaseAdmin();
  const { id } = await params;
  const { data, error } = await db
    .from("tms_order_goods_lines")
    .select("*")
    .eq("order_id", id)
    .order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/tms/orders/[id]/goods-lines
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = supabaseAdmin();
  const { id } = await params;
  const body = await req.json();

  // Get next sort order
  const { count } = await db
    .from("tms_order_goods_lines")
    .select("*", { count: "exact", head: true })
    .eq("order_id", id);

  const { data, error } = await db
    .from("tms_order_goods_lines")
    .insert({
      order_id:          id,
      sort_order:        (count ?? 0) + 1,
      hs_code:           body.hs_code ?? null,
      description:       body.description ?? null,
      country_of_origin: body.country_of_origin ?? null,
      gross_weight:      body.gross_weight ?? null,
      net_weight:        body.net_weight ?? null,
      packages:          body.packages ?? null,
      statistical_value: body.statistical_value ?? null,
      customs_procedure: body.customs_procedure ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}