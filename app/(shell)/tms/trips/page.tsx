"use client";
import { useState } from "react";

interface Order {
  id: string;
  reference: string;
  consignor: string;
  consignee: string;
  gross_weight: number;
  packages: number;
  customs_status: string;
  digitoll_id: string | null;
  cms_id: string | null;
}

interface Trip {
  id: string;
  reference: string;
  tags: string;
  status: string;
  departure: string;
  arrival: string;
  from: string;
  to: string;
  trip_status: string;
  customs_status: string;
  packages: number;
  gross_weight: number;
  loading_meters: number;
  resource: string;
  order_ids: string[];
  digitoll_id: string | null;
  cms_id: string | null;
}

const MOCK_ORDERS: Order[] = [
  { id: "1", reference: "ORD-10421", consignor: "Exporter Sv X AB", consignee: "Company X AS", gross_weight: 1240, packages: 12, customs_status: "Cleared", digitoll_id: null, cms_id: null },
  { id: "2", reference: "ORD-10422", consignor: "Exporter Sv Y AB", consignee: "Company Y AS", gross_weight: 580, packages: 6, customs_status: "Pending", digitoll_id: null, cms_id: null },
  { id: "3", reference: "ORD-10423", consignor: "Exporter Sv Z AB", consignee: "Company Z AS", gross_weight: 2100, packages: 20, customs_status: "Cleared", digitoll_id: "SH-DIG-10423", cms_id: "CMS-10423" },
  { id: "4", reference: "ORD-10424", consignor: "Nordic Freight AS", consignee: "Baltic Lines AS", gross_weight: 890, packages: 8, customs_status: "Cleared", digitoll_id: null, cms_id: null },
  { id: "5", reference: "ORD-10425", consignor: "EuroFreight AB", consignee: "ScanTrans Norge AS", gross_weight: 340, packages: 3, customs_status: "Cleared", digitoll_id: null, cms_id: null },
];

const MOCK_TRIPS: Trip[] = [
  { id: "t1", reference: "TR-6749", tags: "Express", status: "Active", departure: "2026-06-05 08:00", arrival: "2026-06-06 14:00", from: "Gothenburg", to: "Oslo", trip_status: "Dispatched", customs_status: "Cleared", packages: 18, gross_weight: 1820, loading_meters: 4.5, resource: "ABC123", order_ids: ["1", "4"], digitoll_id: null, cms_id: null },
  { id: "t2", reference: "TR-6750", tags: "", status: "Active", departure: "2026-06-05 10:00", arrival: "2026-06-06 18:00", from: "Stockholm", to: "Bergen", trip_status: "Planned", customs_status: "Pending", packages: 6, gross_weight: 580, loading_meters: 2.0, resource: "XYZ456", order_ids: ["4"], digitoll_id: null, cms_id: null },
  { id: "t3", reference: "TR-6751", tags: "Priority", status: "Active", departure: "2026-06-06 06:00", arrival: "2026-06-07 12:00", from: "Malmö", to: "Trondheim", trip_status: "Dispatched", customs_status: "Cleared", packages: 24, gross_weight: 2980, loading_meters: 7.2, resource: "DEF789", order_ids: ["3"], digitoll_id: "TR-DIG-6751", cms_id: "CMS-TR-6751" },
  { id: "t4", reference: "TR-6752", tags: "", status: "Active", departure: "2026-06-07 09:00", arrival: "2026-06-08 16:00", from: "Copenhagen", to: "Stavanger", trip_status: "Planned", customs_status: "Cleared", packages: 9, gross_weight: 940, loading_meters: 3.1, resource: "GHI012", order_ids: [], digitoll_id: null, cms_id: null },
  { id: "t5", reference: "TR-6753", tags: "Express", status: "Active", departure: "2026-06-08 07:00", arrival: "2026-06-09 13:00", from: "Helsingborg", to: "Kristiansand", trip_status: "Planned", customs_status: "Cleared", packages: 12, gross_weight: 1340, loading_meters: 3.8, resource: "JKL345", order_ids: [], digitoll_id: null, cms_id: null },
];

const fBtn = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 14px", height: 36, boxSizing: "border-box" as const, borderRadius: 2, border: "1px solid transparent", background: active ? "#003160" : "#D9DBE0", color: active ? "#fff" : "#003160", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const });

export default function TMSTrips() {
  const [trips, setTrips] = useState<Trip[]>(MOCK_TRIPS);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [linkModal, setLinkModal] = useState<{ tripId: string } | null>(null);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekEnd = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);

  const filtered = trips.filter(t => {
    if (search && !JSON.stringify(t).toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "today")      return t.departure.startsWith(todayStr);
    if (filter === "this_week")  return t.departure.slice(0, 10) >= todayStr && t.departure.slice(0, 10) <= weekEnd;
    if (filter === "dispatched") return t.trip_status === "Dispatched";
    if (filter === "planned")    return t.trip_status === "Planned";
    if (filter === "digitoll")   return !!t.digitoll_id;
    return true;
  });

  const counts = {
    all: trips.length,
    today: trips.filter(t => t.departure.startsWith(todayStr)).length,
    this_week: trips.filter(t => t.departure.slice(0, 10) >= todayStr && t.departure.slice(0, 10) <= weekEnd).length,
    dispatched: trips.filter(t => t.trip_status === "Dispatched").length,
    planned: trips.filter(t => t.trip_status === "Planned").length,
    digitoll: trips.filter(t => !!t.digitoll_id).length,
  };

  function createCms(trip: Trip) {
    const cmsId = `CMS-TR-${trip.reference.replace("TR-", "")}`;
    setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, cms_id: cmsId } : t));
  }

  function toggleOrderLink(tripId: string, orderId: string) {
    setTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      const already = t.order_ids.includes(orderId);
      return { ...t, order_ids: already ? t.order_ids.filter(o => o !== orderId) : [...t.order_ids, orderId] };
    }));
  }

  async function sendToDigitoll(trip: Trip) {
    setSending(trip.id);
    const linkedOrders = orders.filter(o => trip.order_ids.includes(o.id));

    // 1. Skapa transport
    const trRes = await fetch("/api/transports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference: trip.reference,
        transport_mode: "Road",
        border_crossing: trip.to,
        eta: new Date(trip.arrival).toISOString(),
        carrier: trip.resource,
        status: linkedOrders.length > 0 ? "missing_shipments" : "incomplete",
        declaration_status: "none",
        source: "tms",
        tms_trip_ref: trip.reference,
      }),
    });

    if (!trRes.ok) { setSending(null); return; }
    const transport = await trRes.json();
    const digitollTrId = transport.reference ?? transport.id;

    // 2. Skapa shipments för varje länkad order och koppla dem
    const shipmentIds: string[] = [];
    for (const order of linkedOrders) {
      const shRes = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: order.reference,
          transport_id: transport.id,
          actor: order.consignor,
          eta: new Date(trip.arrival).toISOString(),
          status: "complete_linked",
          own_transport: false,
          declaration_status: "none",
          source: "tms",
          tms_order_ref: order.reference,
        }),
      });
      if (shRes.ok) {
        const shipment = await shRes.json();
        shipmentIds.push(shipment.id);
        // Uppdatera order med digitoll_id
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, digitoll_id: shipment.reference ?? shipment.id } : o));
      }
    }

    // 3. Uppdatera transport-status
    if (shipmentIds.length > 0) {
      await fetch(`/api/transports/${transport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ready" }),
      });
    }

    // 4. Uppdatera trip med digitoll_id
    setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, digitoll_id: digitollTrId } : t));
    setSending(null);
  }

  const tripStatusColor = (s: string) => s === "Dispatched" ? { bg: "#EFF8FF", color: "#175CD3" } : { bg: "#F9FAFB", color: "#667085" };
  const customsColor = (s: string) => s === "Cleared" ? { bg: "#ECFDF3", color: "#027A48" } : { bg: "#FFFAEB", color: "#B54708" };

  const linkingTrip = linkModal ? trips.find(t => t.id === linkModal.tripId) : null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>

      {/* Link modal */}
      {linkModal && linkingTrip && (
        <div onClick={() => setLinkModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 560, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", textTransform: "uppercase", letterSpacing: ".05em" }}>Link Orders to Trip</div>
                <div style={{ fontSize: 12, color: "#667085", marginTop: 2 }}>{linkingTrip.reference} — {linkingTrip.from} → {linkingTrip.to}</div>
              </div>
              <button onClick={() => setLinkModal(null)} style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 16, color: "#667085", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "#fff", borderBottom: "2px solid #E4E7EC" }}>
                    <th style={{ width: 36, padding: "8px 12px" }} />
                    {["Reference", "Consignor", "Consignee", "Gross kg", "Packages", "Customs"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#667085", letterSpacing: ".04em", textTransform: "uppercase" as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => {
                    const linked = linkingTrip.order_ids.includes(order.id);
                    const cs = order.customs_status === "Cleared" ? { bg: "#ECFDF3", color: "#027A48" } : { bg: "#FFFAEB", color: "#B54708" };
                    return (
                      <tr key={order.id} onClick={() => toggleOrderLink(linkingTrip.id, order.id)} style={{ borderBottom: "1px solid #E4E7EC", cursor: "pointer", background: linked ? "#EDF0F3" : "transparent" }}
                        onMouseEnter={e => { if (!linked) (e.currentTarget as HTMLElement).style.background = "#F9FAFB"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = linked ? "#EDF0F3" : "transparent"; }}
                      >
                        <td style={{ padding: "8px 12px" }}>
                          <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${linked ? "#446BF9" : "#D0D5DD"}`, background: linked ? "#446BF9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                            {linked && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1, fontWeight: 700 }}>✓</span>}
                          </div>
                        </td>
                        <td style={{ padding: "8px 12px", fontWeight: 600, color: "#175CD3" }}>{order.reference}</td>
                        <td style={{ padding: "8px 12px", color: "#344054" }}>{order.consignor}</td>
                        <td style={{ padding: "8px 12px", color: "#344054" }}>{order.consignee}</td>
                        <td style={{ padding: "8px 12px", color: "#344054" }}>{order.gross_weight.toLocaleString()}</td>
                        <td style={{ padding: "8px 12px", color: "#344054" }}>{order.packages}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 2, fontSize: 11, fontWeight: 500, background: cs.bg, color: cs.color }}>
                            <span style={{ width: 4, height: 4, borderRadius: "50%", background: cs.color }} />{order.customs_status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#667085" }}>{linkingTrip.order_ids.length} order{linkingTrip.order_ids.length !== 1 ? "s" : ""} linked</span>
              <button onClick={() => setLinkModal(null)} style={{ padding: "7px 16px", borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ padding: "14px 20px 0", background: "#fff", borderBottom: "1px solid #E4E7EC" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" as const }}>
          {([
            ["all", "All", counts.all],
            ["today", "Today", counts.today],
            ["this_week", "This Week", counts.this_week],
            ["dispatched", "Dispatched", counts.dispatched],
            ["planned", "Planned", counts.planned],
            ["digitoll", "In Digitoll", counts.digitoll],
          ] as [string, string, number][]).map(([key, label, count]) => (
            <button key={key} onClick={() => setFilter(key)} style={fBtn(filter === key)}>
              {label}
              <span style={{ background: filter === key ? "rgba(255,255,255,0.25)" : "#003160", color: "#fff", borderRadius: 2, padding: "0 6px", fontSize: 10, fontWeight: 700 }}>{count}</span>
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", minWidth: 220 }}>
            <span style={{ fontFamily: "Material Icons", fontSize: 16, color: "#98A2B3", lineHeight: 1 }}>search</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search trips..." style={{ border: "none", outline: "none", fontSize: 12.5, color: "#344054", fontFamily: "inherit", flex: 1, background: "transparent" }} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: "#fff", borderBottom: "2px solid #E4E7EC" }}>
              {["Reference", "Tags", "From", "To", "Departure", "Arrival", "Trip Status", "Customs", "Orders", "Gross kg", "Load m", "Resource", "Digitoll ID", "CMS ID"].map((h, i) => (
                <th key={i} style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#667085", letterSpacing: ".04em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(trip => {
              const ts = tripStatusColor(trip.trip_status);
              const cs = customsColor(trip.customs_status);
              const linkedOrders = orders.filter(o => trip.order_ids.includes(o.id));
              return (
                <tr key={trip.id} style={{ borderBottom: "1px solid #E4E7EC" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F9FAFB")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "9px 12px", fontWeight: 600, color: "#175CD3" }}>{trip.reference}</td>
                  <td style={{ padding: "9px 12px", color: "#667085" }}>{trip.tags || "—"}</td>
                  <td style={{ padding: "9px 12px", color: "#344054" }}>{trip.from}</td>
                  <td style={{ padding: "9px 12px", color: "#344054" }}>{trip.to}</td>
                  <td style={{ padding: "9px 12px", color: "#667085", whiteSpace: "nowrap" as const }}>{trip.departure}</td>
                  <td style={{ padding: "9px 12px", color: "#667085", whiteSpace: "nowrap" as const }}>{trip.arrival}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 2, fontSize: 11.5, fontWeight: 500, background: ts.bg, color: ts.color }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: ts.color }} />{trip.trip_status}
                    </span>
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 2, fontSize: 11.5, fontWeight: 500, background: cs.bg, color: cs.color }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cs.color }} />{trip.customs_status}
                    </span>
                  </td>
                  {/* Orders column */}
                  <td style={{ padding: "9px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" as const }}>
                      {linkedOrders.length > 0 && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 2, fontSize: 11, fontWeight: 600, background: "#ECFDF3", color: "#027A48" }}>
                          {linkedOrders.length} order{linkedOrders.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      <button
                        onClick={() => setLinkModal({ tripId: trip.id })}
                        style={{ width: 20, height: 20, borderRadius: "50%", border: "1px solid #D0D5DD", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#667085", flexShrink: 0 }}
                        title="Link orders"
                      >+</button>
                    </div>
                  </td>
                  <td style={{ padding: "9px 12px", color: "#344054" }}>{trip.gross_weight.toLocaleString()}</td>
                  <td style={{ padding: "9px 12px", color: "#344054" }}>{trip.loading_meters}</td>
                  <td style={{ padding: "9px 12px", color: "#667085" }}>{trip.resource}</td>
                  {/* Digitoll ID */}
                  <td style={{ padding: "9px 12px" }}>
                    {trip.digitoll_id
                      ? <span style={{ fontSize: 11.5, fontWeight: 600, color: "#027A48" }}>{trip.digitoll_id}</span>
                      : <span style={{ fontSize: 11.5, color: "#98A2B3" }}>—</span>
                    }
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    {trip.digitoll_id ? (
                      <span style={{ fontSize: 11.5, color: "#027A48", fontWeight: 500 }}>✓ In Digitoll</span>
                    ) : (
                      <button
                        onClick={() => sendToDigitoll(trip)}
                        disabled={sending === trip.id}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 2, background: "#446BF9", color: "#fff", fontSize: 11.5, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", opacity: sending === trip.id ? 0.6 : 1, whiteSpace: "nowrap" as const }}
                      >
                        {sending === trip.id ? "Sending…" : "→ Digitoll"}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    {trip.cms_id
                      ? <span style={{ fontSize: 11.5, fontWeight: 600, color: "#027A48" }}>{trip.cms_id}</span>
                      : <button onClick={() => createCms(trip)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 2, background: "transparent", color: "#667085", fontSize: 11.5, fontWeight: 600, border: "1px solid #D0D5DD", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>
                          + Declaration
                        </button>
                    }
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={14} style={{ padding: 40, textAlign: "center", color: "#98A2B3" }}>No trips found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
