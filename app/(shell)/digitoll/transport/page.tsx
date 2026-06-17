"use client";
import React, { useState, useEffect, useCallback } from "react";

interface Transport {
  id: string;
  state_id: string | null;
  reference: string | null;
  transport_mode: string | null;
  carrier: string | null;
  border_crossing: string | null;
  eta: string | null;
  ata: string | null;
  status: string;
  source: string;
  tms_trip_ref: string | null;
  created_at: string;
  mrn?: string | null;
  submitted_at?: string | null;
  masters?: { id: string; state_id: string | null; reference: string | null; status: string; houses?: { id: string; state_id: string | null; goods_description: string | null; hs_code: string | null; gross_weight: string | null; exporter: string | null; importer: string | null; customs_status: string }[] }[];
}

const BORDER_CROSSINGS = ["Svinesund", "Ørje", "Magnor", "Riksåsen", "Bjørnefjell", "Storlien", "Treriksrøysa"];
const TRANSPORT_MODES  = ["Road", "Ship", "Air", "Rail"];

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  incomplete: { label: "Incomplete",      bg: "#FEF3F2", color: "#B42318", dot: "#F04438" },
  ready:      { label: "Ready to send",   bg: "#ECFDF3", color: "#027A48", dot: "#12B76A" },
  sent:       { label: "Sent",            bg: "#EFF8FF", color: "#175CD3", dot: "#2E90FA" },
  received:   { label: "Received",        bg: "#EFF8FF", color: "#175CD3", dot: "#2E90FA" },
  accepted:   { label: "Accepted",        bg: "#ECFDF3", color: "#027A48", dot: "#12B76A" },
  rejected:   { label: "Rejected",        bg: "#FEF3F2", color: "#B42318", dot: "#F04438" },
  arrived:    { label: "Arrived",         bg: "#F9F5FF", color: "#6941C6", dot: "#7F56D9" },
};

const SOURCE_CFG: Record<string, { label: string; bg: string; color: string }> = {
  manual:          { label: "Manual",      bg: "#F2F4F7", color: "#667085" },
  tms:             { label: "TMS",         bg: "#EFF8FF", color: "#175CD3" },
  document_reader: { label: "Doc Reader",  bg: "#FFFAEB", color: "#B54708" },
};

const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #D0D5DD", borderRadius: 2, fontSize: 12.5, color: "#101828", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const };
const fBtn = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 14px", height: 36, boxSizing: "border-box" as const, borderRadius: 2, border: "1px solid transparent", background: active ? "#003160" : "#D9DBE0", color: active ? "#fff" : "#003160", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const });

type QuickView = { type: string; id: string; label: string };

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

function calcTransportStatus(t: Transport): string {
  if (t.status === "sent" || t.status === "received" || t.status === "accepted") return t.status;
  if (t.ata) return "arrived";
  const hasRequired = !!(t.border_crossing && t.eta && t.transport_mode);
  const hasMasters = (t.masters?.length ?? 0) > 0;
  if (!hasRequired || !hasMasters) return "incomplete";
  return "ready";
}

function StatusPill({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? { label: status, bg: "#F2F4F7", color: "#667085", dot: "#98A2B3" };
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 2, fontSize: 11.5, fontWeight: 500, background: c.bg, color: c.color, whiteSpace: "nowrap" as const }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />{c.label}
  </span>;
}

function SourceBadge({ source }: { source: string }) {
  const c = SOURCE_CFG[source] ?? SOURCE_CFG.manual;
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: 2, fontSize: 10, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" as const, background: c.bg, color: c.color, whiteSpace: "nowrap" as const }}>{c.label}</span>;
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" }) + " " +
    new Date(s).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

function toDatetimeLocal(s: string | null) {
  if (!s) return "";
  return new Date(s).toISOString().slice(0, 16);
}

type ModalType = "new" | "edit" | "view" | null;
type Form = { reference: string; transport_mode: string; carrier: string; border_crossing: string; eta: string; status: string };
const emptyForm: Form = { reference: "", transport_mode: "Road", carrier: "", border_crossing: "", eta: "", status: "incomplete" };

export default function TransportPage() {
  const [records, setRecords]       = useState<Transport[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState("all");
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [modal, setModal]           = useState<ModalType>(null);
  const [active, setActive]         = useState<Transport | null>(null);
  const [form, setForm]             = useState<Form>(emptyForm);
  const [saving, setSaving]         = useState(false);

  const [submitTarget, setSubmitTarget] = useState<Transport | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [submitDone, setSubmitDone]     = useState<{ mrn: string; transport: Transport } | null>(null);
  const [quickView, setQuickView]       = useState<QuickView | null>(null);
  const [hierarchyNodes, setHierarchyNodes] = useState<HNode[]>([]);

  function buildTransportHierarchy(t: Transport) {
    const nodes: HNode[] = [];
    const tStatus = calcTransportStatus(t);
    nodes.push({ type: "transport", id: t.id, label: t.state_id ?? t.reference ?? "Transport", status: tStatus, active: true });
    (t.masters ?? []).forEach(m => {
      const mStatus = (m as Record<string, unknown>).consignor && (m as Record<string, unknown>).consignee ? "ready" : "incomplete";
      nodes.push({ type: "master", id: m.id, label: m.state_id ?? m.reference ?? "Master", status: mStatus as string, active: false });
    });
    setHierarchyNodes(nodes);
  }

  async function submitToDigitoll(t: Transport) {
    setSubmitting(true);
    // Simulera nätverksanrop 1.5s
    await new Promise(res => setTimeout(res, 1500));
    // Generera falskt MRN
    const mrn = `22NO${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    // Spara status + MRN på transport
    await fetch(`/api/transports/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent", mrn, submitted_at: new Date().toISOString() }),
    });
    setSubmitting(false);
    setSubmitTarget(null);
    setSubmitDone({ mrn, transport: t });
    load();
  }

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/transports");
    if (res.ok) setRecords(await res.json());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    function handleCreate() { openNew(); }
    function handleDelete() { deleteSelected(); }
    window.addEventListener("digitoll:open-create-menu", handleCreate);
    window.addEventListener("digitoll:delete-selected", handleDelete);
    return () => {
      window.removeEventListener("digitoll:open-create-menu", handleCreate);
      window.removeEventListener("digitoll:delete-selected", handleDelete);
    };
  }, [selected]);

  useEffect(() => {
    const btn = document.getElementById("topbar-delete-btn");
    if (btn) btn.style.opacity = selected.size > 0 ? "1" : "0.5";
  }, [selected]);

  const filtered = records.filter(r => {
    if (search && !JSON.stringify(r).toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "incomplete") return calcTransportStatus(r) === "incomplete";
    if (filter === "ready")      return calcTransportStatus(r) === "ready";
    if (filter === "sent")       return ["sent","received","accepted"].includes(r.status);
    if (filter === "tms")        return r.source === "tms";
    return true;
  });

  const counts = {
    all:        records.length,
    incomplete: records.filter(r => calcTransportStatus(r) === "incomplete").length,
    ready:      records.filter(r => calcTransportStatus(r) === "ready").length,
    sent:       records.filter(r => ["sent","received","accepted"].includes(r.status)).length,
    tms:        records.filter(r => r.source === "tms").length,
  };

  function toggleRow(id: string) {
    setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    await Promise.all([...selected].map(id => fetch(`/api/transports/${id}`, { method: "DELETE" })));
    setSelected(new Set()); load();
  }

  function openNew() { setForm(emptyForm); setActive(null); setModal("new"); setHierarchyNodes([]); }
  function openEdit(r: Transport) { setForm({ reference: r.reference ?? "", transport_mode: r.transport_mode ?? "Road", carrier: r.carrier ?? "", border_crossing: r.border_crossing ?? "", eta: toDatetimeLocal(r.eta), status: r.status }); setActive(r); setModal("edit"); buildTransportHierarchy(r); }
  function openView(r: Transport) { setActive(r); setModal("view"); buildTransportHierarchy(r); }

  async function save() {
    setSaving(true);
    const body = { ...form, eta: form.eta || null };
    if (modal === "new") {
      await fetch("/api/transports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else if (active) {
      await fetch(`/api/transports/${active.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false); setModal(null); load();
  }

  const FL = ({ children, required }: { children: React.ReactNode; required?: boolean }) =>
    <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#344054", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>{children}{required && <span style={{ color: "#D92D20" }}> *</span>}</label>;

  const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) =>
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F2F4F7", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "#667085" }}>{label}</span>
      <span style={{ fontSize: 12.5, color: "#101828", fontWeight: 500 }}>{value ?? <span style={{ color: "#98A2B3" }}>—</span>}</span>
    </div>;

  const modalFormJSX = (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><FL>Reference</FL><input style={inp} value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Auto-generated if empty" /></div>
        <div><FL required>Transport mode</FL>
          <select style={inp} value={form.transport_mode} onChange={e => setForm(f => ({ ...f, transport_mode: e.target.value }))}>
            {TRANSPORT_MODES.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><FL>Carrier / vehicle ref.</FL><input style={inp} value={form.carrier} onChange={e => setForm(f => ({ ...f, carrier: e.target.value }))} placeholder="ABC 123 456" /></div>
        <div><FL required>Border crossing</FL>
          <select style={inp} value={form.border_crossing} onChange={e => setForm(f => ({ ...f, border_crossing: e.target.value }))}>
            <option value="">Select...</option>
            {BORDER_CROSSINGS.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><FL required>ETA</FL><input style={inp} type="datetime-local" value={form.eta} onChange={e => setForm(f => ({ ...f, eta: e.target.value }))} /></div>
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      <style>{`.digitoll-cb { opacity: 0; transition: opacity 0.1s; } .digitoll-cb.checked { opacity: 1 !important; } tr:hover .digitoll-cb { opacity: 1; } .select-all-th:hover .digitoll-cb { opacity: 1; }`}</style>
      {(modal === "new" || modal === "edit") && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 520, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 22px 14px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>{modal === "new" ? "New Transport" : `Edit Transport — ${active?.state_id ?? ""}`}</div>
              <button onClick={() => setModal(null)} style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 16, color: "#667085", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            {modal === "edit" && hierarchyNodes.length > 0 && (
              <HierarchyBar nodes={hierarchyNodes} onNavigate={n => { setModal(null); setTimeout(() => window.location.href = `/digitoll/${n.type}?open=${n.id}`, 50); }} />
            )}
            {modalFormJSX}
            <div style={{ padding: "12px 22px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setModal(null)} style={{ padding: "7px 16px", borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", color: "#344054" }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ padding: "7px 16px", borderRadius: 2, border: "none", background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : modal === "new" ? "Create" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View modal */}
      {modal === "view" && active && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 520, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 22px 12px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 2 }}>Transport</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#101828" }}>{active.state_id ?? active.reference ?? "—"}</div>
              </div>
              <button onClick={() => setModal(null)} style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 16, color: "#667085", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            {hierarchyNodes.length > 0 && <HierarchyBar nodes={hierarchyNodes} onNavigate={n => { setModal(null); setTimeout(() => window.location.href = `/digitoll/${n.type}?open=${n.id}`, 50); }} />}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px", display: "flex", flexDirection: "column", gap: 0 }}>
              <DetailRow label="Transport No"    value={active.state_id} />
              <DetailRow label="Reference"       value={active.reference} />
              <DetailRow label="Mode"            value={active.transport_mode} />
              <DetailRow label="Carrier"         value={active.carrier} />
              <DetailRow label="Border crossing" value={active.border_crossing} />
              <DetailRow label="ETA"             value={fmtDate(active.eta)} />
              <DetailRow label="ATA"             value={fmtDate(active.ata)} />
              <DetailRow label="Source"          value={<SourceBadge source={active.source} />} />
              <DetailRow label="Status"          value={<StatusPill status={calcTransportStatus(active)} />} />
              {active.mrn && <DetailRow label="MRN" value={<span style={{ fontWeight: 700, letterSpacing: ".06em", color: "#003160" }}>{active.mrn}</span>} />}
              {active.submitted_at && <DetailRow label="Submitted" value={fmtDate(active.submitted_at)} />}
              <DetailRow label="Masters"         value={
                active.masters && active.masters.length > 0
                  ? <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                      {active.masters.map(m => (
                        <RefBadge key={m.id} label={m.state_id ?? m.reference ?? "—"} color="#175CD3" bg="#EFF8FF"
                          onClick={() => setQuickView({ type: "master", id: m.id, label: m.state_id ?? m.reference ?? "—" })} />
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

      {/* Filter bar */}
      <div style={{ padding: "14px 20px 0", background: "#fff", borderBottom: "1px solid #E4E7EC" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          {([["all","All",counts.all],["incomplete","Incomplete",counts.incomplete],["ready","Ready",counts.ready],["sent","Sent",counts.sent],["tms","From TMS",counts.tms]] as [string,string,number][]).map(([key,label,count]) => (
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transports..." style={{ border: "none", outline: "none", fontSize: 13, color: "#344054", fontFamily: "inherit", width: "100%", background: "transparent" }} />
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
              {["Transport No","Reference","Mode","Carrier","Border","ETA","Masters","Source","Status",""].map((h, i) => (
                <th key={i} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#003160", letterSpacing: ".04em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={11} style={{ padding: 40, textAlign: "center", color: "#98A2B3" }}>Loading…</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={11} style={{ padding: 60, textAlign: "center", color: "#98A2B3" }}>
                <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500, color: "#667085" }}>No transports yet</div>
                <button onClick={openNew} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 2, background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ fontFamily: "Material Icons", fontSize: 16, lineHeight: 1 }}>add</span>New transport
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
                <td style={{ padding: "9px 12px", color: "#344054" }}>{r.reference ?? "—"}</td>
                <td style={{ padding: "9px 12px", color: "#667085" }}>{r.transport_mode ?? "—"}</td>
                <td style={{ padding: "9px 12px", color: "#667085" }}>{r.carrier ?? "—"}</td>
                <td style={{ padding: "9px 12px", color: "#667085" }}>{r.border_crossing ?? "—"}</td>
                <td style={{ padding: "9px 12px", color: "#667085", fontSize: 12 }}>{fmtDate(r.eta)}</td>
                <td style={{ padding: "9px 12px" }}>
                  {r.masters && r.masters.length > 0
                    ? <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                        {r.masters.map(m => (
                          <RefBadge key={m.id} label={m.state_id ?? m.reference ?? "—"} color="#175CD3" bg="#EFF8FF"
                            onClick={() => setQuickView({ type: "master", id: m.id, label: m.state_id ?? m.reference ?? "—" })} />
                        ))}
                      </div>
                    : <span style={{ color: "#D0D5DD", fontSize: 12 }}>—</span>
                  }
                </td>
                <td style={{ padding: "9px 12px" }}><SourceBadge source={r.source} /></td>
                <td style={{ padding: "9px 12px" }}><StatusPill status={calcTransportStatus(r)} /></td>
                <td style={{ padding: "9px 8px", textAlign: "right" as const }}>
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", paddingRight: 2 }}>
                    {calcTransportStatus(r) === "ready" && (
                      <button onClick={e => { e.stopPropagation(); setSubmitTarget(r); }}
                        style={{ height: 28, padding: "0 10px", border: "none", borderRadius: 2, background: "#446BF9", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#fff", fontSize: 11.5, fontWeight: 700, fontFamily: "inherit" }}>
                        <span style={{ fontFamily: "Material Icons", fontSize: 14, lineHeight: 1 }}>send</span>
                        Submit
                      </button>
                    )}
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

      {/* Quick view modal for referenced records */}
      {quickView && (
        <QuickViewModal type={quickView.type} id={quickView.id} label={quickView.label} onClose={() => setQuickView(null)} />
      )}

      {/* Submit confirmation modal */}
      {submitTarget && (
        <div onClick={() => !submitting && setSubmitTarget(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 560, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 22px 14px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>Submit to Digitoll</div>
              {!submitting && <button onClick={() => setSubmitTarget(null)} style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 16, color: "#667085", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>}
            </div>
            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column" as const, gap: 16 }}>
              {/* Transport summary */}
              <div style={{ background: "#F9FAFB", border: "1px solid #E4E7EC", borderRadius: 2, padding: "12px 16px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 8 }}>Transport</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <div><div style={{ fontSize: 10, color: "#98A2B3", marginBottom: 2 }}>Transport No</div><div style={{ fontSize: 12.5, fontWeight: 600, color: "#101828" }}>{submitTarget.state_id}</div></div>
                  <div><div style={{ fontSize: 10, color: "#98A2B3", marginBottom: 2 }}>Border crossing</div><div style={{ fontSize: 12.5, fontWeight: 600, color: "#101828" }}>{submitTarget.border_crossing}</div></div>
                  <div><div style={{ fontSize: 10, color: "#98A2B3", marginBottom: 2 }}>ETA</div><div style={{ fontSize: 12.5, fontWeight: 600, color: "#101828" }}>{submitTarget.eta ? new Date(submitTarget.eta).toLocaleDateString("sv-SE") : "—"}</div></div>
                </div>
              </div>
              {/* Masters + Houses */}
              {submitTarget.masters && submitTarget.masters.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 8 }}>
                    {submitTarget.masters.length} Master{submitTarget.masters.length > 1 ? "s" : ""} · {submitTarget.masters.reduce((a, m) => a + (m.houses?.length ?? 0), 0)} Houses
                  </div>
                  {submitTarget.masters.map(m => (
                    <div key={m.id} style={{ marginBottom: 8, border: "1px solid #E4E7EC", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ padding: "8px 12px", background: "#F2F4F7", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#003160" }}>{m.state_id}</span>
                      </div>
                      {m.houses && m.houses.map(h => (
                        <div key={h.id} style={{ padding: "7px 12px", borderTop: "1px solid #F2F4F7", display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#446BF9", minWidth: 60 }}>{h.state_id}</span>
                          <span style={{ fontSize: 11, color: "#344054", flex: 1 }}>{h.goods_description ?? "—"}</span>
                          <span style={{ fontSize: 11, color: "#667085" }}>{h.hs_code ?? "—"}</span>
                          <span style={{ fontSize: 11, color: "#667085" }}>{h.gross_weight ? `${h.gross_weight} kg` : "—"}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {submitting && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", justifyContent: "center", color: "#446BF9", fontSize: 13, fontWeight: 500 }}>
                  <span style={{ fontFamily: "Material Icons", fontSize: 18, animation: "spin 1s linear infinite" }}>sync</span>
                  Submitting to Digitoll…
                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </div>
              )}
            </div>
            <div style={{ padding: "12px 22px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setSubmitTarget(null)} disabled={submitting} style={{ padding: "7px 16px", borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", color: "#344054", opacity: submitting ? 0.5 : 1 }}>Cancel</button>
              <button onClick={() => submitToDigitoll(submitTarget)} disabled={submitting} style={{ padding: "7px 16px", borderRadius: 2, border: "none", background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: submitting ? 0.7 : 1 }}>
                {submitting ? "Submitting…" : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit success modal */}
      {submitDone && (
        <div onClick={() => setSubmitDone(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 440, overflow: "hidden" }}>
            <div style={{ padding: "28px 28px 24px", display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 12, textAlign: "center" as const }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#ECFDF3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "Material Icons", fontSize: 26, color: "#027A48" }}>check_circle</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#101828" }}>Submitted to Digitoll</div>
              <div style={{ fontSize: 13, color: "#667085" }}>
                {submitDone.transport.state_id} has been submitted successfully.
              </div>
              <div style={{ background: "#F9FAFB", border: "1px solid #E4E7EC", borderRadius: 2, padding: "12px 20px", width: "100%" }}>
                <div style={{ fontSize: 10, color: "#98A2B3", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: ".06em" }}>MRN</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#003160", letterSpacing: ".08em" }}>{submitDone.mrn}</div>
              </div>
            </div>
            <div style={{ padding: "12px 22px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "center" }}>
              <button onClick={() => setSubmitDone(null)} style={{ padding: "7px 24px", borderRadius: 2, border: "none", background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
