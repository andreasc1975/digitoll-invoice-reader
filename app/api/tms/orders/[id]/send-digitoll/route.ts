import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/tms/orders/[id]/send-digitoll
// Alt 3: If order has a trip already sent to Digitoll → attach House to that Master
//        Otherwise → create standalone Transport + Master + House
export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = supabaseAdmin();
  const { id } = await params;

  // 1. Get the order
  const { data: order } = await db
    .from("tms_orders")
    .select("*")
    .eq("id", id)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  let masterId: string | null = null;
  let transportIdForSubmit: string | null = null;
  let mode = "standalone";

  // 2. Check if any linked trip has already been sent to Digitoll
  if (order.trip_ids?.length) {
    const { data: trips } = await db
      .from("tms_trips")
      .select("id, reference, digitoll_transport_id, digitoll_id")
      .in("id", order.trip_ids)
      .not("digitoll_transport_id", "is", null);

    if (trips?.length) {
      // Use the first trip that has a Digitoll transport
      const trip = trips[0];
      // Find the master linked to this transport
      const { data: master } = await db
        .from("masters")
        .select("id")
        .eq("transport_id", trip.digitoll_transport_id)
        .single();

      if (master) {
        masterId = master.id;
        mode = "linked";
        transportIdForSubmit = trip.digitoll_transport_id;
      }
    }
  }

  // 3. If no linked trip/master → create standalone Transport + Master
  if (!masterId) {
    const { data: transport, error: trErr } = await db
      .from("transports")
      .insert({
        reference:      `${order.reference}-T`,
        transport_mode: "Road",
        status:         "incomplete",
        source:         "tms",
        tms_trip_ref:   order.reference,
      })
      .select()
      .single();

    if (trErr || !transport) {
      return NextResponse.json({ error: trErr?.message ?? "Transport failed" }, { status: 500 });
    }

    const { data: master, error: mErr } = await db
      .from("masters")
      .insert({
        transport_id:       transport.id,
        gross_weight:       order.gross_weight ? String(order.gross_weight) : null,
        consignor:          order.consignor ?? null,
        consignee:          order.consignee ?? null,
        goods_description:  order.service_code ?? null,
        status:             "incomplete",
        source:             "tms",
      })
      .select()
      .single();

    if (mErr || !master) {
      return NextResponse.json({ error: mErr?.message ?? "Master failed" }, { status: 500 });
    }

    masterId = master.id;
    transportIdForSubmit = transport?.id ?? null;
  }

  // 4. Create House
  const { data: house, error: hErr } = await db
    .from("houses")
    .insert({
      master_id:          masterId,
      exporter:           order.consignor ?? null,
      importer:           order.consignee ?? null,
      goods_description:  order.service_code ?? null,
      gross_weight:       order.gross_weight ? String(order.gross_weight) : null,
      number_of_packages: order.packages ?? null,
      customs_status:     order.customs_status === "Cleared" ? "cleared" : "pending",
      tms_order_id:       order.id,
      source:             "tms",
    })
    .select()
    .single();

  if (hErr || !house) {
    return NextResponse.json({ error: hErr?.message ?? "House failed" }, { status: 500 });
  }

  // 5. Update order with digitoll_id
  await db.from("tms_orders").update({
    digitoll_id: house.state_id,
  }).eq("id", id);

  return NextResponse.json({
    mode,
    house_id:     house.id,
    house_ref:    house.state_id,
    master_id:    masterId,
    transport_id: transportIdForSubmit,
  });
}