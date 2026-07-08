import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/transports/[id]/submit
// Submits the transport + master + houses to Digitoll (simulated)
export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = supabaseAdmin();
  const { id } = await params;

  const { data: transport } = await db
    .from("transports")
    .select("*, masters(id, houses(id))")
    .eq("id", id)
    .single();

  if (!transport) return NextResponse.json({ error: "Transport not found" }, { status: 404 });

  // Generate simulated MRN
  const mrn = `24NO${String(Math.floor(Math.random() * 1e12)).padStart(12,"0")}`;
  const now = new Date().toISOString();

  // Update transport
  await db.from("transports").update({
    digitoll_status: "sent",
    submitted_at:    now,
    mrn:             mrn,
  }).eq("id", id);

  // Update all masters
  const masterIds = (transport.masters as {id:string}[])?.map(m => m.id) ?? [];
  if (masterIds.length) {
    await db.from("masters").update({
      digitoll_status: "sent",
      submitted_at:    now,
      mrn:             mrn,
    }).in("id", masterIds);
  }

  // Update all houses
  const masters = (transport.masters as {id:string; houses:{id:string}[]}[]) ?? [];
  const houseIds = masters.flatMap(m => (m.houses ?? []).map(h => h.id));
  if (houseIds.length) {
    await db.from("houses").update({
      digitoll_status: "sent",
      submitted_at:    now,
      mrn:             mrn,
    }).in("id", houseIds);
  }

  return NextResponse.json({ ok: true, mrn, submitted_at: now });
}