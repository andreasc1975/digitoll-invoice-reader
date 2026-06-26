import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/so-line-allocate
// Body: { line_id, allocate_units: number }
// Finds available pallet_units for the item and reserves them
export async function POST(req: NextRequest) {
  const db = supabaseAdmin();
  const { line_id, allocate_units } = await req.json();

  if (!line_id || !allocate_units || allocate_units <= 0) {
    return NextResponse.json({ error: "line_id and allocate_units required" }, { status: 400 });
  }

  // 1. Get the SO line + order
  const { data: line } = await db
    .from("sales_order_lines")
    .select("*, sales_orders(order_no)")
    .eq("id", line_id)
    .single();

  if (!line) return NextResponse.json({ error: "Line not found" }, { status: 404 });

  const orderNo = (line.sales_orders as { order_no: string }).order_no;

  // 2. Find available units for this item (not reserved, not allocated)
  const { data: pallets } = await db
    .from("pallets")
    .select("id")
    .eq("item_no", line.item_no);

  if (!pallets?.length) {
    return NextResponse.json({ error: "No pallets found for this item" }, { status: 404 });
  }

  const { data: availableUnits } = await db
    .from("pallet_units")
    .select("id, total_kg, pallet_id")
    .in("pallet_id", pallets.map(p => p.id))
    .is("reserved_to_so", null)
    .limit(allocate_units);

  if (!availableUnits?.length) {
    return NextResponse.json({ error: "No available units in stock for this item" }, { status: 404 });
  }

  // Take only as many as requested
  const toAllocate = availableUnits.slice(0, allocate_units);
  const allocatedKg = toAllocate.reduce((s, u) => s + (u.total_kg || 0), 0);
  const allocatedPieces = toAllocate.length;

  // 3. Reserve the units
  await db.from("pallet_units")
    .update({
      reserved_to_so: orderNo,
      sales_price: line.price ?? null,
    })
    .in("id", toAllocate.map(u => u.id));

  // 4. Update pallet reserved_kg
  const palletGroups: Record<string, number> = {};
  for (const u of toAllocate) {
    palletGroups[u.pallet_id] = (palletGroups[u.pallet_id] || 0) + (u.total_kg || 0);
  }
  for (const [palletId, kg] of Object.entries(palletGroups)) {
    const { data: pallet } = await db.from("pallets").select("reserved_kg, sales_price").eq("id", palletId).single();
    await db.from("pallets").update({
      reserved_kg: (pallet?.reserved_kg || 0) + kg,
      sales_price: pallet?.sales_price ?? line.price ?? null,
    }).eq("id", palletId);
  }

  // 5. Update the SO line
  const disc = line.discount_type === "Percent" ? (line.discount_value || 0) / 100 : 0;
  const netAmount = allocatedKg * (line.price || 0) * (1 - disc);

  await db.from("sales_order_lines").update({
    allocated_quantity:     allocatedKg,
    allocated_total_pieces: allocatedPieces,
    allocated_from_po:      `PO-${orderNo}`,
    net_amount:             netAmount,
  }).eq("id", line_id);

  return NextResponse.json({
    allocated_units:  allocatedPieces,
    allocated_kg:     allocatedKg,
    net_amount:       netAmount,
    order_no:         orderNo,
  });
}