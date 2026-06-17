"use client";
import React, { useState, useEffect, useCallback } from "react";

interface Master { id: string; state_id: string | null; reference: string | null; transports?: { id: string; state_id: string | null; reference: string | null } | null; }
interface House {
  id: string;
  state_id: string | null;
  reference: string | null;
  master_id: string | null;
  exporter: string | null;
  importer: string | null;
  importer_org_no: string | null;
  goods_description: string | null;
  hs_code: string | null;
  gross_weight: string | null;
  net_weight: string | null;
  packages: string | null;
  country_origin: string | null;
  customs_status: string;
  tms_order_id: string | null;
  source: string;
  created_at: string;
  transport_id?: string | null;
  masters?: Master | null;
  transports?: { id: string; state_id: string | null; reference: string | null } | null;
}

const CUSTOMS_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  pending:  { label: "Pending",  bg: "#FFFAEB", color: "#B54708", dot: "#F79009" },
  cleared:  { label: "Cleared",  bg: "#ECFDF3", color: "#027A48", dot: "#12B76A" },
  held:     { label: "Held",     bg: "#FEF3F2", color: "#B42318", dot: "#F04438" },
  rejected: { label: "Rejected", bg: "#FEF3F2", color: "#B42318", dot: "#F04438" },
};

const SOURCE_CFG: Record<string, { label: string; bg: string; color: string }> = {
  manual:          { label: "Manual",     bg: "#F2F4F7", color: "#667085" },
  tms:             { label: "TMS",        bg: "#EFF8FF", color: "#175CD3" },
  document_reader: { label: "Doc Reader", bg: "#FFFAEB", color: "#B54708" },
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
function calcHouseStatus(h: House): string {
  const hasRequired = !!(h.goods_description && h.hs_code && h.gross_weight && h.exporter && h.importer);
  return hasRequired ? "ready" : "incomplete";
}

const COMPLETION_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  incomplete: { label: "Incomplete", bg: "#FEF3F2", color: "#B42318", dot: "#F04438" },
  ready:      { label: "Ready",      bg: "#ECFDF3", color: "#027A48", dot: "#12B76A" },
};

function CompletionPill({ house }: { house: House }) {
  const status = calcHouseStatus(house);
  const c = COMPLETION_CFG[status];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 2, fontSize: 11.5, fontWeight: 500, background: c.bg, color: c.color, whiteSpace: "nowrap" as const }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />{c.label}
  </span>;
}

function StatusPill({ status }: { status: string }) {
  const c = CUSTOMS_CFG[status] ?? { label: status, bg: "#F2F4F7", color: "#667085", dot: "#98A2B3" };
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 2, fontSize: 11.5, fontWeight: 500, background: c.bg, color: c.color, whiteSpace: "nowrap" as const }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />{c.label}
  </span>;
}

function SourceBadge({ source }: { source: string }) {
  const c = SOURCE_CFG[source] ?? SOURCE_CFG.manual;
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: 2, fontSize: 10, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" as const, background: c.bg, color: c.color, whiteSpace: "nowrap" as const }}>{c.label}</span>;
}

type ModalType = "new" | "edit" | "view" | null;
type Form = { reference: string; master_id: string; transport_id: string; create_transport: boolean; transport_mode: string; border_crossing: string; carrier: string; eta: string; exporter: string; importer: string; importer_org_no: string; goods_description: string; hs_code: string; gross_weight: string; net_weight: string; packages: string; country_origin: string; customs_status: string; };
const emptyForm: Form = { reference: "", master_id: "", transport_id: "", create_transport: false, transport_mode: "Road", border_crossing: "", carrier: "", eta: "", exporter: "", importer: "", importer_org_no: "", goods_description: "", hs_code: "", gross_weight: "", net_weight: "", packages: "", country_origin: "", customs_status: "pending" };

export default function HousePage() {
  const [records, setRecords]   = useState<House[]>([]);
  const [masters, setMasters]   = useState<Master[]>([]);
  const [transports, setTransports] = useState<{id: string; state_id: string | null; reference: string | null}[]>([]);
  const [loading, setLoading]   = useState(true);
  const [quickView, setQuickView] = useState<{ type: string; id: string; label: string } | null>(null);
  const [hierarchyNodes, setHierarchyNodes] = useState<HNode[]>([]);

  function buildHouseHierarchy(r: House) {
    const nodes: HNode[] = [];
    if (r.masters?.transports) {
      nodes.push({ type: "transport", id: r.masters.transports.id, label: r.masters.transports.state_id ?? "Transport", status: "incomplete", active: false });
    } else if (r.transports) {
      nodes.push({ type: "transport", id: r.transports.id, label: r.transports.state_id ?? "Transport", status: "incomplete", active: false });
    }
    if (r.masters) {
      nodes.push({ type: "master", id: r.masters.id, label: r.masters.state_id ?? "Master", status: "incomplete", active: false });
    }
    nodes.push({ type: "house", id: r.id, label: r.state_id ?? "House", status: calcHouseStatus(r), active: true });
    setHierarchyNodes(nodes);
  }
  const [filter, setFilter]     = useState("all");
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal]       = useState<ModalType>(null);
  const [active, setActive]     = useState<House | null>(null);
  const [form, setForm]         = useState<Form>(emptyForm);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [h, m, t] = await Promise.all([fetch("/api/houses").then(r => r.json()), fetch("/api/masters").then(r => r.json()), fetch("/api/transports").then(r => r.json())]);
    if (Array.isArray(h)) setRecords(h);
    if (Array.isArray(m)) setMasters(m);
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
    if (filter === "pending")  return r.customs_status === "pending";
    if (filter === "cleared")  return r.customs_status === "cleared";
    if (filter === "linked")   return !!r.master_id;
    if (filter === "unlinked") return !r.master_id;
    if (filter === "tms")      return r.source === "tms";
    return true;
  });

  const counts = { all: records.length, pending: records.filter(r => r.customs_status === "pending").length, cleared: records.filter(r => r.customs_status === "cleared").length, linked: records.filter(r => !!r.master_id).length, unlinked: records.filter(r => !r.master_id).length, tms: records.filter(r => r.source === "tms").length };

  function toggleRow(id: string) { setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  async function deleteSelected() {
    if (selected.size === 0) return;
    await Promise.all([...selected].map(id => fetch(`/api/houses/${id}`, { method: "DELETE" })));
    setSelected(new Set()); load();
  }

  function openNew() { setForm(emptyForm); setActive(null); setModal("new"); }
  function openEdit(r: House) { setForm({ reference: r.reference ?? "", master_id: r.master_id ?? "", transport_id: "", create_transport: false, transport_mode: "Road", border_crossing: "", carrier: "", eta: "", exporter: r.exporter ?? "", importer: r.importer ?? "", importer_org_no: r.importer_org_no ?? "", goods_description: r.goods_description ?? "", hs_code: r.hs_code ?? "", gross_weight: r.gross_weight ?? "", net_weight: r.net_weight ?? "", packages: r.packages ?? "", country_origin: r.country_origin ?? "", customs_status: r.customs_status }); setActive(r); setModal("edit"); buildHouseHierarchy(r); }
  function openView(r: House) { setActive(r); setModal("view"); buildHouseHierarchy(r); }

  async function save() {
    setSaving(true);
    let masterId = form.master_id || null;
    let directTransportId: string | null = null;

    if (form.create_transport) {
      // Skapa Transport direkt — ingen Master
      const trRes = await fetch("/api/transports", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transport_mode: form.transport_mode || "Road", border_crossing: form.border_crossing || null, carrier: form.carrier || null, eta: form.eta || null, status: "incomplete", source: "manual" }),
      });
      if (trRes.ok) { const t = await trRes.json(); directTransportId = t.id; }
    } else if (form.transport_id && !form.master_id) {
      directTransportId = form.transport_id;
    }

    const body = {
      reference:         form.reference || null,
      master_id:         masterId,
      transport_id:      masterId ? null : directTransportId,
      exporter:          form.exporter || null,
      importer:          form.importer || null,
      importer_org_no:   form.importer_org_no || null,
      goods_description: form.goods_description || null,
      hs_code:           form.hs_code || null,
      gross_weight:      form.gross_weight || null,
      net_weight:        form.net_weight || null,
      packages:          form.packages || null,
      country_origin:    form.country_origin || null,
      customs_status:    form.customs_status,
      ...(modal === "new" ? { source: "manual" } : {}),
    };

    if (modal === "new") {
      await fetch("/api/houses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else if (active) {
      await fetch(`/api/houses/${active.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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

  const houseFormJSX = (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Linking */}
      <div style={{ fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em", paddingBottom: 6, borderBottom: "1px solid #F2F4F7" }}>Hierarchy</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#344054", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>Link to Master</label>
          <select style={inp} value={form.master_id} onChange={e => setForm(f => ({ ...f, master_id: e.target.value, transport_id: "", create_transport: false }))}>
            <option value="">— Not linked —</option>
            {masters.map(m => <option key={m.id} value={m.id}>{m.state_id ?? m.reference ?? m.id.slice(0, 8)}{m.transports ? ` (${m.transports.state_id ?? ""})` : ""}</option>)}
          </select>
        </div>
        {!form.master_id && (
          <div>
            <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#344054", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>Or link to Transport</label>
            <select style={inp} value={form.transport_id} onChange={e => setForm(f => ({ ...f, transport_id: e.target.value, create_transport: false }))}>
              <option value="">— Select transport —</option>
              {transports.map(t => <option key={t.id} value={t.id}>{t.state_id ?? t.reference ?? t.id.slice(0, 8)}</option>)}
            </select>
          </div>
        )}
      </div>
      {!form.master_id && !form.transport_id && (
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12.5, color: "#344054" }}>
            <input type="checkbox" checked={form.create_transport} onChange={e => setForm(f => ({ ...f, create_transport: e.target.checked }))} />
            Create new Transport directly
          </label>
          {form.create_transport && (
            <div style={{ marginTop: 12, padding: "12px 14px", background: "#F9FAFB", border: "1px solid #E4E7EC", borderRadius: 2, display: "flex", flexDirection: "column" as const, gap: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>New Transport details</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#667085", marginBottom: 3, textTransform: "uppercase" as const }}>Transport mode</label>
                  <select style={inp} value={form.transport_mode ?? "Road"} onChange={e => setForm(f => ({ ...f, transport_mode: e.target.value }))}>
                    {["Road","Ship","Air","Rail"].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#667085", marginBottom: 3, textTransform: "uppercase" as const }}>Border crossing</label>
                  <select style={inp} value={form.border_crossing ?? ""} onChange={e => setForm(f => ({ ...f, border_crossing: e.target.value }))}>
                    <option value="">Select...</option>
                    {["Svinesund","Ørje","Magnor","Riksåsen","Bjørnefjell","Storlien","Treriksrøysa"].map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#667085", marginBottom: 3, textTransform: "uppercase" as const }}>Carrier / vehicle ref.</label>
                  <input style={inp} value={form.carrier ?? ""} onChange={e => setForm(f => ({ ...f, carrier: e.target.value }))} placeholder="ABC 123 456" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#667085", marginBottom: 3, textTransform: "uppercase" as const }}>ETA</label>
                  <input style={inp} type="datetime-local" value={form.eta ?? ""} onChange={e => setForm(f => ({ ...f, eta: e.target.value }))} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <div style={{ fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em", paddingBottom: 6, borderBottom: "1px solid #F2F4F7" }}>Parties</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><FL required>Exporter</FL><input style={inp} value={form.exporter} onChange={e => setForm(f => ({ ...f, exporter: e.target.value }))} placeholder="Company name" /></div>
        <div><FL required>Importer</FL><input style={inp} value={form.importer} onChange={e => setForm(f => ({ ...f, importer: e.target.value }))} placeholder="Company name" /></div>
      </div>
      <div><FL>Importer org. no.</FL><input style={inp} value={form.importer_org_no} onChange={e => setForm(f => ({ ...f, importer_org_no: e.target.value }))} placeholder="987654321" /></div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em", paddingBottom: 6, borderBottom: "1px solid #F2F4F7" }}>Goods</div>
      <div><FL>Goods description</FL><input style={inp} value={form.goods_description} onChange={e => setForm(f => ({ ...f, goods_description: e.target.value }))} placeholder="Automotive spare parts…" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div><FL>HS code</FL><input style={inp} value={form.hs_code} onChange={e => setForm(f => ({ ...f, hs_code: e.target.value }))} placeholder="8708.99.97" /></div>
        <div><FL>Country of origin</FL><input style={inp} value={form.country_origin} onChange={e => setForm(f => ({ ...f, country_origin: e.target.value }))} placeholder="DE" /></div>
        <div><FL>Packages</FL><input style={inp} value={form.packages} onChange={e => setForm(f => ({ ...f, packages: e.target.value }))} placeholder="24 cartons" /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><FL>Gross weight (kg)</FL><input style={inp} value={form.gross_weight} onChange={e => setForm(f => ({ ...f, gross_weight: e.target.value }))} placeholder="1240.00" /></div>
        <div><FL>Net weight (kg)</FL><input style={inp} value={form.net_weight} onChange={e => setForm(f => ({ ...f, net_weight: e.target.value }))} placeholder="1108.50" /></div>
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      <style>{`.digitoll-cb { opacity: 0; transition: opacity 0.1s; } .digitoll-cb.checked { opacity: 1 !important; } tr:hover .digitoll-cb { opacity: 1; } .select-all-th:hover .digitoll-cb { opacity: 1; }`}</style>


      {(modal === "new" || modal === "edit") && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 620, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 22px 14px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>{modal === "new" ? "New House" : `Edit House — ${active?.state_id ?? ""}`}</div>
              <button onClick={() => setModal(null)} style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 16, color: "#667085", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            {modal === "edit" && hierarchyNodes.length > 0 && (
              <HierarchyBar nodes={hierarchyNodes} onNavigate={n => { setModal(null); setTimeout(() => window.location.href = `/digitoll/${n.type}?open=${n.id}`, 50); }} />
            )}
            {houseFormJSX}
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
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 540, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 22px 12px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 2 }}>House</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#101828" }}>{active.state_id ?? active.reference ?? "—"}</div>
                {active.goods_description && <div style={{ fontSize: 12, color: "#667085", marginTop: 2 }}>{active.goods_description}</div>}
              </div>
              <button onClick={() => setModal(null)} style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 16, color: "#667085", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            {hierarchyNodes.length > 0 && <HierarchyBar nodes={hierarchyNodes} onNavigate={n => { setModal(null); setTimeout(() => window.location.href = `/digitoll/${n.type}?open=${n.id}`, 50); }} />}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px" }}>
              <DetailRow label="House No"          value={active.state_id} />
              <DetailRow label="Completion"        value={<CompletionPill house={active} />} />
              <DetailRow label="Customs status"    value={<StatusPill status={active.customs_status} />} />
              <DetailRow label="Exporter"          value={active.exporter} />
              <DetailRow label="Importer"          value={active.importer} />
              <DetailRow label="Importer org.no"   value={active.importer_org_no} />
              <DetailRow label="Goods"             value={active.goods_description} />
              <DetailRow label="HS code"           value={active.hs_code} />
              <DetailRow label="Country of origin" value={active.country_origin} />
              <DetailRow label="Gross weight"      value={active.gross_weight ? `${active.gross_weight} kg` : null} />
              <DetailRow label="Net weight"        value={active.net_weight ? `${active.net_weight} kg` : null} />
              <DetailRow label="Packages"          value={active.packages} />
              <DetailRow label="Source"            value={<SourceBadge source={active.source} />} />
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
          {([["all","All",counts.all],["pending","Pending",counts.pending],["cleared","Cleared",counts.cleared],["linked","Linked",counts.linked],["unlinked","Unlinked",counts.unlinked],["tms","From TMS",counts.tms]] as [string,string,number][]).map(([key,label,count]) => (
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search houses..." style={{ border: "none", outline: "none", fontSize: 13, color: "#344054", fontFamily: "inherit", width: "100%", background: "transparent" }} />
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
              {["House No","Master","Transport","Exporter","Importer","HS Code","Gross kg","Packages","Source","Completion","Customs",""].map((h, i) => (
                <th key={i} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#003160", letterSpacing: ".04em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={11} style={{ padding: 40, textAlign: "center", color: "#98A2B3" }}>Loading…</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={11} style={{ padding: 60, textAlign: "center", color: "#98A2B3" }}>
                <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500, color: "#667085" }}>No houses yet</div>
                <button onClick={openNew} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 2, background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ fontFamily: "Material Icons", fontSize: 16, lineHeight: 1 }}>add</span>New house
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
                  {r.masters
                    ? <RefBadge label={r.masters.state_id ?? r.masters.reference ?? "—"} color="#446BF9" bg="#EFF8FF"
                        onClick={() => setQuickView({ type: "master", id: r.masters!.id, label: r.masters!.state_id ?? r.masters!.reference ?? "—" })} />
                    : <span style={{ color: "#D0D5DD", fontSize: 11.5 }}>—</span>}
                </td>
                <td style={{ padding: "9px 12px" }}>
                  {r.masters?.transports
                    ? <RefBadge label={r.masters.transports.state_id ?? r.masters.transports.reference ?? "—"} color="#175CD3" bg="#EFF8FF"
                        onClick={() => setQuickView({ type: "transport", id: r.masters!.transports!.id, label: r.masters!.transports!.state_id ?? r.masters!.transports!.reference ?? "—" })} />
                    : r.transports
                    ? <RefBadge label={r.transports.state_id ?? r.transports.reference ?? "—"} color="#175CD3" bg="#EFF8FF"
                        onClick={() => setQuickView({ type: "transport", id: r.transports!.id, label: r.transports!.state_id ?? r.transports!.reference ?? "—" })} />
                    : <span style={{ color: "#D0D5DD", fontSize: 11.5 }}>—</span>}
                </td>
                <td style={{ padding: "9px 12px", color: "#344054" }}>{r.exporter ?? "—"}</td>
                <td style={{ padding: "9px 12px", color: "#344054" }}>{r.importer ?? "—"}</td>
                <td style={{ padding: "9px 12px", color: "#667085", fontSize: 12 }}>{r.hs_code ?? "—"}</td>
                <td style={{ padding: "9px 12px", color: "#667085", fontSize: 12 }}>{r.gross_weight ?? "—"}</td>
                <td style={{ padding: "9px 12px", color: "#667085", fontSize: 12 }}>{r.packages ?? "—"}</td>
                <td style={{ padding: "9px 12px" }}><SourceBadge source={r.source} /></td>
                <td style={{ padding: "9px 12px" }}><CompletionPill house={r} /></td>
                <td style={{ padding: "9px 12px" }}><StatusPill status={r.customs_status} /></td>
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
