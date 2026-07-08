import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/tms/trips/[id]/send-digitoll
// Creates Transport → Master → Houses from TMS trip data
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const url = new URL(req.url);
  const isAuto = url.searchParams.get("auto") === "1";
  const db = supabaseAdmin();
  const { id } = await params;

  // 1. Get the trip
  const { data: trip } = await db
    .from("tms_trips")
    .select("*")
    .eq("id", id)
    .single();

  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  // 2. Get linked orders
  const { data: orders } = await db
    .from("tms_orders")
    .select("*")
    .in("id", trip.order_ids ?? []);

  // 3. Create Transport
  const { data: transport, error: trErr } = await db
    .from("transports")
    .insert({
      reference:              trip.reference,
      transport_mode:         trip.transport_mode ?? "Road",
      identification_number:  trip.vehicle_reg_no ?? null,
      nationality_of_means:   trip.vehicle_nationality ?? null,
      operator_name:          trip.driver_name ?? null,
      driver_contact:         trip.driver_contact ?? null,
      customs_office:         trip.customs_place ?? null,
      customs_representative: trip.customs_representative ?? null,
      scheduled_arrival:      trip.arrival ? new Date(trip.arrival).toISOString() : null,
      carrier:                trip.resource ?? null,
      border_crossing:        trip.to_city ?? null,
      status:                 "incomplete",
      source:                 "tms",
      tms_trip_ref:           trip.reference,
    })
    .select()
    .single();

  if (trErr || !transport) {
    return NextResponse.json({ error: trErr?.message ?? "Transport failed" }, { status: 500 });
  }

  // 4. Create Master
  const { data: master, error: mErr } = await db
    .from("masters")
    .insert({
      transport_id:    transport.id,
      gross_weight:    trip.gross_weight ? String(trip.gross_weight) : null,
      transport_equipment: null,
      loading_location:   trip.from_city ?? null,
      unloading_location: trip.to_city ?? null,
      status:          "incomplete",
      source:          "tms",
    })
    .select()
    .single();

  if (mErr || !master) {
    return NextResponse.json({ error: mErr?.message ?? "Master failed" }, { status: 500 });
  }

  // 5. Create Houses for each linked order
  const houseResults = [];
  for (const order of orders ?? []) {
    const { data: house } = await db
      .from("houses")
      .insert({
        master_id:       master.id,
        exporter:        order.consignor ?? null,
        importer:        order.consignee ?? null,
        gross_weight:    order.gross_weight ? String(order.gross_weight) : null,
        number_of_packages: order.packages ?? null,
        goods_description:  order.service_code ?? null,
        customs_status:  order.customs_status === "Cleared" ? "cleared" : "pending",
        tms_order_id:    order.id,
        source:          "tms",
      })
      .select()
      .single();

    if (house) {
      houseResults.push(house);
      // Update order with digitoll_id
      await db.from("tms_orders")
        .update({ digitoll_id: house.state_id })
        .eq("id", order.id);
    }
  }

  // 6. Update trip with digitoll info
  await db.from("tms_trips").update({
    digitoll_id:           transport.state_id,
    digitoll_transport_id: transport.id,
    ...(isAuto ? {} : { digitoll_synced_at: new Date().toISOString() }),
  }).eq("id", id);

  return NextResponse.json({
    transport_id:    transport.id,
    transport_ref:   transport.state_id,
    master_id:       master.id,
    houses:          houseResults.length,
  });
}