import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = supabaseAdmin();
  const { id } = await params;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(id);

  let query = db
    .from("sales_orders")
    .select(`*, sales_order_lines(*), sales_order_costs(*)`);

  if (isUuid) {
    query = query.eq("id", id);
  } else {
    query = query.eq("order_no", id);
  }

  const { data, error } = await query.single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = supabaseAdmin();
  const body = await req.json();
  const { id } = await params;
  const { data, error } = await db
    .from("sales_orders")
    .update(body)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
