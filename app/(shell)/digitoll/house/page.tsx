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
  masters?: Master | null;
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
type Form = { reference: string; master_id: string; exporter: string; importer: string; importer_org_no: string; goods_description: string; hs_code: string; gross_weight: string; net_weight: string; packages: string; country_origin: string; customs_status: string; };
const emptyForm: Form = { reference: "", master_id: "", exporter: "", importer: "", importer_org_no: "", goods_description: "", hs_code: "", gross_weight: "", net_weight: "", packages: "", country_origin: "", customs_status: "pending" };

export default function HousePage() {
  const [records, setRecords]   = useState<House[]>([]);
  const [masters, setMasters]   = useState<Master[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal]       = useState<ModalType>(null);
  const [active, setActive]     = useState<House | null>(null);
  const [form, setForm]         = useState<Form>(emptyForm);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [h, m] = await Promise.all([fetch("/api/houses").then(r => r.json()), fetch("/api/masters").then(r => r.json())]);
    if (Array.isArray(h)) setRecords(h);
    if (Array.isArray(m)) setMasters(m);
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
  function openEdit(r: House) { setForm({ reference: r.reference ?? "", master_id: r.master_id ?? "", exporter: r.exporter ?? "", importer: r.importer ?? "", importer_org_no: r.importer_org_no ?? "", goods_description: r.goods_description ?? "", hs_code: r.hs_code ?? "", gross_weight: r.gross_weight ?? "", net_weight: r.net_weight ?? "", packages: r.packages ?? "", country_origin: r.country_origin ?? "", customs_status: r.customs_status }); setActive(r); setModal("edit"); }
  function openView(r: House) { setActive(r); setModal("view"); }

  async function save() {
    setSaving(true);
    const body = { ...form, master_id: form.master_id || null };
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

  const ModalWrap = ({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) => (
    <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 620, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 22px 14px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: "#667085", marginTop: 3 }}>{subtitle}</div>}
          </div>
          <button onClick={() => setModal(null)} style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 16, color: "#667085", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );

  const FormBody = () => (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><FL>Reference</FL><input style={inp} value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Auto-generated if empty" /></div>
        <div><FL>Link to Master</FL>
          <select style={inp} value={form.master_id} onChange={e => setForm(f => ({ ...f, master_id: e.target.value }))}>
            <option value="">— Not linked —</option>
            {masters.map(m => <option key={m.id} value={m.id}>{m.state_id ?? m.reference ?? m.id.slice(0, 8)}{m.transports ? ` (${m.transports.state_id ?? ""})` : ""}</option>)}
          </select>
        </div>
      </div>
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div><FL>Gross weight (kg)</FL><input style={inp} value={form.gross_weight} onChange={e => setForm(f => ({ ...f, gross_weight: e.target.value }))} placeholder="1240.00" /></div>
        <div><FL>Net weight (kg)</FL><input style={inp} value={form.net_weight} onChange={e => setForm(f => ({ ...f, net_weight: e.target.value }))} placeholder="1108.50" /></div>
        <div><FL>Customs status</FL>
          <select style={inp} value={form.customs_status} onChange={e => setForm(f => ({ ...f, customs_status: e.target.value }))}>
            {Object.entries(CUSTOMS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>

      {(modal === "new" || modal === "edit") && (
        <ModalWrap title={modal === "new" ? "New House" : `Edit House — ${active?.state_id ?? ""}`}>
          <FormBody />
          <div style={{ padding: "12px 22px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setModal(null)} style={{ padding: "7px 16px", borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", color: "#344054" }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ padding: "7px 16px", borderRadius: 2, border: "none", background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : modal === "new" ? "Create" : "Save changes"}
            </button>
          </div>
        </ModalWrap>
      )}

      {modal === "view" && active && (
        <ModalWrap title={`House — ${active.state_id ?? active.reference ?? ""}`}>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
            <div style={{ marginBottom: 16 }}><StatusPill status={active.customs_status} /></div>
            <DetailRow label="State ID"         value={active.state_id} />
            <DetailRow label="Master"           value={active.masters ? <span style={{ fontWeight: 600, color: "#446BF9" }}>{active.masters.state_id ?? active.masters.reference}{active.masters.transports ? ` → ${active.masters.transports.state_id ?? ""}` : ""}</span> : <span style={{ color: "#98A2B3" }}>Not linked</span>} />
            <DetailRow label="Exporter"         value={active.exporter} />
            <DetailRow label="Importer"         value={active.importer} />
            <DetailRow label="Importer org.no"  value={active.importer_org_no} />
            <DetailRow label="Goods"            value={active.goods_description} />
            <DetailRow label="HS code"          value={active.hs_code} />
            <DetailRow label="Country of origin"value={active.country_origin} />
            <DetailRow label="Gross weight"     value={active.gross_weight ? `${active.gross_weight} kg` : null} />
            <DetailRow label="Net weight"       value={active.net_weight ? `${active.net_weight} kg` : null} />
            <DetailRow label="Packages"         value={active.packages} />
            <DetailRow label="Source"           value={<SourceBadge source={active.source} />} />
            <DetailRow label="TMS Order ID"     value={active.tms_order_id} />
          </div>
          <div style={{ padding: "12px 22px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setModal(null)} style={{ padding: "7px 16px", borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", color: "#344054" }}>Close</button>
            <button onClick={() => openEdit(active)} style={{ padding: "7px 16px", borderRadius: 2, border: "none", background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
          </div>
        </ModalWrap>
      )}

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
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${selected.size > 0 ? "#446BF9" : "#D0D5DD"}`, background: selected.size === filtered.length && filtered.length > 0 ? "#446BF9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", cursor: "pointer" }}>
                  {selected.size === filtered.length && filtered.length > 0 && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                  {selected.size > 0 && selected.size < filtered.length && <span style={{ width: 6, height: 2, background: "#446BF9", display: "block", borderRadius: 1 }} />}
                </div>
              </th>
              {["State ID","Master","Exporter","Importer","HS Code","Gross kg","Packages","Source","Status",""].map((h, i) => (
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
                  <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${selected.has(r.id) ? "#446BF9" : "#D0D5DD"}`, background: selected.has(r.id) ? "#446BF9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                    {selected.has(r.id) && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                  </div>
                </td>
                <td style={{ padding: "9px 12px", fontWeight: 700, color: "#003160" }}>{r.state_id ?? "—"}</td>
                <td style={{ padding: "9px 12px" }}>
                  {r.masters
                    ? <span style={{ fontSize: 11.5, fontWeight: 600, color: "#446BF9" }}>{r.masters.state_id ?? r.masters.reference}{r.masters.transports ? ` → ${r.masters.transports.state_id ?? ""}` : ""}</span>
                    : <span style={{ color: "#D0D5DD", fontSize: 11.5 }}>Not linked</span>}
                </td>
                <td style={{ padding: "9px 12px", color: "#344054" }}>{r.exporter ?? "—"}</td>
                <td style={{ padding: "9px 12px", color: "#344054" }}>{r.importer ?? "—"}</td>
                <td style={{ padding: "9px 12px", color: "#667085", fontSize: 12 }}>{r.hs_code ?? "—"}</td>
                <td style={{ padding: "9px 12px", color: "#667085", fontSize: 12 }}>{r.gross_weight ?? "—"}</td>
                <td style={{ padding: "9px 12px", color: "#667085", fontSize: 12 }}>{r.packages ?? "—"}</td>
                <td style={{ padding: "9px 12px" }}><SourceBadge source={r.source} /></td>
                <td style={{ padding: "9px 12px" }}><StatusPill status={r.customs_status} /></td>
                <td style={{ padding: "9px 8px" }}>
                  <button onClick={e => { e.stopPropagation(); openEdit(r); }}
                    style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#667085" }}
                    onMouseEnter={e => { (e.currentTarget.style.borderColor = "#446BF9"); (e.currentTarget.style.color = "#446BF9"); }}
                    onMouseLeave={e => { (e.currentTarget.style.borderColor = "#E4E7EC"); (e.currentTarget.style.color = "#667085"); }}>
                    <span style={{ fontFamily: "Material Icons", fontSize: 15, lineHeight: 1 }}>edit</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
