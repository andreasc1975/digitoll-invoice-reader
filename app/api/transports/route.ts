import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("transports")
    .select(`*, shipments(id, reference, status, state_id, actor), invoices(id, file_name, completion_pct)`)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const db = supabaseAdmin();
  const body = await req.json();
  const { data, error } = await db
    .from("transports")
    .insert({ reference: body.reference, border_crossing: body.border_crossing, transport_mode: body.transport_mode, eta: body.eta || null, carrier: body.carrier || null, responsible: body.responsible || null, actor: body.actor || null, status: "incomplete", declaration_status: "none" })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
