"use client";
import { useState, useEffect, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
interface Transport {
  id: string;
  reference: string;
  border_crossing: string | null;
  transport_mode: string | null;
  eta: string | null;
  ata: string | null;
  carrier: string | null;
  responsible: string | null;
  actor: string | null;
  status: string;
  state_id: string | null;
  declaration_status: string;
  shipments?: Shipment[];
  created_at: string;
}

interface Shipment {
  id: string;
  reference: string;
  transport_id: string | null;
  border_crossing: string | null;
  eta: string | null;
  carrier: string | null;
  responsible: string | null;
  actor: string | null;
  status: string;
  state_id: string | null;
  declaration_status: string;
  own_transport: boolean;
  transports?: { reference: string } | null;
  created_at: string;
}

type RowType = { kind: "transport"; data: Transport } | { kind: "shipment"; data: Shipment };

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: "red" | "amber" | "green" | "blue"; tip: string }> = {
  incomplete:           { label: "Missing information",        color: "red",   tip: "Blocking error — required information is missing" },
  missing_shipments:    { label: "Missing shipments",          color: "amber", tip: "Transport is complete but has no linked shipments" },
  awaiting_shipments:   { label: "Awaiting shipments",         color: "amber", tip: "One or more linked shipments are incomplete" },
  ready:                { label: "Ready to send",              color: "green", tip: "All data complete — ready to submit to Norwegian Customs" },
  sent:                 { label: "Sent (awaiting confirmation)",color: "blue",  tip: "Submitted to Norwegian Customs — awaiting receipt" },
  received:             { label: "Received",                   color: "blue",  tip: "Received by Norwegian Customs and being processed" },
  accepted:             { label: "Accepted",                   color: "green", tip: "Approved by Norwegian Customs" },
  rejected:             { label: "Rejected",                   color: "red",   tip: "Rejected by Norwegian Customs — review required" },
  arrived:              { label: "Arrived",                    color: "blue",  tip: "Physically arrived — ATA recorded" },
  complete_unlinked:    { label: "Data complete",              color: "amber", tip: "Shipment data is complete but not linked to a transport" },
  complete_linked:      { label: "Data complete",              color: "green", tip: "Shipment is complete and linked to a transport" },
};

const DECL_CONFIG: Record<string, { label: string; cls: string }> = {
  none:      { label: "Not created", cls: "decl-none" },
  draft:     { label: "Draft",       cls: "decl-draft" },
  linked:    { label: "Linked",      cls: "decl-linked" },
  submitted: { label: "Submitted",   cls: "decl-sub" },
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

function StatusPill({ status, tooltip }: { status: string; tooltip?: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "blue" as const, tip: "" };
  const colorMap = {
    red:   { pill: "#FEF3F2", text: "#B42318", dot: "#F04438" },
    amber: { pill: "#FFFAEB", text: "#B54708", dot: "#F79009" },
    green: { pill: "#ECFDF3", text: "#027A48", dot: "#12B76A" },
    blue:  { pill: "#EFF8FF", text: "#175CD3", dot: "#2E90FA" },
  };
  const c = colorMap[cfg.color];
  return (
    <span title={tooltip ?? cfg.tip} style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 20, fontSize: 11.5, fontWeight: 500,
      background: c.pill, color: c.text, whiteSpace: "nowrap", cursor: "default",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function DeclBadge({ status }: { status: string }) {
  const cfg = DECL_CONFIG[status] ?? DECL_CONFIG.none;
  const bg: Record<string, string> = { "decl-none": "#F2F4F7", "decl-draft": "#FFFAEB", "decl-linked": "#ECFDF3", "decl-sub": "#EFF8FF" };
  const tx: Record<string, string> = { "decl-none": "#667085", "decl-draft": "#B54708", "decl-linked": "#027A48", "decl-sub": "#175CD3" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 500, background: bg[cfg.cls], color: tx[cfg.cls] }}>
      {cfg.label}
    </span>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, subtitle, children, footer }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string;
  children: React.ReactNode; footer: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: 560, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#101828", margin: 0, marginBottom: 3 }}>{title}</h3>
            {subtitle && <p style={{ fontSize: 12, color: "#667085", margin: 0 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: "1px solid #E4E7EC", borderRadius: 8, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#667085", flexShrink: 0, fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: "20px 22px" }}>{children}</div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end", gap: 8 }}>{footer}</div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DigitollStart() {
  const [transports, setTransports] = useState<Transport[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "detail-transport" | "detail-shipment" | "new-transport" | "new-shipment">(null);
  const [selected, setSelected] = useState<Transport | Shipment | null>(null);
  const [newForm, setNewForm] = useState({ reference: "", border_crossing: "", transport_mode: "Road", eta: "", carrier: "", responsible: "", actor: "", transport_id: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [tr, sh] = await Promise.all([
      fetch("/api/transports").then(r => r.json()),
      fetch("/api/shipments").then(r => r.json()),
    ]);
    if (Array.isArray(tr)) setTransports(tr);
    if (Array.isArray(sh)) setShipments(sh);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build combined rows
  const allRows: RowType[] = [
    ...transports.map(t => ({ kind: "transport" as const, data: t })),
    ...shipments.map(s => ({ kind: "shipment" as const, data: s })),
  ];

  const filteredRows = allRows.filter(row => {
    const d = row.data;
    if (search && !JSON.stringify(d).toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "active") return ["incomplete", "missing_shipments", "awaiting_shipments", "complete_unlinked"].includes(d.status);
    if (filter === "completed") return ["accepted", "arrived"].includes(d.status);
    if (filter === "transports") return row.kind === "transport";
    if (filter === "shipments") return row.kind === "shipment";
    return true;
  });

  const trRows = filteredRows.filter(r => r.kind === "transport");
  const shRows = filteredRows.filter(r => r.kind === "shipment");

  const activeCount = allRows.filter(r => ["incomplete", "missing_shipments", "awaiting_shipments", "complete_unlinked"].includes(r.data.status)).length;

  async function createTransport() {
    setSaving(true);
    const res = await fetch("/api/transports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newForm) });
    setSaving(false);
    if (res.ok) { setModal(null); load(); }
  }

  async function createShipment() {
    setSaving(true);
    const res = await fetch("/api/shipments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newForm) });
    setSaving(false);
    if (res.ok) { setModal(null); load(); }
  }

  function openDetail(row: RowType) {
    setSelected(row.data);
    setModal(row.kind === "transport" ? "detail-transport" : "detail-shipment");
  }

  function openNew(type: "transport" | "shipment") {
    setNewForm({ reference: "", border_crossing: "", transport_mode: "Road", eta: "", carrier: "", responsible: "", actor: "", transport_id: "" });
    setModal(type === "transport" ? "new-transport" : "new-shipment");
  }

  function nextAction(row: RowType) {
    const s = row.data.status;
    if (["incomplete", "complete_unlinked"].includes(s)) return row.kind === "transport" ? "Complete" : "Complete";
    if (s === "missing_shipments") return "Link shipments";
    if (s === "awaiting_shipments") return "Resolve issues";
    if (s === "ready") return row.kind === "transport" ? "Send transport" : "Send shipment";
    if (s === "rejected") return "Review errors";
    return "View";
  }

  const btnPri: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, background: "#0B1F3A", color: "#fff", fontSize: 12.5, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit" };
  const btnSec: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, background: "#fff", color: "#344054", fontSize: 12.5, fontWeight: 500, border: "1px solid #D0D5DD", cursor: "pointer", fontFamily: "inherit" };
  const fBtn = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 13px", borderRadius: 20, border: `1px solid ${active ? "#0B1F3A" : "#D0D5DD"}`, background: active ? "#0B1F3A" : "#fff", color: active ? "#fff" : "#344054", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" });
  const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #D0D5DD", borderRadius: 8, fontSize: 13, color: "#101828", fontFamily: "inherit", outline: "none" };

  function FieldLabel({ children }: { children: React.ReactNode }) {
    return <label style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "#344054", marginBottom: 5 }}>{children}</label>;
  }

  function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F2F4F7", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#667085" }}>{label}</span>
        <span style={{ fontSize: 12.5, color: "#101828", fontWeight: 500, textAlign: "right" }}>{value ?? <span style={{ color: "#98A2B3", fontWeight: 400 }}>—</span>}</span>
      </div>
    );
  }

  // Render a table section
  function TableSection({ rows, heading }: { rows: RowType[]; heading: string }) {
    if (rows.length === 0) return null;
    return (
      <>
        <tr>
          <td colSpan={13} style={{ background: "#F9FAFB", fontSize: 10, fontWeight: 700, color: "#98A2B3", padding: "5px 14px", letterSpacing: ".07em", textTransform: "uppercase" as const, borderBottom: "1px solid #E4E7EC" }}>{heading}</td>
        </tr>
        {rows.map((row, i) => {
          const d = row.data;
          const isTransport = row.kind === "transport";
          const next = nextAction(row);
          const isActionable = !["view", "View"].includes(next);
          const transport = row.kind === "shipment" ? (d as Shipment).transports : null;
          const transportDisplay = row.kind === "shipment"
            ? (d as Shipment).own_transport ? "Own transport"
              : transport ? `Incl. ${transport.reference}`
              : "Unlinked"
            : (d as Transport).transport_mode ?? "—";

          return (
            <tr key={d.id} onClick={() => openDetail(row)} style={{ borderBottom: "1px solid #F2F4F7", cursor: "pointer", transition: "background .1s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F9FAFB")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <td style={{ padding: "9px 14px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 20, borderRadius: 4, fontSize: 10, fontWeight: 700, background: isTransport ? "#EFF8FF" : "#ECFDF3", color: isTransport ? "#175CD3" : "#027A48" }}>
                  {isTransport ? "TR" : "SH"}
                </span>
              </td>
              <td style={{ padding: "9px 8px", fontWeight: 600, color: "#175CD3", fontSize: 12.5 }}>{d.state_id ?? "—"}</td>
              <td style={{ padding: "9px 8px", color: "#667085", fontSize: 12.5 }}>{d.reference}</td>
              <td style={{ padding: "9px 8px", color: "#98A2B3", fontSize: 12 }}>
                {isTransport ? (d as Transport).shipments?.length ?? 0 : "—"}
              </td>
              <td style={{ padding: "9px 8px", color: "#667085", fontSize: 11.5, whiteSpace: "nowrap" as const }}>
                {(d as Transport).ata ? "ATA " : "ETA "}{fmtDate((d as Transport).ata ?? d.eta)}
              </td>
              <td style={{ padding: "9px 8px", color: "#344054", fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, maxWidth: 100 }}>{d.actor ?? "—"}</td>
              <td style={{ padding: "9px 8px", color: "#98A2B3", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{d.responsible ?? "—"}</td>
              <td style={{ padding: "9px 8px", color: "#98A2B3", fontSize: 12 }}>{d.carrier ?? "—"}</td>
              <td style={{ padding: "9px 8px", color: "#344054", fontSize: 12.5 }}>{d.border_crossing ?? "—"}</td>
              <td style={{ padding: "9px 8px", color: "#667085", fontSize: 12.5, whiteSpace: "nowrap" as const }}>{transportDisplay}</td>
              <td style={{ padding: "9px 8px" }}><StatusPill status={d.status} /></td>
              <td style={{ padding: "9px 8px" }}>
                {isActionable ? (
                  <button onClick={e => { e.stopPropagation(); openDetail(row); }} style={{ ...btnPri, padding: "4px 10px", fontSize: 11.5, whiteSpace: "nowrap" as const }}>{next}</button>
                ) : (
                  <button onClick={e => { e.stopPropagation(); openDetail(row); }} style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 6, background: "transparent", color: "#175CD3", fontSize: 11.5, fontWeight: 500, border: "1px solid #B2CCFF", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>View</button>
                )}
              </td>
              <td style={{ padding: "9px 8px" }}><DeclBadge status={d.declaration_status} /></td>
              <td style={{ padding: "9px 4px" }}>
                <button onClick={e => { e.stopPropagation(); openDetail(row); }} style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", borderRadius: 5, color: "#98A2B3", fontSize: 18 }} aria-label="More">⋯</button>
              </td>
            </tr>
          );
        })}
      </>
    );
  }

  const selectedTransport = selected && modal === "detail-transport" ? selected as Transport : null;
  const selectedShipment  = selected && modal === "detail-shipment"  ? selected as Shipment  : null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, fontFamily: "'Inter', sans-serif" }}>
      {/* Filter bar */}
      <div style={{ padding: "14px 20px 0", background: "#F4F5F7" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {([["all", "All", allRows.length], ["active", "Active", activeCount], ["completed", "Completed", allRows.filter(r => ["accepted","arrived"].includes(r.data.status)).length], ["transports", "Transports", transports.length], ["shipments", "Shipments", shipments.length]] as [string, string, number][]).map(([key, label, count]) => (
            <button key={key} onClick={() => setFilter(key)} style={fBtn(filter === key)}>
              {label}
              <span style={{ background: filter === key ? "rgba(255,255,255,0.2)" : key === "active" && count > 0 ? "#FEE4E2" : "#F2F4F7", color: filter === key ? "#fff" : key === "active" && count > 0 ? "#B42318" : "#667085", borderRadius: 10, padding: "0 6px", fontSize: 10, fontWeight: 600 }}>{count}</span>
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", border: "1px solid #D0D5DD", borderRadius: 8, background: "#fff", width: 200 }}>
              <span style={{ fontSize: 16, color: "#98A2B3" }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ border: "none", outline: "none", fontSize: 12, color: "#344054", fontFamily: "inherit", width: "100%", background: "transparent" }} />
            </div>
            <button onClick={() => openNew("transport")} style={btnPri}>＋ New transport</button>
            <button onClick={() => openNew("shipment")} style={{ ...btnSec, border: "1px solid #B2CCFF", color: "#175CD3" }}>＋ New shipment</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
        <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 12.5 }}>
            <colgroup>
              <col style={{ width: 38 }} /><col style={{ width: 60 }} /><col style={{ width: 75 }} />
              <col style={{ width: 40 }} /><col style={{ width: 140 }} /><col style={{ width: 110 }} />
              <col style={{ width: 100 }} /><col style={{ width: 75 }} /><col style={{ width: 85 }} />
              <col style={{ width: 95 }} /><col style={{ width: 175 }} /><col style={{ width: 115 }} />
              <col style={{ width: 90 }} /><col style={{ width: 36 }} />
            </colgroup>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E4E7EC" }}>
                {["", "State", "ID", "SH", "Date", "Actor", "Responsible", "Carrier", "Border", "Transport", "Status", "Next step", "Declaration", ""].map((h, i) => (
                  <th key={i} style={{ padding: "9px 8px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#667085", letterSpacing: ".04em", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <TableSection rows={trRows} heading="Transports" />
              <TableSection rows={shRows} heading="Shipments" />
              {filteredRows.length === 0 && (
                <tr><td colSpan={13} style={{ padding: 40, textAlign: "center", color: "#98A2B3", fontSize: 13 }}>No records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail — Transport */}
      <Modal open={modal === "detail-transport"} onClose={() => setModal(null)}
        title={`Transport ${selectedTransport?.state_id ?? ""}`}
        subtitle={`${selectedTransport?.reference} · ${selectedTransport?.border_crossing ?? ""}`}
        footer={<><button style={btnSec} onClick={() => setModal(null)}>Close</button><button style={btnPri} onClick={() => setModal(null)}>{selectedTransport ? nextAction({ kind: "transport", data: selectedTransport }) : "View"}</button></>}>
        {selectedTransport && (
          <>
            <div style={{ marginBottom: 16 }}><StatusPill status={selectedTransport.status} /></div>
            <DetailField label="Reference" value={selectedTransport.reference} />
            <DetailField label="Border crossing" value={selectedTransport.border_crossing} />
            <DetailField label="Transport mode" value={selectedTransport.transport_mode} />
            <DetailField label="ETA" value={fmtDate(selectedTransport.eta)} />
            <DetailField label="Carrier" value={selectedTransport.carrier} />
            <DetailField label="Responsible" value={selectedTransport.responsible} />
            <DetailField label="Actor" value={selectedTransport.actor} />
            <DetailField label="Declaration" value={<DeclBadge status={selectedTransport.declaration_status} />} />
            <DetailField label="Linked shipments" value={selectedTransport.shipments?.length ?? 0} />
          </>
        )}
      </Modal>

      {/* Detail — Shipment */}
      <Modal open={modal === "detail-shipment"} onClose={() => setModal(null)}
        title={`Shipment ${selectedShipment?.state_id ?? ""}`}
        subtitle={`${selectedShipment?.reference}`}
        footer={<><button style={btnSec} onClick={() => setModal(null)}>Close</button><button style={btnPri} onClick={() => setModal(null)}>{selectedShipment ? nextAction({ kind: "shipment", data: selectedShipment }) : "View"}</button></>}>
        {selectedShipment && (
          <>
            <div style={{ marginBottom: 16 }}><StatusPill status={selectedShipment.status} /></div>
            <DetailField label="Reference" value={selectedShipment.reference} />
            <DetailField label="Border crossing" value={selectedShipment.border_crossing} />
            <DetailField label="Transport" value={selectedShipment.own_transport ? "Own transport" : selectedShipment.transports?.reference ?? "Unlinked"} />
            <DetailField label="ETA" value={fmtDate(selectedShipment.eta)} />
            <DetailField label="Carrier" value={selectedShipment.carrier} />
            <DetailField label="Actor" value={selectedShipment.actor} />
            <DetailField label="Declaration" value={<DeclBadge status={selectedShipment.declaration_status} />} />
          </>
        )}
      </Modal>

      {/* New Transport */}
      <Modal open={modal === "new-transport"} onClose={() => setModal(null)} title="New transport" subtitle="Create a new Digitoll transport declaration"
        footer={<><button style={btnSec} onClick={() => setModal(null)}>Cancel</button><button style={btnPri} onClick={createTransport} disabled={saving}>{saving ? "Saving…" : "Create transport"}</button></>}>
        <div style={{ display: "grid", gap: 14 }}>
          <div><FieldLabel>Transport reference *</FieldLabel><input style={inp} value={newForm.reference} onChange={e => setNewForm(f => ({ ...f, reference: e.target.value }))} placeholder="e.g. TR-1010" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><FieldLabel>Border crossing *</FieldLabel><input style={inp} value={newForm.border_crossing} onChange={e => setNewForm(f => ({ ...f, border_crossing: e.target.value }))} placeholder="e.g. Svinesund" /></div>
            <div><FieldLabel>Transport mode</FieldLabel>
              <select style={inp} value={newForm.transport_mode} onChange={e => setNewForm(f => ({ ...f, transport_mode: e.target.value }))}>
                {["Road","Ship","Fly","Rail"].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><FieldLabel>ETA</FieldLabel><input style={inp} type="datetime-local" value={newForm.eta} onChange={e => setNewForm(f => ({ ...f, eta: e.target.value }))} /></div>
            <div><FieldLabel>Carrier</FieldLabel><input style={inp} value={newForm.carrier} onChange={e => setNewForm(f => ({ ...f, carrier: e.target.value }))} placeholder="e.g. ABC123" /></div>
          </div>
          <div><FieldLabel>Responsible</FieldLabel><input style={inp} value={newForm.responsible} onChange={e => setNewForm(f => ({ ...f, responsible: e.target.value }))} placeholder="Full name" /></div>
        </div>
      </Modal>

      {/* New Shipment */}
      <Modal open={modal === "new-shipment"} onClose={() => setModal(null)} title="New shipment" subtitle="Create a new shipment record"
        footer={<><button style={btnSec} onClick={() => setModal(null)}>Cancel</button><button style={btnPri} onClick={createShipment} disabled={saving}>{saving ? "Saving…" : "Create shipment"}</button></>}>
        <div style={{ display: "grid", gap: 14 }}>
          <div><FieldLabel>Shipment reference *</FieldLabel><input style={inp} value={newForm.reference} onChange={e => setNewForm(f => ({ ...f, reference: e.target.value }))} placeholder="e.g. SH-100" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><FieldLabel>Actor / Consignor</FieldLabel><input style={inp} value={newForm.actor} onChange={e => setNewForm(f => ({ ...f, actor: e.target.value }))} placeholder="Company name" /></div>
            <div><FieldLabel>Border crossing</FieldLabel><input style={inp} value={newForm.border_crossing} onChange={e => setNewForm(f => ({ ...f, border_crossing: e.target.value }))} placeholder="e.g. Svinesund" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><FieldLabel>ETA</FieldLabel><input style={inp} type="datetime-local" value={newForm.eta} onChange={e => setNewForm(f => ({ ...f, eta: e.target.value }))} /></div>
            <div><FieldLabel>Carrier</FieldLabel><input style={inp} value={newForm.carrier} onChange={e => setNewForm(f => ({ ...f, carrier: e.target.value }))} placeholder="e.g. ABC123" /></div>
          </div>
          <div><FieldLabel>Link to transport</FieldLabel>
            <select style={inp} value={newForm.transport_id} onChange={e => setNewForm(f => ({ ...f, transport_id: e.target.value }))}>
              <option value="">— Unlinked —</option>
              {transports.map(t => <option key={t.id} value={t.id}>{t.reference} ({t.state_id})</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}