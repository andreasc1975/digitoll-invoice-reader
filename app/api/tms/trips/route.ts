import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("tms_trips")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Map from_city/to_city back to from/to for frontend compatibility
  const mapped = (data ?? []).map((t: any) => ({
    ...t,
    from: t.from_city,
    to: t.to_city,
  }));
  return NextResponse.json(mapped);
}

export async function POST(req: NextRequest) {
  const db = supabaseAdmin();
  const body = await req.json();
  const { data, error } = await db
    .from("tms_trips")
    .insert({
      reference:      body.reference,
      tags:           body.tags ?? null,
      status:         body.status ?? "Active",
      departure:      body.departure ?? null,
      arrival:        body.arrival ?? null,
      from_city:      body.from ?? body.from_city ?? null,
      to_city:        body.to ?? body.to_city ?? null,
      trip_status:    body.trip_status ?? "Planned",
      customs_status: body.customs_status ?? "Cleared",
      packages:       body.packages ?? null,
      gross_weight:   body.gross_weight ?? null,
      loading_meters: body.loading_meters ?? null,
      resource:       body.resource ?? null,
      order_ids:      body.order_ids ?? [],
      digitoll_id:    body.digitoll_id ?? null,
      cms_id:         body.cms_id ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, from: data.from_city, to: data.to_city }, { status: 201 });
}
