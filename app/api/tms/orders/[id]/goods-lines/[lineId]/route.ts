import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// PATCH /api/tms/orders/goods-lines/[lineId]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ lineId: string }> }) {
  const db = supabaseAdmin();
  const { lineId } = await params;
  const body = await req.json();
  const { data, error } = await db
    .from("tms_order_goods_lines")
    .update(body)
    .eq("id", lineId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/tms/orders/goods-lines/[lineId]
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ lineId: string }> }) {
  const db = supabaseAdmin();
  const { lineId } = await params;
  const { error } = await db.from("tms_order_goods_lines").delete().eq("id", lineId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}