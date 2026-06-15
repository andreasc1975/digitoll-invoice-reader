"use client";
import { useState, useEffect, useCallback } from "react";

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





const fBtn = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 14px", height: 36, boxSizing: "border-box" as const, borderRadius: 2, border: "1px solid transparent", background: active ? "#003160" : "#D9DBE0", color: active ? "#fff" : "#003160", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const });

export default function TMSTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/tms/trips");
    if (res.ok) setTrips(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const [orders, setOrders] = useState<Order[]>([]);

  const loadOrders = useCallback(async () => {
    const res = await fetch("/api/tms/orders");
    if (res.ok) setOrders(await res.json());
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [linkModal, setLinkModal] = useState<{ tripId: string } | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [createCount, setCreateCount] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    function handleCreate() { setCreateModal(true); }
    window.addEventListener("digitoll:open-create-menu", handleCreate);
    return () => window.removeEventListener("digitoll:open-create-menu", handleCreate);
  }, []);

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

  async function createCms(trip: Trip) {
    const cmsId = `CMS-TR-${trip.reference.replace("TR-", "")}`;
    setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, cms_id: cmsId } : t));
    await fetch(`/api/tms/trips/${trip.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cms_id: cmsId }),
    });
  }

  const FROMS    = ["Gothenburg", "Stockholm", "Malmö", "Copenhagen", "Helsingborg", "Norrköping"];
  const TOS      = ["Oslo", "Bergen", "Trondheim", "Stavanger", "Kristiansand", "Drammen"];
  const RESOURCES = ["ABC123", "XYZ456", "DEF789", "GHI012", "JKL345", "MNO678"];
  const TAGS     = ["", "", "Express", "Priority", ""];
  const STATUSES = ["Dispatched", "Planned", "Planned", "Planned"];

  function generateTrip(): Trip {
    const id = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const dep = new Date(Date.now() + Math.random() * 14 * 86400000);
    const arr = new Date(dep.getTime() + (6 + Math.random() * 18) * 3600000);
    const num = Math.floor(6754 + Math.random() * 1000);
    const fromCity = FROMS[Math.floor(Math.random() * FROMS.length)];
    const toCity   = TOS[Math.floor(Math.random() * TOS.length)];
    const pkgs = Math.floor(4 + Math.random() * 30);
    return {
      id,
      reference: `TR-${num}`,
      tags: TAGS[Math.floor(Math.random() * TAGS.length)],
      status: "Active",
      departure: dep.toISOString().slice(0, 16).replace("T", " "),
      arrival: arr.toISOString().slice(0, 16).replace("T", " "),
      from: fromCity,
      to: toCity,
      trip_status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
      customs_status: Math.random() > 0.2 ? "Cleared" : "Pending",
      packages: pkgs,
      gross_weight: Math.floor(pkgs * 80 + Math.random() * 500),
      loading_meters: Math.round((1 + Math.random() * 8) * 10) / 10,
      resource: RESOURCES[Math.floor(Math.random() * RESOURCES.length)],
      order_ids: [],
      digitoll_id: null,
      cms_id: null,
    };
  }

  async function createTrips() {
    const newTrips = Array.from({ length: createCount }, generateTrip);
    await Promise.all(newTrips.map(t =>
      fetch("/api/tms/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(t),
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
      fetch(`/api/tms/trips/${id}`, { method: "DELETE" })
    ));
    setSelectedRows(new Set());
    load();
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

    // 1. Skapa Transport
    const trRes = await fetch("/api/transports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference:       trip.reference,
        transport_mode:  "Road",
        border_crossing: trip.to,
        eta:             new Date(trip.arrival).toISOString(),
        carrier:         trip.resource,
        status:          "incomplete",
        source:          "tms",
        tms_trip_ref:    trip.reference,
      }),
    });
    if (!trRes.ok) { setSending(null); return; }
    const transport = await trRes.json();

    // 2. Skapa Master länkat till Transport
    const masterRes = await fetch("/api/masters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transport_id: transport.id,
        status:       "incomplete",
        source:       "tms",
      }),
    });
    let masterId: string | null = null;
    if (masterRes.ok) {
      const master = await masterRes.json();
      masterId = master.id;
    }

    // 3. Skapa Houses för varje länkad order
    for (const order of linkedOrders) {
      const houseRes = await fetch("/api/houses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          master_id:      masterId,
          exporter:       order.consignor,
          importer:       order.consignee,
          gross_weight:   order.gross_weight ? String(order.gross_weight) : null,
          packages:       order.packages ? String(order.packages) : null,
          customs_status: order.customs_status === "Cleared" ? "cleared" : "pending",
          tms_order_id:   order.id,
          source:         "tms",
        }),
      });
      if (houseRes.ok) {
        const house = await houseRes.json();
        await fetch(`/api/tms/orders/${order.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ digitoll_id: house.state_id }),
        });
      }
    }

    // 4. Uppdatera trip med digitoll_id
    await fetch(`/api/tms/trips/${trip.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ digitoll_id: transport.state_id }),
    });
    setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, digitoll_id: transport.state_id } : t));
    setSending(null);
    load();
  }

  const tripStatusColor = (s: string) => s === "Dispatched" ? { bg: "#EFF8FF", color: "#175CD3" } : { bg: "#F9FAFB", color: "#667085" };
  const customsColor = (s: string) => s === "Cleared" ? { bg: "#ECFDF3", color: "#027A48" } : { bg: "#FFFAEB", color: "#B54708" };

  const linkingTrip = linkModal ? trips.find(t => t.id === linkModal.tripId) : null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        .trip-checkbox { opacity: 0; transition: opacity 0.1s; }
        .trip-checkbox.checked { opacity: 1 !important; }
        tr:hover .trip-checkbox { opacity: 1; }
        .select-all-th:hover .trip-checkbox { opacity: 1; }
      `}</style>

      {/* Create modal */}
      {createModal && (
        <div onClick={() => setCreateModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 360, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>Create Trips</div>
              <button onClick={() => setCreateModal(false)} style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 16, color: "#667085", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ padding: "20px" }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#344054", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>Number of trips to create</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => setCreateCount(c => Math.max(1, c - 1))} style={{ width: 32, height: 32, borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#344054" }}>−</button>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#101828", minWidth: 32, textAlign: "center" as const }}>{createCount}</span>
                <button onClick={() => setCreateCount(c => Math.min(50, c + 1))} style={{ width: 32, height: 32, borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#344054" }}>+</button>
              </div>
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setCreateModal(false)} style={{ padding: "7px 16px", borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", color: "#344054" }}>Cancel</button>
              <button onClick={createTrips} style={{ padding: "7px 16px", borderRadius: 2, border: "none", background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Create {createCount} trip{createCount !== 1 ? "s" : ""}</button>
            </div>
          </div>
        </div>
      )}

      {/* Link modal */}
      {linkModal && linkingTrip && (
        <div onClick={() => setLinkModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 780, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#003160", letterSpacing: ".04em", textTransform: "uppercase" as const }}>{h}</th>
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
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 2 }}>
            <button onClick={deleteSelected} disabled={selectedRows.size === 0} style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: selectedRows.size > 0 ? "pointer" : "default", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", opacity: selectedRows.size > 0 ? 1 : 0.4 }}>
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search trips..." style={{ border: "none", outline: "none", fontSize: 13, color: "#344054", fontFamily: "inherit", width: "100%", background: "transparent" }} />
            {search && <button onClick={() => setSearch("")} style={{ border: "none", background: "transparent", color: "#98A2B3", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>✕</button>}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: "#fff", borderBottom: "2px solid #E4E7EC" }}>
              <th style={{ width: 36, padding: "0 8px", textAlign: "center" as const }} className="select-all-th" onClick={() => selectedRows.size === filtered.length ? setSelectedRows(new Set()) : setSelectedRows(new Set(filtered.map(t => t.id)))}>
                <div className={`trip-checkbox${selectedRows.size > 0 ? " checked" : ""}`} style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${selectedRows.size > 0 ? "#446BF9" : "#D0D5DD"}`, background: selectedRows.size === filtered.length && filtered.length > 0 ? "#446BF9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", cursor: "pointer" }}>
                  {selectedRows.size === filtered.length && filtered.length > 0 && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                  {selectedRows.size > 0 && selectedRows.size < filtered.length && <span style={{ width: 6, height: 2, background: "#446BF9", display: "block", borderRadius: 1 }} />}
                </div>
              </th>
              {["Reference", "Tags", "From", "To", "Departure", "Arrival", "Trip Status", "Customs", "Orders", "Gross kg", "Load m", "Resource", "Digitoll ID", "CMS ID"].map((h, i) => (
                <th key={i} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#003160", letterSpacing: ".04em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(trip => {
              const ts = tripStatusColor(trip.trip_status);
              const cs = customsColor(trip.customs_status);
              const linkedOrders = orders.filter(o => trip.order_ids.includes(o.id));
              return (
                <tr key={trip.id}
                  style={{ borderBottom: "1px solid #E4E7EC", background: selectedRows.has(trip.id) ? "#EDF0F3" : "transparent" }}
                  onMouseEnter={e => { if (!selectedRows.has(trip.id)) e.currentTarget.style.background = "#F9FAFB"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = selectedRows.has(trip.id) ? "#EDF0F3" : "transparent"; }}
                >
                  <td style={{ padding: "0 8px", width: 36, textAlign: "center" as const }} onClick={() => toggleRow(trip.id)}>
                    <div className={`trip-checkbox${selectedRows.has(trip.id) ? " checked" : ""}`} style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${selectedRows.has(trip.id) ? "#446BF9" : "#D0D5DD"}`, background: selectedRows.has(trip.id) ? "#446BF9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                      {selectedRows.has(trip.id) && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                    </div>
                  </td>
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
            {loading && <tr><td colSpan={14} style={{ padding: 40, textAlign: "center", color: "#98A2B3" }}>Loading...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={14} style={{ padding: 40, textAlign: "center", color: "#98A2B3" }}>No trips found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
