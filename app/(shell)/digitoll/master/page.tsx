"use client";
import React, { useState, useEffect, useCallback } from "react";

interface Transport { id: string; state_id: string | null; reference: string | null; }
interface House {
  id: string;
  state_id: string | null;
  reference: string | null;
  customs_status: string;
  exporter: string | null;
  importer: string | null;
  goods_description: string | null;
  hs_code: string | null;
  gross_weight: string | null;
  packages: string | null;
  master_id: string | null;
}
interface Master {
  id: string;
  state_id: string | null;
  reference: string | null;
  transport_id: string | null;
  consignor: string | null;
  consignee: string | null;
  incoterm: string | null;
  incoterm_place: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  invoice_value: string | null;
  currency: string | null;
  gross_weight: string | null;
  net_weight: string | null;
  status: string;
  source: string;
  created_at: string;
  transports?: Transport | null;
  houses?: House[];
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  incomplete: { label: "Incomplete",    bg: "#FEF3F2", color: "#B42318", dot: "#F04438" },
  ready:      { label: "Ready",         bg: "#ECFDF3", color: "#027A48", dot: "#12B76A" },
  sent:       { label: "Sent",          bg: "#EFF8FF", color: "#175CD3", dot: "#2E90FA" },
  accepted:   { label: "Accepted",      bg: "#ECFDF3", color: "#027A48", dot: "#12B76A" },
  rejected:   { label: "Rejected",      bg: "#FEF3F2", color: "#B42318", dot: "#F04438" },
};

const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #D0D5DD", borderRadius: 2, fontSize: 12.5, color: "#101828", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const };
const fBtn = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 14px", height: 36, boxSizing: "border-box" as const, borderRadius: 2, border: "1px solid transparent", background: active ? "#003160" : "#D9DBE0", color: active ? "#fff" : "#003160", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const });

type HNode = { type: "transport" | "master" | "house"; id: string; label: string; status: string; active: boolean };

function statusDot(status: string): string {
  if (["ready","cleared","accepted","sent","received"].includes(status)) return "#12B76A";
  if (["held","rejected"].includes(status)) return "#F04438";
  return "#F79009";
}

function HierarchyBar({ nodes, onNavigate }: { nodes: HNode[]; onNavigate: (n: HNode) => void }) {
  const COLOR: Record<string, { bg: string; color: string; activeBg: string }> = {
    transport: { bg: "#EFF8FF", color: "#175CD3", activeBg: "#1570EF" },
    master:    { bg: "#EFF8FF", color: "#446BF9", activeBg: "#3054D4" },
    house:     { bg: "#F9F5FF", color: "#6941C6", activeBg: "#5925A8" },
  };
  const STATUS_LABEL: Record<string, string> = {
    ready: "Ready", incomplete: "Incomplete", sent: "Sent", received: "Received",
    accepted: "Accepted", rejected: "Rejected", arrived: "Arrived",
    pending: "Pending", cleared: "Cleared", held: "Held",
  };
  return (
    <div style={{ padding: "12px 20px", background: "#F8FAFC", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" as const }}>
      {nodes.map((n, i) => {
        const c = COLOR[n.type];
        const [hov, setHov] = React.useState(false);
        const dot = statusDot(n.status);
        const statusLabel = STATUS_LABEL[n.status] ?? n.status;
        return (
          <React.Fragment key={n.id}>
            {i > 0 && <span style={{ color: "#D0D5DD", fontSize: 14, fontWeight: 300, margin: "0 2px" }}>›</span>}
            <div style={{ position: "relative" as const }}>
              <button
                onClick={() => onNavigate(n)}
                onMouseEnter={() => setHov(true)}
                onMouseLeave={() => setHov(false)}
                title={`${n.type} · ${statusLabel}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 2,
                  border: n.active ? `2px solid ${c.color}` : "2px solid transparent",
                  background: hov ? c.activeBg : c.bg,
                  color: hov ? "#fff" : c.color,
                  fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  transition: "background 0.1s, color 0.1s",
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: hov ? "#fff" : dot, flexShrink: 0 }} />
                {n.label}
              </button>
              {/* Tooltip */}
              {hov && (
                <div style={{ position: "absolute" as const, bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "#101828", color: "#fff", fontSize: 11, fontWeight: 500, padding: "4px 8px", borderRadius: 2, whiteSpace: "nowrap" as const, pointerEvents: "none" as const, zIndex: 500 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                    {statusLabel}
                  </div>
                  <div style={{ position: "absolute" as const, top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "4px solid #101828" }} />
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function QuickViewModal({ type, id, label, onClose }: { type: string; id: string; label: string; onClose: () => void }) {
  const [data, setData] = React.useState<Record<string, unknown> | null>(null);
  const [nodes, setNodes] = React.useState<HNode[]>([]);

  React.useEffect(() => {
    const url = type === "transport" ? `/api/transports/${id}` : type === "master" ? `/api/masters/${id}` : `/api/houses/${id}`;
    fetch(url).then(r => r.json()).then((d: Record<string, unknown>) => {
      setData(d);
      buildHierarchy(type, d);
    });
  }, [type, id]);

  function calcStatus(type: string, d: Record<string, unknown>): string {
    if (type === "transport") {
      const s = d.status as string;
      if (["sent","received","accepted"].includes(s)) return s;
      if (d.ata) return "arrived";
      return (d.border_crossing && d.eta && d.transport_mode) ? "ready" : "incomplete";
    }
    if (type === "master") {
      return (d.consignor && d.consignee && d.invoice_number && d.invoice_value) ? "ready" : "incomplete";
    }
    return (d.goods_description && d.hs_code && d.gross_weight && d.exporter && d.importer) ? "ready" : "incomplete";
  }

  function buildHierarchy(t: string, d: Record<string, unknown>) {
    const ns: HNode[] = [];
    if (t === "transport") {
      ns.push({ type: "transport", id: id, label: (d.state_id as string) ?? label, status: calcStatus("transport", d), active: true });
      const masters = d.masters as Record<string, unknown>[] ?? [];
      masters.forEach(m => {
        ns.push({ type: "master", id: m.id as string, label: (m.state_id as string) ?? "Master", status: calcStatus("master", m), active: false });
        const houses = m.houses as Record<string, unknown>[] ?? [];
        houses.forEach(h => ns.push({ type: "house", id: h.id as string, label: (h.state_id as string) ?? "House", status: calcStatus("house", h), active: false }));
      });
    } else if (t === "master") {
      const tr = d.transports as Record<string, unknown> | null;
      if (tr) ns.push({ type: "transport", id: tr.id as string, label: (tr.state_id as string) ?? "Transport", status: calcStatus("transport", tr), active: false });
      ns.push({ type: "master", id: id, label: (d.state_id as string) ?? label, status: calcStatus("master", d), active: true });
      const houses = d.houses as Record<string, unknown>[] ?? [];
      houses.forEach(h => ns.push({ type: "house", id: h.id as string, label: (h.state_id as string) ?? "House", status: calcStatus("house", h), active: false }));
    } else {
      const master = d.masters as Record<string, unknown> | null;
      if (master) {
        const tr = master.transports as Record<string, unknown> | null;
        if (tr) ns.push({ type: "transport", id: tr.id as string, label: (tr.state_id as string) ?? "Transport", status: calcStatus("transport", tr), active: false });
        ns.push({ type: "master", id: master.id as string, label: (master.state_id as string) ?? "Master", status: calcStatus("master", master), active: false });
      } else if ((d.transport_id || d.transports)) {
        const tr = d.transports as Record<string, unknown> | null;
        if (tr) ns.push({ type: "transport", id: tr.id as string, label: (tr.state_id as string) ?? "Transport", status: calcStatus("transport", tr), active: false });
      }
      ns.push({ type: "house", id: id, label: (d.state_id as string) ?? label, status: calcStatus("house", d), active: true });
    }
    setNodes(ns);
  }

  function handleNavigate(n: HNode) {
    const routes: Record<string, string> = { transport: "/digitoll/transport", master: "/digitoll/master", house: "/digitoll/house" };
    window.location.href = routes[n.type] + `?open=${n.id}`;
  }

  const rows: [string, unknown][] = data ? Object.entries(data).filter(([k]) =>
    !["id","created_at","updated_at","transport_id","master_id","houses","masters","transports"].includes(k)
    && data[k] !== null && data[k] !== undefined && typeof data[k] !== "object"
  ) : [];

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 540, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 2 }}>{type}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#101828" }}>{label}</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 16, color: "#667085", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        {/* Hierarchy bar */}
        {nodes.length > 0 && <HierarchyBar nodes={nodes} onNavigate={handleNavigate} />}
        {/* Fields */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {!data ? (
            <div style={{ color: "#98A2B3", fontSize: 12, textAlign: "center", padding: "20px 0" }}>Loading…</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rows.map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".04em", minWidth: 140 }}>{k.replace(/_/g, " ")}</div>
                  <div style={{ fontSize: 12.5, color: "#101828" }}>{String(v)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Footer */}
        <div style={{ padding: "10px 20px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => handleNavigate({ type: type as "transport"|"master"|"house", id, label, status: "", active: true })}
            style={{ padding: "6px 16px", borderRadius: 2, border: "none", background: "#446BF9", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "Material Icons", fontSize: 14, lineHeight: 1 }}>open_in_new</span>
            Open & edit
          </button>
        </div>
      </div>
    </div>
  );
}

function RefBadge({ label, color, bg, onClick }: { label: string; color: string; bg: string; onClick: (e: React.MouseEvent) => void }) {
  const [hov, setHov] = React.useState(false);
  return (
    <span
      onClick={e => { e.stopPropagation(); onClick(e); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: 2, fontSize: 11, fontWeight: 600, background: hov ? color : bg, color: hov ? "#fff" : color, whiteSpace: "nowrap" as const, cursor: "pointer", transition: "background 0.1s, color 0.1s", userSelect: "none" as const }}
    >
      {label}
    </span>
  );
}
function calcMasterStatus(m: Master): string {
  const hasRequired = !!(m.consignor && m.consignee && m.invoice_number && m.invoice_value);
  const hasHouses = (m.houses?.length ?? 0) > 0;
  if (!hasRequired || !hasHouses) return "incomplete";
  const housesReady = m.houses!.every(h => calcHouseStatus(h) === "ready");
  if (housesReady) return "ready";
  return "incomplete";
}

function calcHouseStatus(h: { goods_description?: string | null; hs_code?: string | null; gross_weight?: string | null; exporter?: string | null; importer?: string | null }): string {
  const hasRequired = !!(h.goods_description && h.hs_code && h.gross_weight && h.exporter && h.importer);
  return hasRequired ? "ready" : "incomplete";
}

function StatusPill({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? { label: status, bg: "#F2F4F7", color: "#667085", dot: "#98A2B3" };
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 2, fontSize: 11.5, fontWeight: 500, background: c.bg, color: c.color, whiteSpace: "nowrap" as const }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />{c.label}
  </span>;
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}

type ModalType = "new" | "edit" | "view" | null;
type Form = { reference: string; transport_id: string; consignor: string; consignee: string; incoterm: string; incoterm_place: string; invoice_number: string; invoice_date: string; invoice_value: string; currency: string; gross_weight: string; net_weight: string; status: string; };
const emptyForm: Form = { reference: "", transport_id: "", consignor: "", consignee: "", incoterm: "", incoterm_place: "", invoice_number: "", invoice_date: "", invoice_value: "", currency: "EUR", gross_weight: "", net_weight: "", status: "incomplete" };

export default function MasterPage() {
  const [records, setRecords]       = useState<Master[]>([]);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState("all");
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [modal, setModal]           = useState<ModalType>(null);
  const [active, setActive]         = useState<Master | null>(null);
  const [form, setForm]             = useState<Form>(emptyForm);
  const [saving, setSaving]         = useState(false);

  const [masterHouses, setMasterHouses] = useState<House[]>([]);
  const [pendingHouses, setPendingHouses] = useState<House[]>([]);
  const [allHouses, setAllHouses]       = useState<House[]>([]);
  const [loadingHouses, setLoadingHouses] = useState(false);
  const [addingHouse, setAddingHouse]   = useState(false);
  const [newHouseForm, setNewHouseForm] = useState({ exporter: "", importer: "", goods_description: "", hs_code: "", gross_weight: "", packages: "", customs_status: "pending" });
  const [quickView, setQuickView]       = useState<{ type: string; id: string; label: string } | null>(null);
  const [hierarchyNodes, setHierarchyNodes] = useState<HNode[]>([]);

  function buildMasterHierarchy(r: Master) {
    const nodes: HNode[] = [];
    if (r.transports) {
      nodes.push({ type: "transport", id: r.transports.id, label: r.transports.state_id ?? r.transports.reference ?? "Transport", status: "incomplete", active: false });
    }
    nodes.push({ type: "master", id: r.id, label: r.state_id ?? r.reference ?? "Master", status: calcMasterStatus(r), active: true });
    (r.houses ?? []).forEach(h => {
      nodes.push({ type: "house", id: h.id, label: h.state_id ?? "House", status: h.customs_status ?? "pending", active: false });
    });
    setHierarchyNodes(nodes);
  }

  async function loadHousesForMaster(masterId: string) {
    setLoadingHouses(true);
    const [hRes, allRes] = await Promise.all([
      fetch(`/api/houses?master_id=${masterId}`),
      fetch("/api/houses"),
    ]);
    if (hRes.ok) {
      const all: House[] = await allRes.json();
      setAllHouses(all);
      setMasterHouses(all.filter(h => h.master_id === masterId));
    }
    setLoadingHouses(false);
  }

  async function removeHouseFromMaster(houseId: string) {
    await fetch(`/api/houses/${houseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ master_id: null }),
    });
    if (active) loadHousesForMaster(active.id);
  }

  async function addExistingHouse(houseId: string) {
    if (!active) return;
    await fetch(`/api/houses/${houseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ master_id: active.id }),
    });
    loadHousesForMaster(active.id);
  }

  async function createAndAddHouse() {
    if (!active) return;
    setSaving(true);
    await fetch("/api/houses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newHouseForm, master_id: active.id, source: "manual" }),
    });
    setAddingHouse(false);
    setNewHouseForm({ exporter: "", importer: "", goods_description: "", hs_code: "", gross_weight: "", packages: "", customs_status: "pending" });
    setSaving(false);
    loadHousesForMaster(active.id);
    load();
  }

  const load = useCallback(async () => {
    setLoading(true);
    const [m, t] = await Promise.all([fetch("/api/masters").then(r => r.json()), fetch("/api/transports").then(r => r.json())]);
    if (Array.isArray(m)) setRecords(m);
    if (Array.isArray(t)) setTransports(t);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    function handleCreate() { openNew(); }
    function handleDelete() { deleteSelected(); }
    window.addEventListener("digitoll:open-create-menu", handleCreate);
    window.addEventListener("digitoll:delete-selected", handleDelete);
    return () => { window.removeEventListener("digitoll:open-create-menu", handleCreate); window.removeEventListener("digitoll:delete-selected", handleDelete); };
  }, [selected]);

  useEffect(() => {
    const btn = document.getElementById("topbar-delete-btn");
    if (btn) btn.style.opacity = selected.size > 0 ? "1" : "0.5";
  }, [selected]);

  const filtered = records.filter(r => {
    if (search && !JSON.stringify(r).toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "incomplete") return calcMasterStatus(r) === "incomplete";
    if (filter === "ready")      return calcMasterStatus(r) === "ready";
    if (filter === "linked")     return !!r.transport_id;
    if (filter === "unlinked")   return !r.transport_id;
    return true;
  });

  const counts = { all: records.length, incomplete: records.filter(r => calcMasterStatus(r) === "incomplete").length, ready: records.filter(r => calcMasterStatus(r) === "ready").length, linked: records.filter(r => !!r.transport_id).length, unlinked: records.filter(r => !r.transport_id).length };

  function toggleRow(id: string) { setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  async function deleteSelected() {
    if (selected.size === 0) return;
    await Promise.all([...selected].map(id => fetch(`/api/masters/${id}`, { method: "DELETE" })));
    setSelected(new Set()); load();
  }

  function openNew() {
    setForm(emptyForm);
    setActive(null);
    setModal("new");
    setPendingHouses([]);
    setAddingHouse(false);
    setNewHouseForm({ exporter: "", importer: "", goods_description: "", hs_code: "", gross_weight: "", packages: "", customs_status: "pending" });
    // Ladda alla houses för "link existing"-dropdown
    fetch("/api/houses").then(r => r.json()).then(data => { if (Array.isArray(data)) setAllHouses(data); });
  }
  function openEdit(r: Master) {
    setForm({ reference: r.reference ?? "", transport_id: r.transport_id ?? "", consignor: r.consignor ?? "", consignee: r.consignee ?? "", incoterm: r.incoterm ?? "", incoterm_place: r.incoterm_place ?? "", invoice_number: r.invoice_number ?? "", invoice_date: r.invoice_date ?? "", invoice_value: r.invoice_value ?? "", currency: r.currency ?? "EUR", gross_weight: r.gross_weight ?? "", net_weight: r.net_weight ?? "", status: r.status });
    setActive(r);
    setModal("edit");
    setAddingHouse(false);
    setNewHouseForm({ exporter: "", importer: "", goods_description: "", hs_code: "", gross_weight: "", packages: "", customs_status: "pending" });
    loadHousesForMaster(r.id);
    buildMasterHierarchy(r);
  }
  function openView(r: Master) { setActive(r); setModal("view"); buildMasterHierarchy(r); loadHousesForMaster(r.id); }

  async function save() {
    setSaving(true);
    const body = { ...form, transport_id: form.transport_id || null };
    if (modal === "new") {
      const res = await fetch("/api/masters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setSaving(false);
      setModal(null);
      await load();
      if (res.ok) {
        const created = await res.json();
        // Koppla pendingHouses till den nya mastern
        await Promise.all(pendingHouses.map(h =>
          fetch(`/api/houses/${h.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ master_id: created.id }) })
        ));
        setPendingHouses([]);
        // Hämta full master med relationer
        const fullRes = await fetch(`/api/masters/${created.id}`);
        if (fullRes.ok) {
          const full = await fullRes.json();
          openEdit(full);
        }
      }
    } else if (active) {
      await fetch(`/api/masters/${active.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setSaving(false);
      setModal(null);
      load();
    }
  }

  const FL = ({ children, required }: { children: React.ReactNode; required?: boolean }) =>
    <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#344054", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>{children}{required && <span style={{ color: "#D92D20" }}> *</span>}</label>;

  const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) =>
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F2F4F7", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "#667085" }}>{label}</span>
      <span style={{ fontSize: 12.5, color: "#101828", fontWeight: 500 }}>{value ?? <span style={{ color: "#98A2B3" }}>—</span>}</span>
    </div>;

  const masterFormJSX = (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><FL>Reference</FL><input style={inp} value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Auto-generated if empty" /></div>
        <div><FL>Link to Transport</FL>
          <select style={inp} value={form.transport_id} onChange={e => setForm(f => ({ ...f, transport_id: e.target.value }))}>
            <option value="">— Not linked —</option>
            {transports.map(t => <option key={t.id} value={t.id}>{t.state_id ?? t.reference ?? t.id.slice(0, 8)}</option>)}
          </select>
        </div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em", paddingBottom: 6, borderBottom: "1px solid #F2F4F7" }}>Parties</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><FL required>Consignor (exporter)</FL><input style={inp} value={form.consignor} onChange={e => setForm(f => ({ ...f, consignor: e.target.value }))} placeholder="Company name" /></div>
        <div><FL required>Consignee (importer)</FL><input style={inp} value={form.consignee} onChange={e => setForm(f => ({ ...f, consignee: e.target.value }))} placeholder="Company name" /></div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em", paddingBottom: 6, borderBottom: "1px solid #F2F4F7" }}>Transport</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><FL>Incoterm</FL><input style={inp} value={form.incoterm} onChange={e => setForm(f => ({ ...f, incoterm: e.target.value }))} placeholder="DAP, FOB, CIF…" /></div>
        <div><FL>Incoterm place</FL><input style={inp} value={form.incoterm_place} onChange={e => setForm(f => ({ ...f, incoterm_place: e.target.value }))} placeholder="Oslo, Norway" /></div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em", paddingBottom: 6, borderBottom: "1px solid #F2F4F7" }}>Invoice & Value</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
        <div><FL>Invoice no.</FL><input style={inp} value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} placeholder="INV-2026-001" /></div>
        <div><FL>Invoice date</FL><input style={inp} type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} /></div>
        <div><FL>Invoice value</FL><input style={inp} value={form.invoice_value} onChange={e => setForm(f => ({ ...f, invoice_value: e.target.value }))} placeholder="12500.00" /></div>
        <div><FL>Currency</FL><input style={inp} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} placeholder="EUR" /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div><FL>Gross weight (kg)</FL><input style={inp} value={form.gross_weight} onChange={e => setForm(f => ({ ...f, gross_weight: e.target.value }))} placeholder="1240.00" /></div>
        <div><FL>Net weight (kg)</FL><input style={inp} value={form.net_weight} onChange={e => setForm(f => ({ ...f, net_weight: e.target.value }))} placeholder="1108.50" /></div>
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>

      {(modal === "new" || modal === "edit") && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: modal === "edit" ? 780 : 620, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "16px 22px 14px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>{modal === "new" ? "New Master" : `Master — ${active?.state_id ?? ""}`}</div>
                {modal === "edit" && active?.consignor && <div style={{ fontSize: 12, color: "#667085", marginTop: 2 }}>{active.consignor} → {active.consignee}</div>}
              </div>
              <button onClick={() => setModal(null)} style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 16, color: "#667085", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>

            {/* Hierarchy bar */}
            {modal === "edit" && hierarchyNodes.length > 0 && (
              <HierarchyBar nodes={hierarchyNodes} onNavigate={n => { setModal(null); setTimeout(() => window.location.href = `/digitoll/${n.type}?open=${n.id}`, 50); }} />
            )}

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {/* Form fields */}
              {masterFormJSX}

              {/* Houses section — always visible */}
              {(active || modal === "new") && (
                <div style={{ padding: "0 22px 20px", borderTop: "2px solid #E4E7EC" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>
                      Houses ({modal === "new" ? pendingHouses.length : masterHouses.length})
                      {modal === "new" && <span style={{ fontSize: 10, fontWeight: 400, color: "#98A2B3", marginLeft: 8 }}>— saved when master is created</span>}
                    </div>
                    <button onClick={() => setAddingHouse(v => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 2, border: "1px solid #446BF9", background: addingHouse ? "#EFF8FF" : "#fff", color: "#446BF9", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      <span style={{ fontFamily: "Material Icons", fontSize: 14, lineHeight: 1 }}>{addingHouse ? "close" : "add"}</span>
                      {addingHouse ? "Cancel" : "Add house"}
                    </button>
                  </div>

                  {/* Add house panel */}
                  {addingHouse && (
                    <div style={{ background: "#F9FAFB", border: "1px solid #E4E7EC", borderRadius: 2, padding: "14px 16px", marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 10 }}>New house</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <div><label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#667085", marginBottom: 3, textTransform: "uppercase" as const }}>Exporter</label><input style={inp} value={newHouseForm.exporter} onChange={e => setNewHouseForm(f => ({ ...f, exporter: e.target.value }))} placeholder="Company name" /></div>
                        <div><label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#667085", marginBottom: 3, textTransform: "uppercase" as const }}>Importer</label><input style={inp} value={newHouseForm.importer} onChange={e => setNewHouseForm(f => ({ ...f, importer: e.target.value }))} placeholder="Company name" /></div>
                        <div><label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#667085", marginBottom: 3, textTransform: "uppercase" as const }}>Goods description</label><input style={inp} value={newHouseForm.goods_description} onChange={e => setNewHouseForm(f => ({ ...f, goods_description: e.target.value }))} placeholder="Automotive spare parts…" /></div>
                        <div><label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#667085", marginBottom: 3, textTransform: "uppercase" as const }}>HS code</label><input style={inp} value={newHouseForm.hs_code} onChange={e => setNewHouseForm(f => ({ ...f, hs_code: e.target.value }))} placeholder="8708.30" /></div>
                        <div><label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#667085", marginBottom: 3, textTransform: "uppercase" as const }}>Gross weight (kg)</label><input style={inp} value={newHouseForm.gross_weight} onChange={e => setNewHouseForm(f => ({ ...f, gross_weight: e.target.value }))} placeholder="620.00" /></div>
                        <div><label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#667085", marginBottom: 3, textTransform: "uppercase" as const }}>Packages</label><input style={inp} value={newHouseForm.packages} onChange={e => setNewHouseForm(f => ({ ...f, packages: e.target.value }))} placeholder="24 st" /></div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        {/* Link existing unlinked house */}
                        {allHouses.filter(h => !h.master_id && !pendingHouses.find(p => p.id === h.id)).length > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 11.5, color: "#667085" }}>Or link existing:</span>
                            <select style={{ ...inp, width: "auto", fontSize: 11.5 }} onChange={e => {
                              if (!e.target.value) return;
                              const house = allHouses.find(h => h.id === e.target.value);
                              if (!house) return;
                              if (modal === "new") {
                                setPendingHouses(p => [...p, house]);
                                setAddingHouse(false);
                              } else {
                                addExistingHouse(e.target.value);
                                setAddingHouse(false);
                              }
                            }} defaultValue="">
                              <option value="">Select unlinked house…</option>
                              {allHouses.filter(h => !h.master_id && !pendingHouses.find(p => p.id === h.id)).map(h => (
                                <option key={h.id} value={h.id}>{h.state_id} — {h.goods_description ?? "No description"}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <button onClick={async () => {
                          if (modal === "new") {
                            // Skapa house och lägg i pending
                            const res = await fetch("/api/houses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...newHouseForm, source: "manual" }) });
                            if (res.ok) {
                              const h = await res.json();
                              setPendingHouses(p => [...p, h]);
                              setAddingHouse(false);
                              setNewHouseForm({ exporter: "", importer: "", goods_description: "", hs_code: "", gross_weight: "", packages: "", customs_status: "pending" });
                            }
                          } else {
                            await createAndAddHouse();
                          }
                        }} disabled={saving} style={{ marginLeft: "auto", padding: "7px 16px", borderRadius: 2, border: "none", background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
                          {saving ? "Creating…" : "Create & add"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* House list */}
                  {(() => {
                    const houses = modal === "new" ? pendingHouses : masterHouses;
                    if (modal === "edit" && loadingHouses) return <div style={{ padding: "16px 0", textAlign: "center", color: "#98A2B3", fontSize: 12 }}>Loading…</div>;
                    if (houses.length === 0) return <div style={{ padding: "16px 0", textAlign: "center", color: "#98A2B3", fontSize: 12 }}>No houses linked — click "Add house" to add one</div>;
                    return (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #E4E7EC" }}>
                            {["Master No", "Exporter", "Goods", "HS Code", "Gross kg", "Status", ""].map((h, i) => (
                              <th key={i} style={{ padding: "6px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#003160", letterSpacing: ".04em", textTransform: "uppercase" as const }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {houses.map((h: House) => {
                            const sc = ({ pending: { bg: "#FFFAEB", color: "#B54708" }, cleared: { bg: "#ECFDF3", color: "#027A48" }, held: { bg: "#FEF3F2", color: "#B42318" }, rejected: { bg: "#FEF3F2", color: "#B42318" } } as Record<string, {bg:string;color:string}>)[h.customs_status] ?? { bg: "#F2F4F7", color: "#667085" };
                            return (
                              <tr key={h.id} style={{ borderBottom: "1px solid #F2F4F7" }}>
                                <td style={{ padding: "7px 8px", fontWeight: 700, color: "#003160" }}>{h.state_id ?? "—"}</td>
                                <td style={{ padding: "7px 8px", color: "#344054" }}>{h.exporter ?? "—"}</td>
                                <td style={{ padding: "7px 8px", color: "#667085" }}>{h.goods_description ?? "—"}</td>
                                <td style={{ padding: "7px 8px", color: "#667085" }}>{h.hs_code ?? "—"}</td>
                                <td style={{ padding: "7px 8px", color: "#667085" }}>{h.gross_weight ?? "—"}</td>
                                <td style={{ padding: "7px 8px" }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: 2, fontSize: 10.5, fontWeight: 500, background: sc.bg, color: sc.color }}>{h.customs_status}</span>
                                </td>
                                <td style={{ padding: "7px 4px" }}>
                                  <button onClick={() => {
                                    if (modal === "new") setPendingHouses(p => p.filter(p2 => p2.id !== h.id));
                                    else removeHouseFromMaster(h.id);
                                  }} title="Remove"
                                    style={{ width: 24, height: 24, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#98A2B3" }}
                                    onMouseEnter={e => { (e.currentTarget.style.borderColor = "#FDA29B"); (e.currentTarget.style.color = "#B42318"); }}
                                    onMouseLeave={e => { (e.currentTarget.style.borderColor = "#E4E7EC"); (e.currentTarget.style.color = "#98A2B3"); }}>
                                    <span style={{ fontFamily: "Material Icons", fontSize: 13, lineHeight: 1 }}>link_off</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 22px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {modal === "edit" && active && <StatusPill status={calcMasterStatus(active)} />}
              <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                <button onClick={() => setModal(null)} style={{ padding: "7px 16px", borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", color: "#344054" }}>
                  {modal === "edit" ? "Close" : "Cancel"}
                </button>
                <button onClick={save} disabled={saving} style={{ padding: "7px 16px", borderRadius: 2, border: "none", background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Saving…" : modal === "new" ? "Create" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* View modal */}
      {modal === "view" && active && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 580, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 22px 12px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 2 }}>Master</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#101828" }}>{active.state_id ?? active.reference ?? "—"}</div>
                {active.consignor && <div style={{ fontSize: 12, color: "#667085", marginTop: 2 }}>{active.consignor} → {active.consignee}</div>}
              </div>
              <button onClick={() => setModal(null)} style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 16, color: "#667085", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            {hierarchyNodes.length > 0 && <HierarchyBar nodes={hierarchyNodes} onNavigate={n => { setModal(null); setTimeout(() => window.location.href = `/digitoll/${n.type}?open=${n.id}`, 50); }} />}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                <div>
                  <DetailRow label="Master No"     value={active.state_id} />
                  <DetailRow label="Transport"     value={active.transports ? <RefBadge label={active.transports.state_id ?? active.transports.reference ?? "—"} color="#175CD3" bg="#EFF8FF" onClick={() => setQuickView({ type: "transport", id: active.transports!.id, label: active.transports!.state_id ?? "—" })} /> : null} />
                  <DetailRow label="Consignor"     value={active.consignor} />
                  <DetailRow label="Consignee"     value={active.consignee} />
                  <DetailRow label="Incoterm"      value={active.incoterm ? `${active.incoterm} ${active.incoterm_place ?? ""}` : null} />
                </div>
                <div>
                  <DetailRow label="Invoice no."   value={active.invoice_number} />
                  <DetailRow label="Invoice date"  value={fmtDate(active.invoice_date)} />
                  <DetailRow label="Invoice value" value={active.invoice_value ? `${active.currency ?? ""} ${active.invoice_value}` : null} />
                  <DetailRow label="Gross weight"  value={active.gross_weight ? `${active.gross_weight} kg` : null} />
                  <DetailRow label="Net weight"    value={active.net_weight ? `${active.net_weight} kg` : null} />
                </div>
              </div>
              <DetailRow label="Status" value={<StatusPill status={calcMasterStatus(active)} />} />
              <DetailRow label="Houses" value={
                masterHouses.length > 0
                  ? <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                      {masterHouses.map(h => (
                        <RefBadge key={h.id} label={h.state_id ?? "—"} color="#6941C6" bg="#F9F5FF"
                          onClick={() => setQuickView({ type: "house", id: h.id, label: h.state_id ?? "—" })} />
                      ))}
                    </div>
                  : null
              } />
            </div>
            <div style={{ padding: "12px 22px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setModal(null)} style={{ padding: "7px 16px", borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", color: "#344054" }}>Close</button>
              <button onClick={() => openEdit(active)} style={{ padding: "7px 16px", borderRadius: 2, border: "none", background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {quickView && <QuickViewModal type={quickView.type} id={quickView.id} label={quickView.label} onClose={() => setQuickView(null)} />}

      {/* Filter bar */}
      <div style={{ padding: "14px 20px 0", background: "#fff", borderBottom: "1px solid #E4E7EC" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          {([["all","All",counts.all],["incomplete","Incomplete",counts.incomplete],["ready","Ready",counts.ready],["linked","Linked to Transport",counts.linked],["unlinked","Unlinked",counts.unlinked]] as [string,string,number][]).map(([key,label,count]) => (
            <button key={key} onClick={() => setFilter(key)} style={fBtn(filter === key)}>
              {label}<span style={{ background: filter === key ? "rgba(255,255,255,0.25)" : "#003160", color: "#fff", borderRadius: 2, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{count}</span>
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 2 }}>
            <button onClick={() => { if (selected.size > 0) deleteSelected(); }} style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: selected.size > 0 ? "pointer" : "default", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", opacity: selected.size > 0 ? 1 : 0.4 }}>
              <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#003160", lineHeight: 1 }}>delete_forever</span>
            </button>
            <button onClick={load} style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: "pointer", borderRadius: 2, color: "#003160", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>↺</button>
          </div>
        </div>
        <div style={{ height: 1, background: "#E4E7EC", margin: "0 -20px 10px" }} />
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", border: "1px solid #E4E7EC", borderRadius: 2 }}>
            <span style={{ fontFamily: "Material Icons", fontSize: 18, color: "#98A2B3", lineHeight: 1 }}>search</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search masters..." style={{ border: "none", outline: "none", fontSize: 13, color: "#344054", fontFamily: "inherit", width: "100%", background: "transparent" }} />
            {search && <button onClick={() => setSearch("")} style={{ border: "none", background: "transparent", color: "#98A2B3", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>✕</button>}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: "#fff", borderBottom: "2px solid #E4E7EC" }}>
              <th style={{ width: 36, padding: "0 8px", textAlign: "center" as const }} onClick={() => selected.size === filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map(r => r.id)))}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${selected.size > 0 ? "#446BF9" : "#D0D5DD"}`, background: selected.size === filtered.length && filtered.length > 0 ? "#446BF9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", cursor: "pointer" }}>
                  {selected.size === filtered.length && filtered.length > 0 && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                  {selected.size > 0 && selected.size < filtered.length && <span style={{ width: 6, height: 2, background: "#446BF9", display: "block", borderRadius: 1 }} />}
                </div>
              </th>
              {["Master No","Transport","Consignor","Consignee","Incoterm","Invoice","Value","Houses","Status",""].map((h, i) => (
                <th key={i} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#003160", letterSpacing: ".04em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={11} style={{ padding: 40, textAlign: "center", color: "#98A2B3" }}>Loading…</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={11} style={{ padding: 60, textAlign: "center", color: "#98A2B3" }}>
                <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500, color: "#667085" }}>No masters yet</div>
                <button onClick={openNew} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 2, background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ fontFamily: "Material Icons", fontSize: 16, lineHeight: 1 }}>add</span>New master
                </button>
              </td></tr>
            )}
            {filtered.map(r => (
              <tr key={r.id} onClick={() => openView(r)} style={{ borderBottom: "1px solid #E4E7EC", cursor: "pointer", background: selected.has(r.id) ? "#EDF0F3" : "transparent" }}
                onMouseEnter={e => { if (!selected.has(r.id)) e.currentTarget.style.background = "#F9FAFB"; }}
                onMouseLeave={e => { e.currentTarget.style.background = selected.has(r.id) ? "#EDF0F3" : "transparent"; }}>
                <td style={{ padding: "0 8px", width: 36, textAlign: "center" as const }} onClick={e => { e.stopPropagation(); toggleRow(r.id); }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${selected.has(r.id) ? "#446BF9" : "#D0D5DD"}`, background: selected.has(r.id) ? "#446BF9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                    {selected.has(r.id) && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                  </div>
                </td>
                <td style={{ padding: "9px 12px", fontWeight: 700, color: "#003160" }}>{r.state_id ?? "—"}</td>
                <td style={{ padding: "9px 12px" }}>
                  {r.transports
                    ? <RefBadge label={r.transports.state_id ?? r.transports.reference ?? "—"} color="#175CD3" bg="#EFF8FF"
                        onClick={() => setQuickView({ type: "transport", id: r.transports!.id, label: r.transports!.state_id ?? r.transports!.reference ?? "—" })} />
                    : <span style={{ color: "#D0D5DD", fontSize: 11.5 }}>Not linked</span>}
                </td>
                <td style={{ padding: "9px 12px", color: "#344054" }}>{r.consignor ?? "—"}</td>
                <td style={{ padding: "9px 12px", color: "#344054" }}>{r.consignee ?? "—"}</td>
                <td style={{ padding: "9px 12px", color: "#667085" }}>{r.incoterm ?? "—"}</td>
                <td style={{ padding: "9px 12px", color: "#667085", fontSize: 12 }}>{r.invoice_number ?? "—"}</td>
                <td style={{ padding: "9px 12px", color: "#667085", fontSize: 12 }}>{r.invoice_value ? `${r.currency ?? ""} ${r.invoice_value}` : "—"}</td>
                <td style={{ padding: "9px 12px", maxWidth: 180 }}>
                  {(() => {
                    const houses = r.houses ?? [];
                    if (houses.length === 0) return <span style={{ color: "#D0D5DD", fontSize: 12 }}>—</span>;
                    const MAX = 3;
                    const visible = houses.slice(0, MAX);
                    const hidden = houses.length - MAX;
                    return (
                      <div style={{ display: "flex", gap: 4, flexWrap: "nowrap" as const, alignItems: "center", overflow: "hidden" }}>
                        {visible.map(h => (
                          <RefBadge key={h.id} label={h.state_id ?? "—"} color="#6941C6" bg="#F9F5FF"
                            onClick={() => setQuickView({ type: "house", id: h.id, label: h.state_id ?? "—" })} />
                        ))}
                        {hidden > 0 && (
                          <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 6px", borderRadius: 2, fontSize: 10.5, fontWeight: 700, background: "#F2F4F7", color: "#667085", whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                            +{hidden}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td style={{ padding: "9px 12px" }}><StatusPill status={calcMasterStatus(r)} /></td>
                <td style={{ padding: "9px 8px", textAlign: "right" as const }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: 2 }}>
                    <button onClick={e => { e.stopPropagation(); openEdit(r); }}
                      style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#667085" }}
                      onMouseEnter={e => { (e.currentTarget.style.borderColor = "#446BF9"); (e.currentTarget.style.color = "#446BF9"); }}
                      onMouseLeave={e => { (e.currentTarget.style.borderColor = "#E4E7EC"); (e.currentTarget.style.color = "#667085"); }}>
                      <span style={{ fontFamily: "Material Icons", fontSize: 15, lineHeight: 1 }}>edit</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
