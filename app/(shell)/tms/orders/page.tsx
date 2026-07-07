"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

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





const fBtn = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 14px", height: 36, boxSizing: "border-box" as const, borderRadius: 2, border: "1px solid transparent", background: active ? "#003160" : "#D9DBE0", color: active ? "#fff" : "#003160", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const });

export default function TMSOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/tms/orders");
    if (res.ok) setOrders(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const [trips, setTrips] = useState<Trip[]>([]);

  const loadTrips = useCallback(async () => {
    const res = await fetch("/api/tms/trips");
    if (res.ok) setTrips(await res.json());
  }, []);

  useEffect(() => { loadTrips(); }, [loadTrips]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [linkModal, setLinkModal] = useState<{ orderId: string } | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [createCount, setCreateCount] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    function handleCreate() { setCreateModal(true); }
    window.addEventListener("digitoll:open-create-menu", handleCreate);
    return () => window.removeEventListener("digitoll:open-create-menu", handleCreate);
  }, []);

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

  const CONSIGNORS = ["Exporter Sv X AB", "Exporter Sv Y AB", "Nordic Freight AS", "EuroFreight AB", "ScanTrans AB", "Baltic Cargo AB"];
  const CONSIGNEES = ["Company X AS", "Company Y AS", "Baltic Lines AS", "ScanTrans Norge AS", "Nordic Import AS", "Oslo Freight AS"];
  const SERVICES   = ["FTL", "LTL", "Air", "Rail"];
  const STATUSES   = ["On time", "On time", "On time", "Delayed"];
  const CUSTOMS    = ["Cleared", "Cleared", "Cleared", "Pending"];
  const TAGS       = ["", "", "Express", "Priority", ""];

  function generateOrder(): Order {
    const id = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const depDate = new Date(Date.now() + Math.random() * 14 * 86400000);
    const arrDate = new Date(depDate.getTime() + (1 + Math.random() * 2) * 86400000);
    const num = Math.floor(10426 + Math.random() * 1000);
    return {
      id,
      reference: `ORD-${num}`,
      tags: TAGS[Math.floor(Math.random() * TAGS.length)],
      service_code: SERVICES[Math.floor(Math.random() * SERVICES.length)],
      consignor: CONSIGNORS[Math.floor(Math.random() * CONSIGNORS.length)],
      consignee: CONSIGNEES[Math.floor(Math.random() * CONSIGNEES.length)],
      departure: depDate.toISOString().slice(0, 10),
      arrival: arrDate.toISOString().slice(0, 10),
      customs_status: CUSTOMS[Math.floor(Math.random() * CUSTOMS.length)],
      gross_weight: Math.floor(200 + Math.random() * 3000),
      packages: Math.floor(1 + Math.random() * 30),
      planning_status: "Confirmed",
      departure_status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
      communication_status: "OK",
      trip_ids: [],
      digitoll_id: null,
      cms_id: null,
    };
  }

  async function createOrders() {
    const newOrders = Array.from({ length: createCount }, generateOrder);
    await Promise.all(newOrders.map(o =>
      fetch("/api/tms/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(o),
      })
    ));
    setCreateModal(false);
    setCreateCount(1);
    load();
  }

  function toggleRow(id: string) {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function deleteSelected() {
    await Promise.all([...selectedRows].map(id =>
      fetch(`/api/tms/orders/${id}`, { method: "DELETE" })
    ));
    setSelectedRows(new Set());
    load();
  }

  async function sendToDigitoll(order: typeof orders[number]) {
    const res = await fetch("/api/houses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exporter:          order.consignor,
        importer:          order.consignee,
        goods_description: order.service_code ?? null,
        gross_weight:      order.gross_weight ? String(order.gross_weight) : null,
        packages:          order.packages ? String(order.packages) : null,
        customs_status:    order.customs_status === "Cleared" ? "cleared" : "pending",
        tms_order_id:      order.id,
        source:            "tms",
      }),
    });
    if (res.ok) {
      const house = await res.json();
      await fetch(`/api/tms/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digitoll_id: house.state_id }),
      });
      load();
    }
  }

  async function toggleTripLink(orderId: string, tripId: string) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const already = order.trip_ids.includes(tripId);
    const newTripIds = already ? order.trip_ids.filter(t => t !== tripId) : [...order.trip_ids, tripId];
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, trip_ids: newTripIds } : o));
    await fetch(`/api/tms/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trip_ids: newTripIds }),
    });
  }

  const statusColor = (s: string) => s === "Cleared" ? { bg: "#ECFDF3", color: "#027A48" } : s === "Pending" ? { bg: "#FFFAEB", color: "#B54708" } : { bg: "#F2F4F7", color: "#667085" };
  const depColor = (s: string) => s === "Delayed" ? { bg: "#FEF3F2", color: "#B42318" } : { bg: "#ECFDF3", color: "#027A48" };

  const linkingOrder = linkModal ? orders.find(o => o.id === linkModal.orderId) : null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        .order-checkbox { opacity: 0; transition: opacity 0.1s; }
        .order-checkbox.checked { opacity: 1 !important; }
        tr:hover .order-checkbox { opacity: 1; }
        .select-all-th:hover .order-checkbox { opacity: 1; }
      `}</style>

      {/* Create modal */}
      {createModal && (
        <div onClick={() => setCreateModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 360, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>Create Orders</div>
              <button onClick={() => setCreateModal(false)} style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 16, color: "#667085", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ padding: "20px" }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#344054", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>Number of orders to create</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => setCreateCount(c => Math.max(1, c - 1))} style={{ width: 32, height: 32, borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#344054" }}>−</button>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#101828", minWidth: 32, textAlign: "center" as const }}>{createCount}</span>
                <button onClick={() => setCreateCount(c => Math.min(50, c + 1))} style={{ width: 32, height: 32, borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#344054" }}>+</button>
              </div>
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setCreateModal(false)} style={{ padding: "7px 16px", borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", color: "#344054" }}>Cancel</button>
              <button onClick={createOrders} style={{ padding: "7px 16px", borderRadius: 2, border: "none", background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Create {createCount} order{createCount !== 1 ? "s" : ""}</button>
            </div>
          </div>
        </div>
      )}

      {/* Link modal */}
      {linkModal && linkingOrder && (
        <div onClick={() => setLinkModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 740, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#003160", letterSpacing: ".04em", textTransform: "uppercase" as const }}>{h}</th>
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
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 2 }}>
            <button onClick={deleteSelected} disabled={selectedRows.size === 0} title="Delete selected" style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: selectedRows.size > 0 ? "pointer" : "default", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", opacity: selectedRows.size > 0 ? 1 : 0.4 }}>
              <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#003160", lineHeight: 1 }}>delete_forever</span>
            </button>
            {[
              { icon: "≡", title: "Group" },
              { icon: "↺", title: "Refresh", onClick: load },
              { icon: "⊟", title: "Filter" },
            ].map(({ icon, title, onClick }: { icon: string; title: string; onClick?: () => void }) => (
              <button key={title} title={title} onClick={onClick} style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: "pointer", borderRadius: 2, color: "#003160", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>
                {icon}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 1, background: "#E4E7EC", margin: "0 -20px 10px" }} />
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff" }}>
            <span style={{ fontFamily: "Material Icons", fontSize: 18, color: "#98A2B3", lineHeight: 1, userSelect: "none" as const }}>search</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..." style={{ border: "none", outline: "none", fontSize: 13, color: "#344054", fontFamily: "inherit", width: "100%", background: "transparent" }} />
            {search && <button onClick={() => setSearch("")} style={{ border: "none", background: "transparent", color: "#98A2B3", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>✕</button>}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: "#fff", borderBottom: "2px solid #E4E7EC" }}>
              <th style={{ width: 36, padding: "0 8px", textAlign: "center" as const }} className="select-all-th" onClick={() => selectedRows.size === filtered.length ? setSelectedRows(new Set()) : setSelectedRows(new Set(filtered.map(o => o.id)))}>
                <div className={`order-checkbox${selectedRows.size > 0 ? " checked" : ""}`} style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${selectedRows.size > 0 ? "#446BF9" : "#D0D5DD"}`, background: selectedRows.size === filtered.length && filtered.length > 0 ? "#446BF9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", cursor: "pointer" }}>
                  {selectedRows.size === filtered.length && filtered.length > 0 && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                  {selectedRows.size > 0 && selectedRows.size < filtered.length && <span style={{ width: 6, height: 2, background: "#446BF9", display: "block", borderRadius: 1 }} />}
                </div>
              </th>
              {["Reference", "Tags", "Service", "Consignor", "Consignee", "Departure", "Arrival", "Customs", "Gross kg", "Packages", "Planning", "Dep. Status", "Trips", "Digitoll ID", ].map((h, i) => (
                <th key={i} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#003160", letterSpacing: ".04em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(order => {
              const cs = statusColor(order.customs_status);
              const ds = depColor(order.departure_status);
              const linkedTrips = trips.filter(t => order.trip_ids.includes(t.id));
              return (
                <tr key={order.id}
                  style={{ borderBottom: "1px solid #E4E7EC", background: selectedRows.has(order.id) ? "#EDF0F3" : "transparent" }}
                  onMouseEnter={e => { if (!selectedRows.has(order.id)) e.currentTarget.style.background = "#F9FAFB"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = selectedRows.has(order.id) ? "#EDF0F3" : "transparent"; }}
                >
                  <td style={{ padding: "0 8px", width: 36, textAlign: "center" as const }} onClick={() => toggleRow(order.id)}>
                    <div className={`order-checkbox${selectedRows.has(order.id) ? " checked" : ""}`} style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${selectedRows.has(order.id) ? "#446BF9" : "#D0D5DD"}`, background: selectedRows.has(order.id) ? "#446BF9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                      {selectedRows.has(order.id) && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                    </div>
                  </td>
                  <td style={{ padding: "9px 12px", fontWeight: 600, color: "#175CD3", cursor: "pointer" }} onClick={() => router.push(`/tms/orders/${order.id}`)}>{order.reference}</td>
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
                      : order.trip_ids.length === 0
                      ? <span style={{ fontSize: 11, color: "#98A2B3", fontStyle: "italic" as const }} title="Link order to a trip before sending to Digitoll">Requires a trip</span>
                      : <button onClick={() => sendToDigitoll(order)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 2, background: "transparent", color: "#446BF9", fontSize: 11.5, fontWeight: 600, border: "1px solid #446BF9", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>
                          → Digitoll
                        </button>
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
            {loading && <tr><td colSpan={15} style={{ padding: 40, textAlign: "center", color: "#98A2B3" }}>Loading...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={15} style={{ padding: 40, textAlign: "center", color: "#98A2B3" }}>No orders found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
