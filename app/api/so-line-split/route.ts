import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/so-line-split
// Body: { line_id, changes: [{ unit_ids: string[], new_price: number }] }
// Each entry in changes = one price group → one new SO line
export async function POST(req: NextRequest) {
  const db = supabaseAdmin();
  const { line_id, changes } = await req.json() as {
    line_id: string;
    changes: { unit_ids: string[]; new_price: number }[];
  };

  if (!line_id || !changes?.length) {
    return NextResponse.json({ error: "line_id and changes required" }, { status: 400 });
  }

  // 1. Get original line
  const { data: origLine } = await db
    .from("sales_order_lines")
    .select("*")
    .eq("id", line_id)
    .single();
  if (!origLine) return NextResponse.json({ error: "Line not found" }, { status: 404 });

  const disc = origLine.discount_type === "Percent" ? (origLine.discount_value || 0) / 100 : 0;
  const newLines = [];
  let totalSplitKg = 0;
  let totalSplitPieces = 0;

  // 2. For each price group — create one SO line
  for (const group of changes) {
    const { data: units } = await db
      .from("pallet_units")
      .select("id, total_kg, pallet_id")
      .in("id", group.unit_ids);

    if (!units?.length) continue;

    const groupKg     = units.reduce((s, u) => s + (u.total_kg || 0), 0);
    const groupPieces = units.length;
    const groupNet    = groupKg * group.new_price * (1 - disc);

    totalSplitKg     += groupKg;
    totalSplitPieces += groupPieces;

    // Create new line
    const { data: newLine, error } = await db
      .from("sales_order_lines")
      .insert({
        sales_order_id:         origLine.sales_order_id,
        parent_line_id:         origLine.parent_line_id ?? origLine.id,
        is_split:               true,
        sort_order:             origLine.sort_order + 1,
        item_no:                origLine.item_no,
        item_name:              origLine.item_name,
        recipient:              origLine.recipient,
        notes:                  origLine.notes,
        units:                  origLine.units,
        pieces_per_unit:        origLine.pieces_per_unit,
        quantity_requested:     Math.round(groupPieces / (origLine.pieces_per_unit || 1)),
        amount_requested:       groupNet,
        allocated_units:        origLine.allocated_units,
        allocated_quantity:     groupKg,
        allocated_total_pieces: groupPieces,
        allocated_from_po:      origLine.allocated_from_po,
        price:                  group.new_price,
        price_unit:             origLine.price_unit,
        discount_value:         origLine.discount_value,
        discount_type:          origLine.discount_type,
        net_amount:             groupNet,
      })
      .select()
      .single();

    if (error || !newLine) return NextResponse.json({ error: error?.message }, { status: 500 });
    newLines.push(newLine);

    // Link units to new line
    await db.from("pallet_units")
      .update({ so_line_id: newLine.id, sales_price: group.new_price })
      .in("id", units.map(u => u.id));

    // Link unique pallets (if all units on a pallet are in this group)
    const palletIds = [...new Set(units.map(u => u.pallet_id))];
    for (const pid of palletIds) {
      const { count: total } = await db.from("pallet_units").select("*", { count: "exact", head: true }).eq("pallet_id", pid);
      const { count: inGroup } = await db.from("pallet_units").select("*", { count: "exact", head: true }).eq("pallet_id", pid).in("id", units.map(u => u.id));
      if (total === inGroup) {
        await db.from("pallets").update({ so_line_id: newLine.id, sales_price: group.new_price }).eq("id", pid);
      }
    }
  }

  // 3. Reduce original line
  const newAllocQty    = (origLine.allocated_quantity    || 0) - totalSplitKg;
  const newAllocPieces = (origLine.allocated_total_pieces || 0) - totalSplitPieces;
  const newNet         = newAllocQty * (origLine.price || 0) * (1 - disc);

  await db.from("sales_order_lines").update({
    allocated_quantity:      newAllocQty,
    allocated_total_pieces:  newAllocPieces,
    net_amount:              newNet,
  }).eq("id", origLine.id);

  return NextResponse.json({ new_lines: newLines, original_line_id: origLine.id });
}