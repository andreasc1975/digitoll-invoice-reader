"use client";
import { useState } from "react";

interface Order {
  id: string;
  reference: string;
  tags: string;
  service_code: string;
  consignor: string;
  consignee: string;
  departure: string;
  arrival: string;
  customs_status: string;
  gross_weight: number;
  packages: number;
  planning_status: string;
  departure_status: string;
  communication_status: string;
  trip_ids: string[];
  digitoll_id: string | null;
  cms_id: string | null;
}

interface Trip {
  id: string;
  reference: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  digitoll_id: string | null;
}

const MOCK_TRIPS: Trip[] = [
  { id: "t1", reference: "TR-6749", from: "Gothenburg", to: "Oslo", departure: "2026-06-05 08:00", arrival: "2026-06-06 14:00", digitoll_id: null },
  { id: "t2", reference: "TR-6750", from: "Stockholm", to: "Bergen", departure: "2026-06-05 10:00", arrival: "2026-06-06 18:00", digitoll_id: null },
  { id: "t3", reference: "TR-6751", from: "Malmö", to: "Trondheim", departure: "2026-06-06 06:00", arrival: "2026-06-07 12:00", digitoll_id: "TR-DIG-6751" },
  { id: "t4", reference: "TR-6752", from: "Copenhagen", to: "Stavanger", departure: "2026-06-07 09:00", arrival: "2026-06-08 16:00", digitoll_id: null },
  { id: "t5", reference: "TR-6753", from: "Helsingborg", to: "Kristiansand", departure: "2026-06-08 07:00", arrival: "2026-06-09 13:00", digitoll_id: null },
];

const MOCK_ORDERS: Order[] = [
  { id: "1", reference: "ORD-10421", tags: "Express", service_code: "FTL", consignor: "Exporter Sv X AB", consignee: "Company X AS", departure: "2026-06-05", arrival: "2026-06-06", customs_status: "Cleared", gross_weight: 1240, packages: 12, planning_status: "Confirmed", departure_status: "On time", communication_status: "OK", trip_ids: ["t1"], digitoll_id: null, cms_id: null },
  { id: "2", reference: "ORD-10422", tags: "", service_code: "LTL", consignor: "Exporter Sv Y AB", consignee: "Company Y AS", departure: "2026-06-05", arrival: "2026-06-07", customs_status: "Pending", gross_weight: 580, packages: 6, planning_status: "Confirmed", departure_status: "On time", communication_status: "OK", trip_ids: [], digitoll_id: null, cms_id: null },
  { id: "3", reference: "ORD-10423", tags: "Priority", service_code: "FTL", consignor: "Exporter Sv Z AB", consignee: "Company Z AS", departure: "2026-06-06", arrival: "2026-06-07", customs_status: "Cleared", gross_weight: 2100, packages: 20, planning_status: "Confirmed", departure_status: "Delayed", communication_status: "Warning", trip_ids: ["t3"], digitoll_id: "SH-DIG-10423", cms_id: "CMS-10423" },
  { id: "4", reference: "ORD-10424", tags: "", service_code: "LTL", consignor: "Nordic Freight AS", consignee: "Baltic Lines AS", departure: "2026-06-07", arrival: "2026-06-09", customs_status: "Cleared", gross_weight: 890, packages: 8, planning_status: "Confirmed", departure_status: "On time", communication_status: "OK", trip_ids: ["t1", "t2"], digitoll_id: null, cms_id: null },
  { id: "5", reference: "ORD-10425", tags: "Express", service_code: "Air", consignor: "EuroFreight AB", consignee: "ScanTrans Norge AS", departure: "2026-06-07", arrival: "2026-06-08", customs_status: "Cleared", gross_weight: 340, packages: 3, planning_status: "Confirmed", departure_status: "On time", communication_status: "OK", trip_ids: [], digitoll_id: null, cms_id: null },
];

const fBtn = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 14px", height: 36, boxSizing: "border-box" as const, borderRadius: 2, border: "1px solid transparent", background: active ? "#003160" : "#D9DBE0", color: active ? "#fff" : "#003160", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const });

export default function TMSOrders() {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [trips] = useState<Trip[]>(MOCK_TRIPS);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [linkModal, setLinkModal] = useState<{ orderId: string } | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekEnd = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);

  const filtered = orders.filter(o => {
    if (search && !JSON.stringify(o).toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "today")     return o.departure === todayStr;
    if (filter === "this_week") return o.departure >= todayStr && o.departure <= weekEnd;
    if (filter === "pending")   return o.customs_status === "Pending";
    if (filter === "cleared")   return o.customs_status === "Cleared";
    if (filter === "linked")    return o.trip_ids.length > 0;
    if (filter === "digitoll")  return !!o.digitoll_id;
    return true;
  });

  const counts = {
    all: orders.length,
    today: orders.filter(o => o.departure === todayStr).length,
    this_week: orders.filter(o => o.departure >= todayStr && o.departure <= weekEnd).length,
    pending: orders.filter(o => o.customs_status === "Pending").length,
    cleared: orders.filter(o => o.customs_status === "Cleared").length,
    linked: orders.filter(o => o.trip_ids.length > 0).length,
    digitoll: orders.filter(o => !!o.digitoll_id).length,
  };

  function createCms(order: Order) {
    const cmsId = `CMS-${order.reference.replace("ORD-", "")}`;
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, cms_id: cmsId } : o));
  }

  function toggleTripLink(orderId: string, tripId: string) {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const already = o.trip_ids.includes(tripId);
      return { ...o, trip_ids: already ? o.trip_ids.filter(t => t !== tripId) : [...o.trip_ids, tripId] };
    }));
  }

  const statusColor = (s: string) => s === "Cleared" ? { bg: "#ECFDF3", color: "#027A48" } : s === "Pending" ? { bg: "#FFFAEB", color: "#B54708" } : { bg: "#F2F4F7", color: "#667085" };
  const depColor = (s: string) => s === "Delayed" ? { bg: "#FEF3F2", color: "#B42318" } : { bg: "#ECFDF3", color: "#027A48" };

  const linkingOrder = linkModal ? orders.find(o => o.id === linkModal.orderId) : null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>

      {/* Link modal */}
      {linkModal && linkingOrder && (
        <div onClick={() => setLinkModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 520, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", textTransform: "uppercase", letterSpacing: ".05em" }}>Link to Trip</div>
                <div style={{ fontSize: 12, color: "#667085", marginTop: 2 }}>{linkingOrder.reference}</div>
              </div>
              <button onClick={() => setLinkModal(null)} style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 16, color: "#667085", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "#fff", borderBottom: "2px solid #E4E7EC" }}>
                    <th style={{ width: 36, padding: "8px 12px" }} />
                    {["Reference", "From", "To", "Departure", "Arrival"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#667085", letterSpacing: ".04em", textTransform: "uppercase" as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trips.map(trip => {
                    const linked = linkingOrder.trip_ids.includes(trip.id);
                    return (
                      <tr key={trip.id} onClick={() => toggleTripLink(linkingOrder.id, trip.id)} style={{ borderBottom: "1px solid #E4E7EC", cursor: "pointer", background: linked ? "#EDF0F3" : "transparent" }}
                        onMouseEnter={e => { if (!linked) (e.currentTarget as HTMLElement).style.background = "#F9FAFB"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = linked ? "#EDF0F3" : "transparent"; }}
                      >
                        <td style={{ padding: "8px 12px" }}>
                          <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${linked ? "#446BF9" : "#D0D5DD"}`, background: linked ? "#446BF9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                            {linked && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1, fontWeight: 700 }}>✓</span>}
                          </div>
                        </td>
                        <td style={{ padding: "8px 12px", fontWeight: 600, color: "#175CD3" }}>{trip.reference}</td>
                        <td style={{ padding: "8px 12px", color: "#344054" }}>{trip.from}</td>
                        <td style={{ padding: "8px 12px", color: "#344054" }}>{trip.to}</td>
                        <td style={{ padding: "8px 12px", color: "#667085" }}>{trip.departure}</td>
                        <td style={{ padding: "8px 12px", color: "#667085" }}>{trip.arrival}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end", gap: 8 }}>
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
            ["pending", "Customs Pending", counts.pending],
            ["cleared", "Customs Cleared", counts.cleared],
            ["linked", "Linked to Trip", counts.linked],
            ["digitoll", "In Digitoll", counts.digitoll],
          ] as [string, string, number][]).map(([key, label, count]) => (
            <button key={key} onClick={() => setFilter(key)} style={fBtn(filter === key)}>
              {label}
              <span style={{ background: filter === key ? "rgba(255,255,255,0.25)" : "#003160", color: "#fff", borderRadius: 2, padding: "0 6px", fontSize: 10, fontWeight: 700 }}>{count}</span>
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", minWidth: 220 }}>
            <span style={{ fontFamily: "Material Icons", fontSize: 16, color: "#98A2B3", lineHeight: 1 }}>search</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..." style={{ border: "none", outline: "none", fontSize: 12.5, color: "#344054", fontFamily: "inherit", flex: 1, background: "transparent" }} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: "#fff", borderBottom: "2px solid #E4E7EC" }}>
              {["Reference", "Tags", "Service", "Consignor", "Consignee", "Departure", "Arrival", "Customs", "Gross kg", "Packages", "Planning", "Dep. Status", "Trips", "Digitoll ID", "CMS ID"].map((h, i) => (
                <th key={i} style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#667085", letterSpacing: ".04em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(order => {
              const cs = statusColor(order.customs_status);
              const ds = depColor(order.departure_status);
              const linkedTrips = trips.filter(t => order.trip_ids.includes(t.id));
              return (
                <tr key={order.id} style={{ borderBottom: "1px solid #E4E7EC" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F9FAFB")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "9px 12px", fontWeight: 600, color: "#175CD3" }}>{order.reference}</td>
                  <td style={{ padding: "9px 12px", color: "#667085" }}>{order.tags || "—"}</td>
                  <td style={{ padding: "9px 12px", color: "#344054" }}>{order.service_code}</td>
                  <td style={{ padding: "9px 12px", color: "#344054" }}>{order.consignor}</td>
                  <td style={{ padding: "9px 12px", color: "#344054" }}>{order.consignee}</td>
                  <td style={{ padding: "9px 12px", color: "#667085" }}>{order.departure}</td>
                  <td style={{ padding: "9px 12px", color: "#667085" }}>{order.arrival}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 2, fontSize: 11.5, fontWeight: 500, background: cs.bg, color: cs.color }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cs.color }} />{order.customs_status}
                    </span>
                  </td>
                  <td style={{ padding: "9px 12px", color: "#344054" }}>{order.gross_weight.toLocaleString()}</td>
                  <td style={{ padding: "9px 12px", color: "#344054" }}>{order.packages}</td>
                  <td style={{ padding: "9px 12px", color: "#667085" }}>{order.planning_status}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 2, fontSize: 11.5, fontWeight: 500, background: ds.bg, color: ds.color }}>
                      {order.departure_status}
                    </span>
                  </td>
                  {/* Trips column */}
                  <td style={{ padding: "9px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" as const }}>
                      {linkedTrips.map(t => (
                        <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 2, fontSize: 11, fontWeight: 600, background: "#EFF8FF", color: "#175CD3" }}>
                          {t.reference}
                        </span>
                      ))}
                      <button
                        onClick={() => setLinkModal({ orderId: order.id })}
                        style={{ width: 20, height: 20, borderRadius: "50%", border: "1px solid #D0D5DD", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#667085", flexShrink: 0 }}
                        title="Link to trip"
                      >+</button>
                    </div>
                  </td>
                  {/* Digitoll ID */}
                  <td style={{ padding: "9px 12px" }}>
                    {order.digitoll_id
                      ? <span style={{ fontSize: 11.5, fontWeight: 600, color: "#027A48" }}>{order.digitoll_id}</span>
                      : <span style={{ fontSize: 11.5, color: "#98A2B3" }}>—</span>
                    }
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    {order.cms_id
                      ? <span style={{ fontSize: 11.5, fontWeight: 600, color: "#027A48" }}>{order.cms_id}</span>
                      : <button onClick={() => createCms(order)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 2, background: "transparent", color: "#667085", fontSize: 11.5, fontWeight: 600, border: "1px solid #D0D5DD", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>
                          + Declaration
                        </button>
                    }
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={15} style={{ padding: 40, textAlign: "center", color: "#98A2B3" }}>No orders found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
