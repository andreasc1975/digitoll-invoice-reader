import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/so-line-revert
// Body: { line_id } — the split line to revert
export async function POST(req: NextRequest) {
  const db = supabaseAdmin();
  const { line_id } = await req.json();

  // 1. Get the split line
  const { data: splitLine } = await db
    .from("sales_order_lines")
    .select("*")
    .eq("id", line_id)
    .eq("is_split", true)
    .single();

  if (!splitLine?.parent_line_id) {
    return NextResponse.json({ error: "Not a split line or parent not found" }, { status: 400 });
  }

  // 2. Get parent line
  const { data: parentLine } = await db
    .from("sales_order_lines")
    .select("*")
    .eq("id", splitLine.parent_line_id)
    .single();

  if (!parentLine) return NextResponse.json({ error: "Parent line not found" }, { status: 404 });

  // 3. Re-link units back to parent (clear price override)
  await db.from("pallet_units")
    .update({ so_line_id: parentLine.id, sales_price: null })
    .eq("so_line_id", line_id);

  // 4. Re-link pallets back to parent
  await db.from("pallets")
    .update({ so_line_id: parentLine.id, sales_price: null })
    .eq("so_line_id", line_id);

  // 5. Restore parent line amounts
  await db.from("sales_order_lines").update({
    allocated_quantity:     parentLine.allocated_quantity + splitLine.allocated_quantity,
    allocated_total_pieces: parentLine.allocated_total_pieces + splitLine.allocated_total_pieces,
    net_amount:             (parentLine.allocated_quantity + splitLine.allocated_quantity) * parentLine.price,
  }).eq("id", parentLine.id);

  // 6. Delete the split line
  await db.from("sales_order_lines").delete().eq("id", line_id);

  return NextResponse.json({ reverted: true, parent_line_id: parentLine.id });
}