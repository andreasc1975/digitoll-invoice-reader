"use client";
import { useState } from "react";

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
  order_count: number;
  sent_to_digitoll: boolean;
}

const MOCK_TRIPS: Trip[] = [
  { id: "1", reference: "TR-6749", tags: "Express", status: "Active", departure: "2026-06-05 08:00", arrival: "2026-06-06 14:00", from: "Gothenburg", to: "Oslo", trip_status: "Dispatched", customs_status: "Cleared", packages: 18, gross_weight: 1820, loading_meters: 4.5, resource: "ABC123", order_count: 3, sent_to_digitoll: false },
  { id: "2", reference: "TR-6750", tags: "", status: "Active", departure: "2026-06-05 10:00", arrival: "2026-06-06 18:00", from: "Stockholm", to: "Bergen", trip_status: "Planned", customs_status: "Pending", packages: 6, gross_weight: 580, loading_meters: 2.0, resource: "XYZ456", order_count: 1, sent_to_digitoll: false },
  { id: "3", reference: "TR-6751", tags: "Priority", status: "Active", departure: "2026-06-06 06:00", arrival: "2026-06-07 12:00", from: "Malmö", to: "Trondheim", trip_status: "Dispatched", customs_status: "Cleared", packages: 24, gross_weight: 2980, loading_meters: 7.2, resource: "DEF789", order_count: 4, sent_to_digitoll: true },
  { id: "4", reference: "TR-6752", tags: "", status: "Active", departure: "2026-06-07 09:00", arrival: "2026-06-08 16:00", from: "Copenhagen", to: "Stavanger", trip_status: "Planned", customs_status: "Cleared", packages: 9, gross_weight: 940, loading_meters: 3.1, resource: "GHI012", order_count: 2, sent_to_digitoll: false },
  { id: "5", reference: "TR-6753", tags: "Express", status: "Active", departure: "2026-06-08 07:00", arrival: "2026-06-09 13:00", from: "Helsingborg", to: "Kristiansand", trip_status: "Planned", customs_status: "Cleared", packages: 12, gross_weight: 1340, loading_meters: 3.8, resource: "JKL345", order_count: 2, sent_to_digitoll: false },
];

const fBtn = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 14px", height: 36, boxSizing: "border-box" as const, borderRadius: 2, border: "1px solid transparent", background: active ? "#003160" : "#D9DBE0", color: active ? "#fff" : "#003160", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const });

export default function TMSTrips() {
  const [trips, setTrips] = useState<Trip[]>(MOCK_TRIPS);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<string | null>(null);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekEnd = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);

  const filtered = trips.filter(t => {
    if (search && !JSON.stringify(t).toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "today")      return t.departure.startsWith(todayStr);
    if (filter === "this_week")  return t.departure.slice(0, 10) >= todayStr && t.departure.slice(0, 10) <= weekEnd;
    if (filter === "dispatched") return t.trip_status === "Dispatched";
    if (filter === "planned")    return t.trip_status === "Planned";
    if (filter === "digitoll")   return t.sent_to_digitoll;
    return true;
  });

  const counts = {
    all: trips.length,
    today: trips.filter(t => t.departure.startsWith(todayStr)).length,
    this_week: trips.filter(t => t.departure.slice(0, 10) >= todayStr && t.departure.slice(0, 10) <= weekEnd).length,
    dispatched: trips.filter(t => t.trip_status === "Dispatched").length,
    planned: trips.filter(t => t.trip_status === "Planned").length,
    digitoll: trips.filter(t => t.sent_to_digitoll).length,
  };

  async function sendToDigitoll(trip: Trip) {
    setSending(trip.id);
    const res = await fetch("/api/transports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference: trip.reference,
        transport_mode: "Road",
        border_crossing: trip.to,
        eta: new Date(trip.arrival).toISOString(),
        carrier: trip.resource,
        status: trip.order_count > 0 ? "missing_shipments" : "incomplete",
        declaration_status: "none",
      }),
    });
    if (res.ok) {
      setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, sent_to_digitoll: true } : t));
    }
    setSending(null);
  }

  const tripStatusColor = (s: string) => s === "Dispatched" ? { bg: "#EFF8FF", color: "#175CD3" } : { bg: "#F9FAFB", color: "#667085" };
  const customsColor = (s: string) => s === "Cleared" ? { bg: "#ECFDF3", color: "#027A48" } : { bg: "#FFFAEB", color: "#B54708" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>

      {/* Filter bar */}
      <div style={{ padding: "14px 20px 0", background: "#fff", borderBottom: "1px solid #E4E7EC" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" as const }}>
          {([
            ["all", "All", counts.all],
            ["today", "Today", counts.today],
            ["this_week", "This Week", counts.this_week],
            ["dispatched", "Dispatched", counts.dispatched],
            ["planned", "Planned", counts.planned],
            ["digitoll", "Sent to Digitoll", counts.digitoll],
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
              {["Reference", "Tags", "From", "To", "Departure", "Arrival", "Trip Status", "Customs", "Orders", "Gross kg", "Load m", "Resource", ""].map((h, i) => (
                <th key={i} style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#667085", letterSpacing: ".04em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(trip => {
              const ts = tripStatusColor(trip.trip_status);
              const cs = customsColor(trip.customs_status);
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
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: ts.color }} />
                      {trip.trip_status}
                    </span>
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 2, fontSize: 11.5, fontWeight: 500, background: cs.bg, color: cs.color }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cs.color }} />
                      {trip.customs_status}
                    </span>
                  </td>
                  <td style={{ padding: "9px 12px", color: "#344054", textAlign: "center" as const }}>{trip.order_count}</td>
                  <td style={{ padding: "9px 12px", color: "#344054" }}>{trip.gross_weight.toLocaleString()}</td>
                  <td style={{ padding: "9px 12px", color: "#344054" }}>{trip.loading_meters}</td>
                  <td style={{ padding: "9px 12px", color: "#667085" }}>{trip.resource}</td>
                  <td style={{ padding: "9px 12px" }}>
                    {trip.sent_to_digitoll ? (
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
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={13} style={{ padding: 40, textAlign: "center", color: "#98A2B3" }}>No trips found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
