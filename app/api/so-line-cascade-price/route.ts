import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/so-line-cascade-price
// Body: { line_id, new_price }
// Cascades new price to all non-split pallets and units linked to this line
export async function POST(req: NextRequest) {
  const db = supabaseAdmin();
  const { line_id, new_price } = await req.json();

  const { data: line } = await db
    .from("sales_order_lines")
    .select("item_no, sales_order_id")
    .eq("id", line_id)
    .single();

  if (!line) return NextResponse.json({ error: "Line not found" }, { status: 404 });

  const { data: order } = await db
    .from("sales_orders")
    .select("order_no")
    .eq("id", line.sales_order_id)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Update pallets — only those NOT already split to another line
  await db.from("pallets")
    .update({ sales_price: new_price })
    .eq("item_no", line.item_no)
    .or(`so_line_id.is.null,so_line_id.eq.${line_id}`);

  // Update units — only those reserved to this order and not split
  const { data: pallets } = await db
    .from("pallets")
    .select("id")
    .eq("item_no", line.item_no);

  if (pallets?.length) {
    await db.from("pallet_units")
      .update({ sales_price: new_price })
      .in("pallet_id", pallets.map(p => p.id))
      .eq("reserved_to_so", order.order_no)
      .or(`so_line_id.is.null,so_line_id.eq.${line_id}`);
  }

  return NextResponse.json({ ok: true });
}