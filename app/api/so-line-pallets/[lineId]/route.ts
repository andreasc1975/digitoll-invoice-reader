import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(_: NextRequest, { params }: { params: Promise<{ lineId: string }> }) {
  const db = supabaseAdmin();
  const { lineId } = await params;

  const { data: line } = await db
    .from("sales_order_lines")
    .select("item_no, sales_order_id, price")
    .eq("id", lineId)
    .single();

  if (!line) return NextResponse.json({ pallets: [] });

  const { data: order } = await db
    .from("sales_orders")
    .select("order_no")
    .eq("id", line.sales_order_id)
    .single();

  if (!order) return NextResponse.json({ pallets: [] });

  const { data: pallets } = await db
    .from("pallets")
    .select(`
      id, pallet_no, warehouse, item_no, po_no,
      packed_date, order_date, packing, location,
      value_pr_weight, inventory_value, sales_price,
      total_kg, reserved_kg, allocated_kg, available_kg,
      pallet_units!inner ( id )
    `)
    .eq("item_no", line.item_no)
    .eq("pallet_units.reserved_to_so", order.order_no)
    .order("pallet_no");

  if (!pallets?.length) return NextResponse.json({ pallets: [] });

  const palletIds = pallets.map(p => p.id);
  const { data: allUnits } = await db
    .from("pallet_units")
    .select(`
      id, pallet_id, unit_no, packing_plant, tags, comment,
      landing_no, packed_date, original_eta, use_by_date,
      po_no, reserved_to_so, sales_price,
      value_pr_weight, inventory_value,
      total_kg, reserved_kg, allocated_kg, available_kg
    `)
    .in("pallet_id", palletIds)
    .order("unit_no");

  const palletsWithUnits = pallets.map(p => ({
    ...p,
    pallet_units: (allUnits ?? []).filter(u => u.pallet_id === p.id),
  }));

  return NextResponse.json({ pallets: palletsWithUnits, line_price: line.price });
}