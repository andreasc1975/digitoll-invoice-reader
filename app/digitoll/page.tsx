"use client";
import { useState, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
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

interface ShipmentLine {
  id: string;
  importer: string;
  receiver: string;
  product_description: string;
  gross_weight: string;
}

type RowType = { kind: "transport"; data: Transport } | { kind: "shipment"; data: Shipment };
type ModalType = null | "detail-transport" | "detail-shipment" | "new-transport" | "new-shipment";
type TransportLink = "decide_later" | "own" | "existing";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: "red" | "amber" | "green" | "blue"; tip: string }> = {
  incomplete:           { label: "Missing information",         color: "red",   tip: "Blocking error — required information is missing" },
  missing_shipments:    { label: "Missing shipments",           color: "amber", tip: "Transport is complete but has no linked shipments" },
  awaiting_shipments:   { label: "Awaiting shipments",          color: "amber", tip: "One or more linked shipments are incomplete" },
  ready:                { label: "Ready to send",               color: "green", tip: "All data complete — ready to submit to Norwegian Customs" },
  sent:                 { label: "Sent (awaiting confirmation)", color: "blue",  tip: "Submitted to Norwegian Customs — awaiting receipt" },
  received:             { label: "Received",                    color: "blue",  tip: "Received by Norwegian Customs and being processed" },
  accepted:             { label: "Accepted",                    color: "green", tip: "Approved by Norwegian Customs" },
  rejected:             { label: "Rejected",                    color: "red",   tip: "Rejected by Norwegian Customs — review required" },
  arrived:              { label: "Arrived",                     color: "blue",  tip: "Physically arrived — ATA recorded" },
  complete_unlinked:    { label: "Data complete",               color: "amber", tip: "Shipment data is complete but not linked to a transport" },
  complete_linked:      { label: "Data complete",               color: "green", tip: "Shipment is complete and linked to a transport" },
};

const DECL_CONFIG: Record<string, { label: string; cls: string }> = {
  none:      { label: "Not created", cls: "decl-none" },
  draft:     { label: "Draft",       cls: "decl-draft" },
  linked:    { label: "Linked",      cls: "decl-linked" },
  submitted: { label: "Submitted",   cls: "decl-sub" },
};

const BORDER_CROSSINGS = ["Svinesund", "Ørje", "Magnor", "Riksåsen", "Bjørnefjell", "Storlien", "Treriksrøysa"];
const TRANSPORT_MODES  = ["Road", "Ship", "Fly", "Rail"];

function fmtDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
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
    <span title={tooltip ?? cfg.tip} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, fontSize: 11.5, fontWeight: 500, background: c.pill, color: c.text, whiteSpace: "nowrap", cursor: "default" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function DeclBadge({ status }: { status: string }) {
  const cfg = DECL_CONFIG[status] ?? DECL_CONFIG.none;
  const bg: Record<string, string> = { "decl-none": "#F2F4F7", "decl-draft": "#FFFAEB", "decl-linked": "#ECFDF3", "decl-sub": "#EFF8FF" };
  const tx: Record<string, string> = { "decl-none": "#667085", "decl-draft": "#B54708", "decl-linked": "#027A48", "decl-sub": "#175CD3" };
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 500, background: bg[cfg.cls], color: tx[cfg.cls] }}>{cfg.label}</span>;
}

// ── Shared style tokens ───────────────────────────────────────────────────────
const btnPri: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, background: "#0B1F3A", color: "#fff", fontSize: 12.5, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit" };
const btnSec: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, background: "#fff", color: "#344054", fontSize: 12.5, fontWeight: 500, border: "1px solid #D0D5DD", cursor: "pointer", fontFamily: "inherit" };
const btnGreen: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "10px 0", borderRadius: 8, background: "#17B26A", color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", width: "100%" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #D0D5DD", borderRadius: 8, fontSize: 13, color: "#101828", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const };
const fBtn = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 13px", borderRadius: 20, border: `1px solid ${active ? "#0B1F3A" : "#D0D5DD"}`, background: active ? "#0B1F3A" : "#fff", color: active ? "#fff" : "#344054", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" });

function FL({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#344054", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>{children}</label>;
}

// ── Overlay modal wrapper ─────────────────────────────────────────────────────
function Overlay({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: wide ? 680 : 580, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#101828", textTransform: "uppercase" as const, letterSpacing: ".04em" }}>{title}</h3>
      <button onClick={onClose} style={{ width: 30, height: 30, border: "1px solid #E4E7EC", borderRadius: 8, background: "#fff", cursor: "pointer", color: "#667085", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
    </div>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "14px 22px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end", gap: 8 }}>{children}</div>;
}

// ── Shipment list for Transport modal ────────────────────────────────────────
function ShipmentPickerTable({ shipments, selected, onToggle, search, onSearch }: {
  shipments: Shipment[];
  selected: string[];
  onToggle: (id: string) => void;
  search: string;
  onSearch: (v: string) => void;
}) {
  const filtered = shipments.filter(s =>
    !search || s.reference.toLowerCase().includes(search.toLowerCase()) || (s.actor ?? "").toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", border: "1px solid #D0D5DD", borderRadius: 8, marginBottom: 10 }}>
        <span style={{ color: "#98A2B3", fontSize: 16 }}>🔍</span>
        <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search shipments..." style={{ border: "none", outline: "none", fontSize: 12.5, color: "#344054", fontFamily: "inherit", flex: 1, background: "transparent" }} />
      </div>
      <div style={{ border: "1px solid #E4E7EC", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#F9FAFB" }}>
              <th style={{ width: 36, padding: "7px 10px" }}></th>
              {["ID", "ETA", "Actor", "Transport", "Status"].map(h => (
                <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600, color: "#667085", fontSize: 10.5, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#98A2B3" }}>No shipments found</td></tr>
            )}
            {filtered.map(s => (
              <tr key={s.id} onClick={() => onToggle(s.id)} style={{ borderTop: "1px solid #F2F4F7", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F9FAFB")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "8px 10px" }}>
                  <div style={{ width: 16, height: 16, border: `2px solid ${selected.includes(s.id) ? "#175CD3" : "#D0D5DD"}`, borderRadius: 4, background: selected.includes(s.id) ? "#175CD3" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {selected.includes(s.id) && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1 }}>✓</span>}
                  </div>
                </td>
                <td style={{ padding: "8px 10px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <span style={{ background: "#ECFDF3", color: "#027A48", borderRadius: 4, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>SH</span>
                    {s.reference}
                  </span>
                </td>
                <td style={{ padding: "8px 10px", color: "#667085" }}>{fmtDate(s.eta)}</td>
                <td style={{ padding: "8px 10px", color: "#344054" }}>{s.actor ?? "—"}</td>
                <td style={{ padding: "8px 10px", color: "#98A2B3" }}>{s.own_transport ? "Own transport" : s.transports?.reference ?? "Unlinked"}</td>
                <td style={{ padding: "8px 10px" }}><StatusPill status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Transport picker for Shipment modal ───────────────────────────────────────
function TransportPickerTable({ transports, selected, onSelect, search, onSearch }: {
  transports: Transport[];
  selected: string;
  onSelect: (id: string) => void;
  search: string;
  onSearch: (v: string) => void;
}) {
  const filtered = transports.filter(t =>
    !search || t.reference.toLowerCase().includes(search.toLowerCase()) || fmtDate(t.eta).includes(search)
  );
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", border: "1px solid #D0D5DD", borderRadius: 8, marginBottom: 10 }}>
        <span style={{ color: "#98A2B3", fontSize: 16 }}>🔍</span>
        <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search by date, actor..." style={{ border: "none", outline: "none", fontSize: 12.5, color: "#344054", fontFamily: "inherit", flex: 1, background: "transparent" }} />
      </div>
      <div style={{ border: "1px solid #E4E7EC", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#F9FAFB" }}>
              <th style={{ width: 36, padding: "7px 10px" }}></th>
              {["ID", "ETA", "Actor", "Transport", "Status"].map(h => (
                <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600, color: "#667085", fontSize: 10.5, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#98A2B3" }}>No transports found</td></tr>
            )}
            {filtered.map(t => (
              <tr key={t.id} onClick={() => onSelect(t.id)} style={{ borderTop: "1px solid #F2F4F7", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F9FAFB")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "8px 10px" }}>
                  <div style={{ width: 16, height: 16, border: `2px solid ${selected === t.id ? "#175CD3" : "#D0D5DD"}`, borderRadius: "50%", background: selected === t.id ? "#175CD3" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {selected === t.id && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", display: "block" }} />}
                  </div>
                </td>
                <td style={{ padding: "8px 10px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <span style={{ background: "#EFF8FF", color: "#175CD3", borderRadius: 4, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>TR</span>
                    {t.reference}
                  </span>
                </td>
                <td style={{ padding: "8px 10px", color: "#667085" }}>{fmtDate(t.eta)}</td>
                <td style={{ padding: "8px 10px", color: "#344054" }}>{t.actor ?? "—"}</td>
                <td style={{ padding: "8px 10px", color: "#98A2B3" }}>{t.transport_mode ?? "—"}</td>
                <td style={{ padding: "8px 10px" }}><StatusPill status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DigitollStart() {
  const [transports, setTransports] = useState<Transport[]>([]);
  const [shipments, setShipments]   = useState<Shipment[]>([]);
  const [filter, setFilter]         = useState("all");
  const [search, setSearch]         = useState("");
  const [modal, setModal]           = useState<ModalType>(null);
  const [selected, setSelected]     = useState<Transport | Shipment | null>(null);
  const [saving, setSaving]         = useState(false);

  // ── New Transport form state ──────────────────────────────────────────────
  const [trForm, setTrForm] = useState({ transport_mode: "Road", identifier: "", border_crossing: "", eta: "" });
  const [trShipmentSearch, setTrShipmentSearch] = useState("");
  const [trLinkedShipments, setTrLinkedShipments] = useState<string[]>([]);

  // ── New Shipment form state ───────────────────────────────────────────────
  const defaultLine = (): ShipmentLine => ({ id: crypto.randomUUID(), importer: "", receiver: "", product_description: "", gross_weight: "" });
  const [shLines, setShLines] = useState<ShipmentLine[]>([defaultLine()]);
  const [shTransportLink, setShTransportLink] = useState<TransportLink>("decide_later");
  const [shTransportSearch, setShTransportSearch] = useState("");
  const [shSelectedTransport, setShSelectedTransport] = useState("");
  // Own transport fields
  const [shOwnTransport, setShOwnTransport] = useState({ transport_mode: "Road", identifier: "", border_crossing: "", eta: "" });

  const load = useCallback(async () => {
    const [tr, sh] = await Promise.all([
      fetch("/api/transports").then(r => r.json()),
      fetch("/api/shipments").then(r => r.json()),
    ]);
    if (Array.isArray(tr)) setTransports(tr);
    if (Array.isArray(sh)) setShipments(sh);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNewTransport() {
    setTrForm({ transport_mode: "Road", identifier: "", border_crossing: "", eta: "" });
    setTrLinkedShipments([]);
    setTrShipmentSearch("");
    setModal("new-transport");
  }

  function openNewShipment() {
    setShLines([defaultLine()]);
    setShTransportLink("decide_later");
    setShTransportSearch("");
    setShSelectedTransport("");
    setShOwnTransport({ transport_mode: "Road", identifier: "", border_crossing: "", eta: "" });
    setModal("new-shipment");
  }

  function closeModal() {
    setModal(null);
    setSelected(null);
  }

  async function createTransport() {
    setSaving(true);
    const body = {
      reference: trForm.identifier || `TR-${Date.now().toString().slice(-4)}`,
      transport_mode: trForm.transport_mode,
      border_crossing: trForm.border_crossing,
      eta: trForm.eta,
      carrier: trForm.identifier,
      status: "incomplete",
    };
    const res = await fetch("/api/transports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const tr = await res.json();
      // Link shipments
      await Promise.all(trLinkedShipments.map(sid =>
        fetch(`/api/shipments/${sid}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transport_id: tr.id }) })
      ));
      setModal(null);
      load();
    }
    setSaving(false);
  }

  async function createShipment() {
    setSaving(true);
    let transportId = null;
    // If own transport: create it first
    if (shTransportLink === "own") {
      const trRes = await fetch("/api/transports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        reference: shOwnTransport.identifier || `TR-${Date.now().toString().slice(-4)}`,
        transport_mode: shOwnTransport.transport_mode,
        border_crossing: shOwnTransport.border_crossing,
        eta: shOwnTransport.eta,
        status: "incomplete",
      })});
      if (trRes.ok) { const tr = await trRes.json(); transportId = tr.id; }
    } else if (shTransportLink === "existing") {
      transportId = shSelectedTransport || null;
    }

    const body = {
      reference: `SH-${Date.now().toString().slice(-4)}`,
      transport_id: transportId,
      own_transport: shTransportLink === "own",
      status: "incomplete",
      actor: shLines[0]?.importer || "",
    };
    const res = await fetch("/api/shipments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { setModal(null); load(); }
    setSaving(false);
  }

  // ── Table logic ───────────────────────────────────────────────────────────
  const allRows: RowType[] = [
    ...transports.map(t => ({ kind: "transport" as const, data: t })),
    ...shipments.map(s => ({ kind: "shipment" as const, data: s })),
  ];

  const filteredRows = allRows.filter(row => {
    const d = row.data;
    if (search && !JSON.stringify(d).toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "active")     return ["incomplete","missing_shipments","awaiting_shipments","complete_unlinked"].includes(d.status);
    if (filter === "completed")  return ["accepted","arrived"].includes(d.status);
    if (filter === "transports") return row.kind === "transport";
    if (filter === "shipments")  return row.kind === "shipment";
    return true;
  });

  const trRows = filteredRows.filter(r => r.kind === "transport");
  const shRows = filteredRows.filter(r => r.kind === "shipment");
  const activeCount = allRows.filter(r => ["incomplete","missing_shipments","awaiting_shipments","complete_unlinked"].includes(r.data.status)).length;

  function nextAction(row: RowType): string {
    const s = row.data.status;
    if (["incomplete","complete_unlinked"].includes(s)) return "Complete";
    if (s === "missing_shipments") return "Link shipments";
    if (s === "awaiting_shipments") return "Resolve issues";
    if (s === "ready") return row.kind === "transport" ? "Send transport" : "Send shipment";
    if (s === "rejected") return "Review errors";
    return "View";
  }

  function openDetail(row: RowType) {
    setSelected(row.data);
    setModal(row.kind === "transport" ? "detail-transport" : "detail-shipment");
  }

  function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F2F4F7", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#667085" }}>{label}</span>
        <span style={{ fontSize: 12.5, color: "#101828", fontWeight: 500, textAlign: "right" }}>{value ?? <span style={{ color: "#98A2B3", fontWeight: 400 }}>—</span>}</span>
      </div>
    );
  }

  function TableSection({ rows, heading }: { rows: RowType[]; heading: string }) {
    if (rows.length === 0) return null;
    return (
      <>
        <tr>
          <td colSpan={13} style={{ background: "#F9FAFB", fontSize: 10, fontWeight: 700, color: "#98A2B3", padding: "5px 14px", letterSpacing: ".07em", textTransform: "uppercase" as const, borderBottom: "1px solid #E4E7EC" }}>{heading}</td>
        </tr>
        {rows.map(row => {
          const d = row.data;
          const isTransport = row.kind === "transport";
          const next = nextAction(row);
          const isActionable = !["view","View"].includes(next) && next !== "—";
          const transportDisplay = row.kind === "shipment"
            ? (d as Shipment).own_transport ? "Own transport"
              : (d as Shipment).transports ? `Incl. ${(d as Shipment).transports!.reference}`
              : "Unlinked"
            : (d as Transport).transport_mode ?? "—";

          return (
            <tr key={d.id} onClick={() => openDetail(row)}
              style={{ borderBottom: "1px solid #F2F4F7", cursor: "pointer" }}
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
              <td style={{ padding: "9px 8px", color: "#98A2B3", fontSize: 12 }}>{d.responsible ?? "—"}</td>
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
                <button onClick={e => { e.stopPropagation(); openDetail(row); }} style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", borderRadius: 5, color: "#98A2B3", fontSize: 18 }}>⋯</button>
              </td>
            </tr>
          );
        })}
      </>
    );
  }

  const selectedTransport = selected && modal === "detail-transport" ? selected as Transport : null;
  const selectedShipment  = selected && modal === "detail-shipment"  ? selected as Shipment  : null;

  // ── Transport submit check ────────────────────────────────────────────────
  const trCanSubmit = trLinkedShipments.length > 0 && trForm.border_crossing && trForm.eta;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, fontFamily: "'Inter', sans-serif" }}>
      {/* Filter bar */}
      <div style={{ padding: "14px 20px 0", background: "#F4F5F7" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {([ ["all","All",allRows.length], ["active","Active",activeCount], ["completed","Completed",allRows.filter(r => ["accepted","arrived"].includes(r.data.status)).length], ["transports","Transports",transports.length], ["shipments","Shipments",shipments.length] ] as [string,string,number][]).map(([key,label,count]) => (
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
            <button onClick={openNewTransport} style={btnPri}>＋ New transport</button>
            <button onClick={openNewShipment} style={{ ...btnSec, border: "1px solid #B2CCFF", color: "#175CD3" }}>＋ New shipment</button>
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
                {["","State","ID","SH","Date","Actor","Responsible","Carrier","Border","Transport","Status","Next step","Declaration",""].map((h,i) => (
                  <th key={i} style={{ padding: "9px 8px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#667085", letterSpacing: ".04em", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <TableSection rows={trRows} heading="Transports" />
              <TableSection rows={shRows} heading="Shipments" />
              {filteredRows.length === 0 && (
                <tr><td colSpan={14} style={{ padding: 40, textAlign: "center", color: "#98A2B3", fontSize: 13 }}>No records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: Detail Transport ─────────────────────────────────────────── */}
      <Overlay open={modal === "detail-transport"} onClose={closeModal}>
        <ModalHeader title={`Transport ${selectedTransport?.state_id ?? ""}`} onClose={closeModal} />
        <div style={{ padding: "20px 22px" }}>
          {selectedTransport && (
            <>
              <div style={{ marginBottom: 16 }}><StatusPill status={selectedTransport.status} /></div>
              <DetailField label="Reference" value={selectedTransport.reference} />
              <DetailField label="Border crossing" value={selectedTransport.border_crossing} />
              <DetailField label="Transport mode" value={selectedTransport.transport_mode} />
              <DetailField label="ETA" value={fmtDate(selectedTransport.eta)} />
              <DetailField label="Carrier" value={selectedTransport.carrier} />
              <DetailField label="Actor" value={selectedTransport.actor} />
              <DetailField label="Declaration" value={<DeclBadge status={selectedTransport.declaration_status} />} />
              <DetailField label="Linked shipments" value={selectedTransport.shipments?.length ?? 0} />
            </>
          )}
        </div>
        <ModalFooter>
          <button style={btnSec} onClick={closeModal}>Close</button>
          <button style={btnPri} onClick={closeModal}>{selectedTransport ? nextAction({ kind: "transport", data: selectedTransport }) : "View"}</button>
        </ModalFooter>
      </Overlay>

      {/* ── MODAL: Detail Shipment ──────────────────────────────────────────── */}
      <Overlay open={modal === "detail-shipment"} onClose={closeModal}>
        <ModalHeader title={`Shipment ${selectedShipment?.state_id ?? ""}`} onClose={closeModal} />
        <div style={{ padding: "20px 22px" }}>
          {selectedShipment && (
            <>
              <div style={{ marginBottom: 16 }}><StatusPill status={selectedShipment.status} /></div>
              <DetailField label="Reference" value={selectedShipment.reference} />
              <DetailField label="Border crossing" value={selectedShipment.border_crossing} />
              <DetailField label="Transport" value={selectedShipment.own_transport ? "Own transport" : selectedShipment.transports?.reference ?? "Unlinked"} />
              <DetailField label="ETA" value={fmtDate(selectedShipment.eta)} />
              <DetailField label="Actor" value={selectedShipment.actor} />
              <DetailField label="Declaration" value={<DeclBadge status={selectedShipment.declaration_status} />} />
            </>
          )}
        </div>
        <ModalFooter>
          <button style={btnSec} onClick={closeModal}>Close</button>
          <button style={btnPri} onClick={closeModal}>{selectedShipment ? nextAction({ kind: "shipment", data: selectedShipment }) : "View"}</button>
        </ModalFooter>
      </Overlay>

      {/* ── MODAL: New Transport (Master) ───────────────────────────────────── */}
      <Overlay open={modal === "new-transport"} onClose={closeModal} wide>
        <ModalHeader title="New Transport (Master)" onClose={closeModal} />
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Row 1: Mode + Identifier */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <FL>Mode of Transport *</FL>
              <select style={inp} value={trForm.transport_mode} onChange={e => setTrForm(f => ({ ...f, transport_mode: e.target.value }))}>
                {TRANSPORT_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <FL>Identifyer</FL>
              <input style={inp} value={trForm.identifier} onChange={e => setTrForm(f => ({ ...f, identifier: e.target.value }))} placeholder="AB12345" />
            </div>
          </div>
          {/* Row 2: Border + ETA */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <FL>Border Crossing *</FL>
              <select style={inp} value={trForm.border_crossing} onChange={e => setTrForm(f => ({ ...f, border_crossing: e.target.value }))}>
                <option value="">Select...</option>
                {BORDER_CROSSINGS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <FL>ETA *</FL>
              <input style={inp} type="datetime-local" value={trForm.eta} onChange={e => setTrForm(f => ({ ...f, eta: e.target.value }))} />
            </div>
          </div>

          {/* Shipments section */}
          <div style={{ background: "#F9FAFB", border: "1px solid #E4E7EC", borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", marginBottom: 3 }}>SHIPMENTS</div>
              <div style={{ fontSize: 12, color: "#667085" }}>Link the shipments to this transport now or later</div>
            </div>
            <ShipmentPickerTable
              shipments={shipments}
              selected={trLinkedShipments}
              onToggle={id => setTrLinkedShipments(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
              search={trShipmentSearch}
              onSearch={setTrShipmentSearch}
            />
          </div>

          {/* Submit transport button */}
          {trLinkedShipments.length > 0 && trForm.border_crossing && trForm.eta && (
            <button onClick={createTransport} disabled={saving} style={btnGreen}>
              {saving ? "Creating…" : "SUBMIT TRANSPORT"}
            </button>
          )}
        </div>
        <ModalFooter>
          <button style={btnSec} onClick={closeModal}>Cancel</button>
          <button style={{ ...btnPri, opacity: saving ? 0.6 : 1 }} onClick={createTransport} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </ModalFooter>
      </Overlay>

      {/* ── MODAL: New Shipment (House) ─────────────────────────────────────── */}
      <Overlay open={modal === "new-shipment"} onClose={closeModal} wide>
        <ModalHeader title="New Shipment (House)" onClose={closeModal} />
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Lines table */}
          <div style={{ border: "1px solid #E4E7EC", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: "#F9FAFB" }}>
                  {["#","IMPORTER","RECEIVER","PRODUCT DESCRIPTION","GROSS WEIGHT",""].map((h,i) => (
                    <th key={i} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "#667085", letterSpacing: ".04em", borderBottom: "1px solid #E4E7EC" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shLines.map((line, i) => (
                  <tr key={line.id} style={{ borderBottom: "1px solid #F2F4F7" }}>
                    <td style={{ padding: "6px 10px", color: "#98A2B3", fontSize: 12 }}>{i + 1}</td>
                    <td style={{ padding: "6px 8px" }}>
                      <select style={{ ...inp, fontSize: 12, padding: "5px 8px" }} value={line.importer} onChange={e => setShLines(ls => ls.map(l => l.id === line.id ? { ...l, importer: e.target.value } : l))}>
                        <option value="">Select</option>
                        {["Exporter Sv X AB","Exporter Sv Y AB","Exporter Sv Z AB"].map(o => <option key={o}>{o}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "6px 8px" }}>
                      <select style={{ ...inp, fontSize: 12, padding: "5px 8px" }} value={line.receiver} onChange={e => setShLines(ls => ls.map(l => l.id === line.id ? { ...l, receiver: e.target.value } : l))}>
                        <option value="">Select</option>
                        {["Company X AS","Company Y AS","Company Z AS"].map(o => <option key={o}>{o}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "6px 8px" }}>
                      <input style={{ ...inp, fontSize: 12, padding: "5px 8px" }} value={line.product_description} onChange={e => setShLines(ls => ls.map(l => l.id === line.id ? { ...l, product_description: e.target.value } : l))} placeholder="Add" />
                    </td>
                    <td style={{ padding: "6px 8px" }}>
                      <input style={{ ...inp, fontSize: 12, padding: "5px 8px", textAlign: "right" }} type="number" value={line.gross_weight} onChange={e => setShLines(ls => ls.map(l => l.id === line.id ? { ...l, gross_weight: e.target.value } : l))} placeholder="0.00" />
                    </td>
                    <td style={{ padding: "6px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                      {i === shLines.length - 1 && (
                        <button onClick={() => setShLines(ls => [...ls, defaultLine()])} style={{ width: 22, height: 22, borderRadius: "50%", background: "#175CD3", color: "#fff", border: "none", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>+</button>
                      )}
                      {shLines.length > 1 && (
                        <button onClick={() => setShLines(ls => ls.filter(l => l.id !== line.id))} style={{ width: 22, height: 22, borderRadius: 4, background: "#FEF3F2", color: "#D92D20", border: "none", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>🗑</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Transport section */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", marginBottom: 12 }}>TRANSPORT</div>
            <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
              {([ ["decide_later","Decide Later"], ["own","Own Transport"], ["existing","Connect to existing Transport"] ] as [TransportLink, string][]).map(([val, label]) => (
                <label key={val} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 13, color: "#344054" }}>
                  <div onClick={() => setShTransportLink(val)} style={{ width: 16, height: 16, border: `2px solid ${shTransportLink === val ? "#175CD3" : "#D0D5DD"}`, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                    {shTransportLink === val && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#175CD3", display: "block" }} />}
                  </div>
                  {label}
                </label>
              ))}
            </div>

            {/* Own Transport fields */}
            {shTransportLink === "own" && (
              <div style={{ background: "#F9FAFB", border: "1px solid #E4E7EC", borderRadius: 10, padding: "16px 18px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 12 }}>Own Transport</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <FL>Mode of Transport *</FL>
                    <select style={inp} value={shOwnTransport.transport_mode} onChange={e => setShOwnTransport(f => ({ ...f, transport_mode: e.target.value }))}>
                      {TRANSPORT_MODES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <FL>Identifyer</FL>
                    <input style={inp} value={shOwnTransport.identifier} onChange={e => setShOwnTransport(f => ({ ...f, identifier: e.target.value }))} placeholder="AB12345" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <FL>Border Crossing *</FL>
                    <select style={inp} value={shOwnTransport.border_crossing} onChange={e => setShOwnTransport(f => ({ ...f, border_crossing: e.target.value }))}>
                      <option value="">Select...</option>
                      {BORDER_CROSSINGS.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <FL>ETA *</FL>
                    <input style={inp} type="datetime-local" value={shOwnTransport.eta} onChange={e => setShOwnTransport(f => ({ ...f, eta: e.target.value }))} />
                  </div>
                </div>
                <button onClick={createShipment} disabled={saving} style={btnGreen}>
                  {saving ? "Creating…" : "SEND SHIPMENT"}
                </button>
              </div>
            )}

            {/* Connect to existing transport */}
            {shTransportLink === "existing" && (
              <div style={{ background: "#F9FAFB", border: "1px solid #E4E7EC", borderRadius: 10, padding: "16px 18px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 12 }}>Connect to Existing Transport</div>
                <TransportPickerTable
                  transports={transports}
                  selected={shSelectedTransport}
                  onSelect={setShSelectedTransport}
                  search={shTransportSearch}
                  onSearch={setShTransportSearch}
                />
              </div>
            )}
          </div>
        </div>
        <ModalFooter>
          <button style={btnSec} onClick={closeModal}>Cancel</button>
          <button style={{ ...btnPri, opacity: saving ? 0.6 : 1 }} onClick={createShipment} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </ModalFooter>
      </Overlay>
    </div>
  );
}