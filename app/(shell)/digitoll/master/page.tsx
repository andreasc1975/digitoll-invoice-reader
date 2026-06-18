"use client";
import React, { useState, useEffect, useCallback } from "react";
import { HNode, HierarchyTable, nodesFromDetail, canSubmitNode } from "@/components/Hierarchy";
import { useDigitollSubmit } from "@/components/DigitollSubmit";

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
  tracking_number: string | null;
  customs_procedure: string | null;
  transport_equipment: string | null;
  loading_location: string | null;
  unloading_location: string | null;
}
interface Master {
  id: string;
  state_id: string | null;
  reference: string | null;
  transport_id: string | null;
  gross_weight: string | null;
  document_number: string | null;
  document_type: string | null;
  carrier_id: string | null;
  transport_equipment: string | null;
  loading_location: string | null;
  unloading_location: string | null;
  relevant_documents: string | null;
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

function QuickViewModal({ type, id, label, onClose }: { type: string; id: string; label: string; onClose: () => void }) {
  const [data, setData] = React.useState<Record<string, unknown> | null>(null);
  const [nodes, setNodes] = React.useState<HNode[]>([]);

  React.useEffect(() => {
    const url = type === "transport" ? `/api/transports/${id}` : type === "master" ? `/api/masters/${id}` : `/api/houses/${id}`;
    fetch(url).then(r => r.json()).then((d: Record<string, unknown>) => {
      setData(d);
      setNodes(nodesFromDetail(type, d));
    });
  }, [type, id]);

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
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 740, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 2 }}>{type}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#101828" }}>{label}</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 16, color: "#667085", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        {/* Hierarchy bar */}
        {nodes.length > 0 && <HierarchyTable nodes={nodes} onNavigate={handleNavigate} />}
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
  const hasRequired = !!(
    m.document_number && m.document_type &&
    m.gross_weight && m.transport_equipment && m.loading_location && m.unloading_location
  );
  if (!hasRequired) return "incomplete";
  return "ready";
}

function calcHouseStatus(h: House): string {
  const hasRequired = !!(
    h.goods_description && h.hs_code && h.gross_weight &&
    h.exporter && h.importer && h.tracking_number &&
    h.customs_procedure && h.transport_equipment &&
    h.loading_location && h.unloading_location
  );
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
type Form = {
  reference: string; transport_id: string;
  gross_weight: string; status: string;
  document_number: string; document_type: string; carrier_id: string;
  transport_equipment: string; loading_location: string; unloading_location: string; relevant_documents: string;
};
const emptyForm: Form = {
  reference: "", transport_id: "",
  gross_weight: "", status: "incomplete",
  document_number: "", document_type: "", carrier_id: "",
  transport_equipment: "", loading_location: "", unloading_location: "", relevant_documents: "",
};

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
    setHierarchyNodes(nodesFromDetail("master", r as unknown as Record<string, unknown>));
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
    try {
      const [mRes, tRes] = await Promise.all([fetch("/api/masters"), fetch("/api/transports")]);
      const [m, t] = await Promise.all([mRes.json(), tRes.json()]);
      if (Array.isArray(m)) setRecords(m);
      if (Array.isArray(t)) setTransports(t);
    } catch (e) {
      console.error("Failed to load masters/transports:", e);
    }
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
    fetch("/api/houses").then(r => r.ok ? r.json() : []).then(data => { if (Array.isArray(data)) setAllHouses(data); }).catch(() => {});
  }
  function openEdit(r: Master) {
    setForm({
      reference: r.reference ?? "", transport_id: r.transport_id ?? "",
      gross_weight: r.gross_weight ?? "", status: r.status,
      document_number: r.document_number ?? "", document_type: r.document_type ?? "",
      carrier_id: r.carrier_id ?? "", transport_equipment: r.transport_equipment ?? "",
      loading_location: r.loading_location ?? "", unloading_location: r.unloading_location ?? "",
      relevant_documents: r.relevant_documents ?? "",
    });
    setActive(r);
    setModal("edit");
    setAddingHouse(false);
    setNewHouseForm({ exporter: "", importer: "", goods_description: "", hs_code: "", gross_weight: "", packages: "", customs_status: "pending" });
    loadHousesForMaster(r.id);
    buildMasterHierarchy(r);
  }
  function openView(r: Master) { setActive(r); setModal("view"); buildMasterHierarchy(r); loadHousesForMaster(r.id); }

  async function refreshOpen() {
    await load();
    if (active) {
      const res = await fetch(`/api/masters/${active.id}`);
      if (res.ok) { const full = await res.json(); setActive(full); setHierarchyNodes(nodesFromDetail("master", full)); }
    }
  }

  const { onSubmitNodes, modals: submitModals } = useDigitollSubmit(hierarchyNodes, refreshOpen);

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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><FL>Gross weight (kg)</FL><input style={inp} value={form.gross_weight} onChange={e => setForm(f => ({ ...f, gross_weight: e.target.value }))} placeholder="1240.00" /></div>
      </div>

      {/* Consignment note */}
      <div style={{ fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em", paddingBottom: 6, borderBottom: "1px solid #F2F4F7" }}>Consignment note / Waybill</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div><FL required>Document number (waybill)</FL><input style={inp} value={form.document_number} onChange={e => setForm(f => ({ ...f, document_number: e.target.value }))} placeholder="12345678" /></div>
        <div><FL required>Document type</FL>
          <select style={inp} value={form.document_type} onChange={e => setForm(f => ({ ...f, document_type: e.target.value }))}>
            <option value="">Select…</option>
            <option value="740">Air waybill</option>
            <option value="741">Master air waybill</option>
            <option value="703">Bill of lading</option>
            <option value="704">Sea waybill</option>
            <option value="720">Road consignment note (CMR)</option>
            <option value="722">Rail consignment note (CIM)</option>
          </select>
        </div>
        <div><FL>Carrier ID (EORI)</FL><input style={inp} value={form.carrier_id} onChange={e => setForm(f => ({ ...f, carrier_id: e.target.value }))} placeholder="NO123456789" /></div>
      </div>

      {/* Locations & Equipment */}
      <div style={{ fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em", paddingBottom: 6, borderBottom: "1px solid #F2F4F7" }}>Locations & Equipment</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><FL required>Loading location</FL><input style={inp} value={form.loading_location} onChange={e => setForm(f => ({ ...f, loading_location: e.target.value }))} placeholder="e.g. Gothenburg port" /></div>
        <div><FL required>Unloading location</FL><input style={inp} value={form.unloading_location} onChange={e => setForm(f => ({ ...f, unloading_location: e.target.value }))} placeholder="e.g. Oslo terminal" /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><FL required>Transport equipment</FL><input style={inp} value={form.transport_equipment} onChange={e => setForm(f => ({ ...f, transport_equipment: e.target.value }))} placeholder="Container no., trailer reg…" /></div>
        <div><FL>Relevant documents</FL><input style={inp} value={form.relevant_documents} onChange={e => setForm(f => ({ ...f, relevant_documents: e.target.value }))} placeholder="e.g. INV-001, PACK-001" /></div>
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      <style>{`.digitoll-cb { opacity: 0; transition: opacity 0.1s; } .digitoll-cb.checked { opacity: 1 !important; } tr:hover .digitoll-cb { opacity: 1; } .select-all-th:hover .digitoll-cb { opacity: 1; }`}</style>


      {(modal === "new" || modal === "edit") && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 740, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "16px 22px 14px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>{modal === "new" ? "New Master" : `Master — ${active?.state_id ?? ""}`}</div>
              </div>
              <button onClick={() => setModal(null)} style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 16, color: "#667085", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>

            {/* Hierarchy bar */}
            {modal === "edit" && hierarchyNodes.length > 0 && (
              <HierarchyTable nodes={hierarchyNodes} onNavigate={n => { setModal(null); setTimeout(() => window.location.href = `/digitoll/${n.type}?open=${n.id}`, 50); }} onSubmit={onSubmitNodes} />
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
              {}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setModal(null)} style={{ padding: "7px 16px", borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", color: "#344054" }}>Close</button>
                <button onClick={() => active && openEdit(active)} style={{ padding: "7px 16px", borderRadius: 2, border: "none", background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {quickView && <QuickViewModal type={quickView.type} id={quickView.id} label={quickView.label} onClose={() => setQuickView(null)} />}

      {submitModals}

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
                <div className={`digitoll-cb${selected.size > 0 ? " checked" : ""}`} style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${selected.size > 0 ? "#446BF9" : "#D0D5DD"}`, background: selected.size === filtered.length && filtered.length > 0 ? "#446BF9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", cursor: "pointer" }}>
                  {selected.size === filtered.length && filtered.length > 0 && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                  {selected.size > 0 && selected.size < filtered.length && <span style={{ width: 6, height: 2, background: "#446BF9", display: "block", borderRadius: 1 }} />}
                </div>
              </th>
              {["Master No","Transport","Waybill No","Route","Houses","Status",""].map((h, i) => (
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
                  <div className={`digitoll-cb${selected.has(r.id) ? " checked" : ""}`} style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${selected.has(r.id) ? "#446BF9" : "#D0D5DD"}`, background: selected.has(r.id) ? "#446BF9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
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
                <td style={{ padding: "9px 12px", color: "#667085", fontSize: 12 }}>{r.document_number ?? <span style={{ color: "#D0D5DD" }}>—</span>}</td>
                <td style={{ padding: "9px 12px", color: "#667085", fontSize: 12 }}>
                  {r.loading_location && r.unloading_location
                    ? `${r.loading_location} → ${r.unloading_location}`
                    : <span style={{ color: "#D0D5DD" }}>—</span>}
                </td>
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
