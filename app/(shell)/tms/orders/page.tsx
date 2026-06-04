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
  sent_to_digitoll: boolean;
}

const MOCK_ORDERS: Order[] = [
  { id: "1", reference: "ORD-10421", tags: "Express", service_code: "FTL", consignor: "Exporter Sv X AB", consignee: "Company X AS", departure: "2026-06-05", arrival: "2026-06-06", customs_status: "Cleared", gross_weight: 1240, packages: 12, planning_status: "Confirmed", departure_status: "On time", communication_status: "OK", sent_to_digitoll: false },
  { id: "2", reference: "ORD-10422", tags: "", service_code: "LTL", consignor: "Exporter Sv Y AB", consignee: "Company Y AS", departure: "2026-06-05", arrival: "2026-06-07", customs_status: "Pending", gross_weight: 580, packages: 6, planning_status: "Confirmed", departure_status: "On time", communication_status: "OK", sent_to_digitoll: false },
  { id: "3", reference: "ORD-10423", tags: "Priority", service_code: "FTL", consignor: "Exporter Sv Z AB", consignee: "Company Z AS", departure: "2026-06-06", arrival: "2026-06-07", customs_status: "Cleared", gross_weight: 2100, packages: 20, planning_status: "Confirmed", departure_status: "Delayed", communication_status: "Warning", sent_to_digitoll: true },
  { id: "4", reference: "ORD-10424", tags: "", service_code: "LTL", consignor: "Nordic Freight AS", consignee: "Baltic Lines AS", departure: "2026-06-07", arrival: "2026-06-09", customs_status: "Cleared", gross_weight: 890, packages: 8, planning_status: "Confirmed", departure_status: "On time", communication_status: "OK", sent_to_digitoll: false },
  { id: "5", reference: "ORD-10425", tags: "Express", service_code: "Air", consignor: "EuroFreight AB", consignee: "ScanTrans Norge AS", departure: "2026-06-07", arrival: "2026-06-08", customs_status: "Cleared", gross_weight: 340, packages: 3, planning_status: "Confirmed", departure_status: "On time", communication_status: "OK", sent_to_digitoll: false },
];

const fBtn = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 14px", height: 36, boxSizing: "border-box" as const, borderRadius: 2, border: "1px solid transparent", background: active ? "#003160" : "#D9DBE0", color: active ? "#fff" : "#003160", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const });

export default function TMSOrders() {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
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
    if (filter === "digitoll")  return o.sent_to_digitoll;
    return true;
  });

  const counts = {
    all: orders.length,
    today: orders.filter(o => o.departure === todayStr).length,
    this_week: orders.filter(o => o.departure >= todayStr && o.departure <= weekEnd).length,
    pending: orders.filter(o => o.customs_status === "Pending").length,
    cleared: orders.filter(o => o.customs_status === "Cleared").length,
    digitoll: orders.filter(o => o.sent_to_digitoll).length,
  };

  async function sendToDigitoll(order: Order) {
    setSending(order.id);
    await fetch("/api/shipments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference: order.reference,
        actor: order.consignor,
        eta: new Date(order.arrival).toISOString(),
        status: "complete_unlinked",
        own_transport: false,
        declaration_status: "none",
      }),
    });
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, sent_to_digitoll: true } : o));
    setSending(null);
  }

  const statusColor = (s: string) => s === "Cleared" ? { bg: "#ECFDF3", color: "#027A48" } : s === "Pending" ? { bg: "#FFFAEB", color: "#B54708" } : { bg: "#F2F4F7", color: "#667085" };
  const depColor = (s: string) => s === "Delayed" ? { bg: "#FEF3F2", color: "#B42318" } : { bg: "#ECFDF3", color: "#027A48" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>

      {/* Filter bar */}
      <div style={{ padding: "14px 20px 0", background: "#fff", borderBottom: "1px solid #E4E7EC" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" as const }}>
          {([
            ["all", "All", counts.all],
            ["today", "Today", counts.today],
            ["this_week", "This Week", counts.this_week],
            ["pending", "Customs Pending", counts.pending],
            ["cleared", "Customs Cleared", counts.cleared],
            ["digitoll", "Sent to Digitoll", counts.digitoll],
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
              {["Reference", "Tags", "Service", "Consignor", "Consignee", "Departure", "Arrival", "Customs", "Gross kg", "Packages", "Planning", "Dep. Status", ""].map((h, i) => (
                <th key={i} style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#667085", letterSpacing: ".04em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(order => {
              const cs = statusColor(order.customs_status);
              const ds = depColor(order.departure_status);
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
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cs.color }} />
                      {order.customs_status}
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
                  <td style={{ padding: "9px 12px" }}>
                    {order.sent_to_digitoll ? (
                      <span style={{ fontSize: 11.5, color: "#027A48", fontWeight: 500 }}>✓ In Digitoll</span>
                    ) : (
                      <button
                        onClick={() => sendToDigitoll(order)}
                        disabled={sending === order.id}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 2, background: "#446BF9", color: "#fff", fontSize: 11.5, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", opacity: sending === order.id ? 0.6 : 1, whiteSpace: "nowrap" as const }}
                      >
                        {sending === order.id ? "Sending…" : "→ Digitoll"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={13} style={{ padding: 40, textAlign: "center", color: "#98A2B3" }}>No orders found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
