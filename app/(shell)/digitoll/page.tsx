"use client";
import { useState, useEffect, useCallback, useRef } from "react";

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
  source?: string;
  tms_trip_ref?: string | null;
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
  source?: string;
  tms_order_ref?: string | null;
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
type TransportLink = "decide_later" | "own" | "existing";

type ActiveModal =
  | null
  | { type: "new-transport" }
  | { type: "new-shipment" }
  | { type: "edit-transport";  data: Transport }
  | { type: "edit-shipment";   data: Shipment }
  | { type: "link-shipments";  data: Transport }
  | { type: "resolve-issues";  data: Transport }
  | { type: "send-transport";  data: Transport }
  | { type: "send-shipment";   data: Shipment }
  | { type: "review-errors";   data: Transport | Shipment }
  | { type: "view-transport";  data: Transport }
  | { type: "view-shipment";   data: Shipment };

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: "red" | "amber" | "green" | "blue"; tip: string }> = {
  incomplete:         { label: "Missing information",          color: "red",   tip: "Blocking error — required information is missing" },
  missing_shipments:  { label: "Missing shipments",            color: "amber", tip: "Transport is complete but has no linked shipments" },
  awaiting_shipments: { label: "Awaiting shipments",           color: "amber", tip: "One or more linked shipments are incomplete" },
  ready:              { label: "Ready to send",                color: "green", tip: "All data complete — ready to submit" },
  sent:               { label: "Sent (awaiting confirmation)", color: "blue",  tip: "Submitted — awaiting receipt" },
  received:           { label: "Received",                     color: "blue",  tip: "Received and being processed" },
  accepted:           { label: "Accepted",                     color: "green", tip: "Approved by Norwegian Customs" },
  rejected:           { label: "Rejected",                     color: "red",   tip: "Rejected — review required" },
  arrived:            { label: "Arrived",                      color: "blue",  tip: "Physically arrived — ATA recorded" },
  complete_unlinked:  { label: "Data complete",                color: "amber", tip: "Complete but not linked to a transport" },
  complete_linked:    { label: "Data complete",                color: "green", tip: "Complete and linked to a transport" },
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

function toDatetimeLocal(s: string | null): string {
  if (!s) return "";
  return new Date(s).toISOString().slice(0, 16);
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
    <span title={tooltip ?? cfg.tip} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 2, fontSize: 11.5, fontWeight: 500, background: c.pill, color: c.text, whiteSpace: "nowrap", cursor: "default" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}


function SourceBadge({ source }: { source?: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    tms:    { bg: "#EFF8FF", color: "#175CD3" },
    cms:    { bg: "#ECFDF3", color: "#027A48" },
    manual: { bg: "#F2F4F7", color: "#667085" },
  };
  const key = (source ?? "manual").toLowerCase();
  const c = cfg[key] ?? cfg.manual;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: 2, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" as const, background: c.bg, color: c.color }}>
      {key}
    </span>
  );
}

function DeclBadge({ status }: { status: string }) {
  const cfg = DECL_CONFIG[status] ?? DECL_CONFIG.none;
  const bg: Record<string, string> = { "decl-none": "#F2F4F7", "decl-draft": "#FFFAEB", "decl-linked": "#ECFDF3", "decl-sub": "#EFF8FF" };
  const tx: Record<string, string> = { "decl-none": "#667085", "decl-draft": "#B54708", "decl-linked": "#027A48", "decl-sub": "#175CD3" };
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 2, fontSize: 11, fontWeight: 500, background: bg[cfg.cls], color: tx[cfg.cls] }}>{cfg.label}</span>;
}

// ── Style tokens ──────────────────────────────────────────────────────────────
const btnPri: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 2, background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit" };
const btnSec: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 2, background: "#fff", color: "#344054", fontSize: 12.5, fontWeight: 500, border: "1px solid #D0D5DD", cursor: "pointer", fontFamily: "inherit" };
const btnGreen: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "10px 0", borderRadius: 2, background: "#17B26A", color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", width: "100%" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #D0D5DD", borderRadius: 2, fontSize: 13, color: "#101828", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const };
const fBtn = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 8, padding: "0 16px", height: 36, boxSizing: "border-box" as const, borderRadius: 2, border: "1px solid transparent", background: active ? "#003160" : "#D9DBE0", color: active ? "#fff" : "#003160", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const });

function FL({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#344054", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>{children}{required && <span style={{ color: "#D92D20" }}> *</span>}</label>;
}

// ── Overlay ───────────────────────────────────────────────────────────────────
function Overlay({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: wide ? 700 : 580, maxHeight: "92vh", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#101828", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>{title}</h3>
        {subtitle && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#667085" }}>{subtitle}</p>}
      </div>
      <button onClick={onClose} style={{ width: 30, height: 30, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", color: "#667085", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
    </div>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "14px 22px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end", gap: 8, position: "sticky", bottom: 0, background: "#fff", zIndex: 10 }}>{children}</div>;
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F2F4F7", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "#667085" }}>{label}</span>
      <span style={{ fontSize: 12.5, color: "#101828", fontWeight: 500, textAlign: "right" as const }}>{value ?? <span style={{ color: "#98A2B3", fontWeight: 400 }}>—</span>}</span>
    </div>
  );
}

// ── Shipment picker ───────────────────────────────────────────────────────────
function ShipmentPickerTable({ shipments, selected, onToggle, search, onSearch }: {
  shipments: Shipment[]; selected: string[]; onToggle: (id: string) => void; search: string; onSearch: (v: string) => void;
}) {
  const [selectedExpanded, setSelectedExpanded] = useState(false);
  const selectedShipments = shipments.filter(s => selected.includes(s.id));
  const unselected = shipments.filter(s =>
    !selected.includes(s.id) &&
    (!search || s.reference.toLowerCase().includes(search.toLowerCase()) || (s.actor ?? "").toLowerCase().includes(search.toLowerCase()))
  );
  const PREVIEW = 5;
  const visibleSelected = selectedExpanded ? selectedShipments : selectedShipments.slice(0, PREVIEW);

  function ShipmentRow({ s, checked }: { s: Shipment; checked: boolean }) {
    return (
      <tr onClick={() => onToggle(s.id)} style={{ borderTop: "1px solid #F2F4F7", cursor: "pointer" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#F9FAFB")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
        <td style={{ padding: "8px 10px" }}>
          <div style={{ width: 16, height: 16, border: `2px solid ${checked ? "#175CD3" : "#D0D5DD"}`, borderRadius: 2, background: checked ? "#175CD3" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {checked && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1 }}>✓</span>}
          </div>
        </td>
        <td style={{ padding: "8px 10px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ background: "#ECFDF3", color: "#027A48", borderRadius: 2, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>SH</span>
            {s.reference}
          </span>
        </td>
        <td style={{ padding: "8px 10px", color: "#667085" }}>{fmtDate(s.eta)}</td>
        <td style={{ padding: "8px 10px", color: "#344054" }}>{s.actor ?? "—"}</td>
        <td style={{ padding: "8px 10px", color: "#98A2B3" }}>{s.own_transport ? "Own transport" : s.transports?.reference ?? "Unlinked"}</td>
        <td style={{ padding: "8px 10px" }}><StatusPill status={s.status} /></td>
      </tr>
    );
  }

  return (
    <div>
      {selectedShipments.length > 0 && (
        <div style={{ marginBottom: 10, border: "1px solid #B2CCFF", borderRadius: 2, overflow: "hidden" }}>
          <div onClick={() => setSelectedExpanded(e => !e)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#EFF8FF", cursor: "pointer", userSelect: "none" as const }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#175CD3" }}>Selected shipments</span>
              <span style={{ background: "#175CD3", color: "#fff", borderRadius: 2, padding: "0 7px", fontSize: 11, fontWeight: 700 }}>{selectedShipments.length}</span>
            </div>
            <span style={{ fontSize: 12, color: "#175CD3", fontWeight: 500 }}>{selectedExpanded ? "▲ Collapse" : `▼ Show all${selectedShipments.length > PREVIEW ? ` (${selectedShipments.length})` : ""}`}</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <tbody>{visibleSelected.map(s => <ShipmentRow key={s.id} s={s} checked />)}</tbody>
          </table>
          {!selectedExpanded && selectedShipments.length > PREVIEW && (
            <div onClick={() => setSelectedExpanded(true)} style={{ padding: "7px 12px", background: "#EFF8FF", borderTop: "1px solid #B2CCFF", fontSize: 12, color: "#175CD3", fontWeight: 500, cursor: "pointer", textAlign: "center" as const }}>
              + {selectedShipments.length - PREVIEW} more selected
            </div>
          )}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", border: "1px solid #D0D5DD", borderRadius: 2, marginBottom: 10 }}>
        <span style={{ color: "#98A2B3" }}>🔍</span>
        <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search shipments..." style={{ border: "none", outline: "none", fontSize: 12.5, color: "#344054", fontFamily: "inherit", flex: 1, background: "transparent" }} />
        {search && <button onClick={() => onSearch("")} style={{ border: "none", background: "transparent", color: "#98A2B3", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>✕</button>}
      </div>
      <div style={{ border: "1px solid #E4E7EC", borderRadius: 2, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ background: "#F9FAFB" }}>
            <th style={{ width: 36, padding: "7px 10px" }} />
            {["ID","ETA","Actor","Transport","Status"].map(h => (
              <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600, color: "#667085", fontSize: 10.5, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {unselected.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#98A2B3" }}>
                {search ? "No shipments match your search" : selectedShipments.length > 0 ? "All shipments are selected" : "No shipments found"}
              </td></tr>
            )}
            {unselected.map(s => <ShipmentRow key={s.id} s={s} checked={false} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Transport picker ──────────────────────────────────────────────────────────
function TransportPickerTable({ transports, selected, onSelect, search, onSearch }: {
  transports: Transport[]; selected: string; onSelect: (id: string) => void; search: string; onSearch: (v: string) => void;
}) {
  const filtered = transports.filter(t => !search || t.reference.toLowerCase().includes(search.toLowerCase()) || fmtDate(t.eta).includes(search));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", border: "1px solid #D0D5DD", borderRadius: 2, marginBottom: 10 }}>
        <span style={{ color: "#98A2B3" }}>🔍</span>
        <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search by date, reference..." style={{ border: "none", outline: "none", fontSize: 12.5, color: "#344054", fontFamily: "inherit", flex: 1, background: "transparent" }} />
      </div>
      <div style={{ border: "1px solid #E4E7EC", borderRadius: 2, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ background: "#F9FAFB" }}>
            <th style={{ width: 36, padding: "7px 10px" }} />
            {["ID","ETA","Actor","Transport","Status"].map(h => <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600, color: "#667085", fontSize: 10.5, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#98A2B3" }}>No transports found</td></tr>}
            {filtered.map(t => (
              <tr key={t.id} onClick={() => onSelect(t.id)} style={{ borderTop: "1px solid #F2F4F7", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F9FAFB")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "8px 10px" }}>
                  <div style={{ width: 16, height: 16, border: `2px solid ${selected === t.id ? "#175CD3" : "#D0D5DD"}`, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {selected === t.id && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#175CD3", display: "block" }} />}
                  </div>
                </td>
                <td style={{ padding: "8px 10px" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ background: "#EFF8FF", color: "#175CD3", borderRadius: 2, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>TR</span>{t.reference}</span></td>
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

// ── Transport form ────────────────────────────────────────────────────────────
function TransportForm({ form, onChange }: {
  form: { transport_mode: string; identifier: string; border_crossing: string; eta: string };
  onChange: (f: typeof form) => void;
}) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div><FL required>Mode of Transport</FL>
          <select style={inp} value={form.transport_mode} onChange={e => onChange({ ...form, transport_mode: e.target.value })}>
            {TRANSPORT_MODES.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div><FL>Identifyer</FL>
          <input style={inp} value={form.identifier} onChange={e => onChange({ ...form, identifier: e.target.value })} placeholder="AB12345" />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div><FL required>Border Crossing</FL>
          <select style={inp} value={form.border_crossing} onChange={e => onChange({ ...form, border_crossing: e.target.value })}>
            <option value="">Select...</option>
            {BORDER_CROSSINGS.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div><FL required>ETA</FL>
          <input style={inp} type="datetime-local" value={form.eta} onChange={e => onChange({ ...form, eta: e.target.value })} />
        </div>
      </div>
    </>
  );
}

// ── Create context menu ───────────────────────────────────────────────────────
function CreateMenu({ onNewTransport, onNewShipment, onClose }: {
  onNewTransport: () => void;
  onNewShipment: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const menuItem = (onClick: () => void, badge: React.ReactNode, label: string, sub: string) => (
    <div
      onClick={() => { onClick(); onClose(); }}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #F2F4F7" }}
      onMouseEnter={e => (e.currentTarget.style.background = "#F9FAFB")}
      onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
    >
      {badge}
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#101828" }}>{label}</div>
        <div style={{ fontSize: 11.5, color: "#667085" }}>{sub}</div>
      </div>
    </div>
  );

  return (
    <div ref={ref} style={{
      position: "fixed",
      top: 52,
      right: 120,
      width: 260,
      background: "#fff",
      borderRadius: 2,
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      border: "1px solid #E4E7EC",
      zIndex: 500,
      overflow: "hidden",
    }}>
      {menuItem(
        onNewTransport,
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 22, borderRadius: 2, fontSize: 11, fontWeight: 700, background: "#EFF8FF", color: "#175CD3", flexShrink: 0 }}>TR</span>,
        "New Transport",
        "New transport document"
      )}
      {menuItem(
        onNewShipment,
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 22, borderRadius: 2, fontSize: 11, fontWeight: 700, background: "#ECFDF3", color: "#027A48", flexShrink: 0 }}>SH</span>,
        "New Shipment",
        "New shipment document"
      )}
    </div>
  );
}

// ── Shipment form body (extern komponent för att undvika fokus-problem) ─────────
interface ShipmentFormProps {
  lines: ShipmentLine[];
  setLines: React.Dispatch<React.SetStateAction<ShipmentLine[]>>;
  transportLink: TransportLink;
  setTransportLink: (v: TransportLink) => void;
  selectedTransport: string;
  setSelectedTransport: (v: string) => void;
  transportSearch: string;
  setTransportSearch: (v: string) => void;
  ownTransport: { transport_mode: string; identifier: string; border_crossing: string; eta: string };
  setOwnTransport: (v: ShipmentFormProps["ownTransport"]) => void;
  transports: Transport[];
  saving: boolean;
  onSave: () => void;
  defaultLine: () => ShipmentLine;
}

function ShipmentFormBody({
  lines, setLines, transportLink, setTransportLink,
  selectedTransport, setSelectedTransport, transportSearch, setTransportSearch,
  ownTransport, setOwnTransport, transports, saving, onSave, defaultLine,
}: ShipmentFormProps) {
  return (
    <>
      <div style={{ border: "1px solid #E4E7EC", borderRadius: 2, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead><tr style={{ background: "#F9FAFB" }}>
            {["#","IMPORTER","RECEIVER","PRODUCT DESCRIPTION","GROSS WEIGHT",""].map((h,i) => (
              <th key={i} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#003160", letterSpacing: ".04em", borderBottom: "1px solid #E4E7EC" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={line.id} style={{ borderBottom: "1px solid #F2F4F7" }}>
                <td style={{ padding: "6px 10px", color: "#98A2B3", fontSize: 12 }}>{i + 1}</td>
                <td style={{ padding: "6px 8px" }}>
                  <select style={{ ...inp, fontSize: 12, padding: "5px 8px" }} value={line.importer} onChange={e => setLines(ls => ls.map(l => l.id === line.id ? { ...l, importer: e.target.value } : l))}>
                    <option value="">Select</option>
                    {["Exporter Sv X AB","Exporter Sv Y AB","Exporter Sv Z AB"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <select style={{ ...inp, fontSize: 12, padding: "5px 8px" }} value={line.receiver} onChange={e => setLines(ls => ls.map(l => l.id === line.id ? { ...l, receiver: e.target.value } : l))}>
                    <option value="">Select</option>
                    {["Company X AS","Company Y AS","Company Z AS"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <input style={{ ...inp, fontSize: 12, padding: "5px 8px" }} value={line.product_description} onChange={e => setLines(ls => ls.map(l => l.id === line.id ? { ...l, product_description: e.target.value } : l))} placeholder="Add" />
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <input style={{ ...inp, fontSize: 12, padding: "5px 8px", textAlign: "right" as const }} type="number" value={line.gross_weight} onChange={e => setLines(ls => ls.map(l => l.id === line.id ? { ...l, gross_weight: e.target.value } : l))} placeholder="0.00" />
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {i === lines.length - 1 && <button onClick={() => setLines(ls => [...ls, defaultLine()])} style={{ width: 22, height: 22, borderRadius: "50%", background: "#175CD3", color: "#fff", border: "none", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>}
                    {lines.length > 1 && <button onClick={() => setLines(ls => ls.filter(l => l.id !== line.id))} style={{ width: 22, height: 22, borderRadius: 2, background: "#FEF3F2", color: "#D92D20", border: "none", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>🗑</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", marginBottom: 12 }}>TRANSPORT</div>
        <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
          {([ ["decide_later","Decide Later"], ["own","Own Transport"], ["existing","Connect to existing Transport"] ] as [TransportLink, string][]).map(([val, label]) => (
            <label key={val} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 13, color: "#344054" }}>
              <div onClick={() => setTransportLink(val as TransportLink)} style={{ width: 16, height: 16, border: `2px solid ${transportLink === val ? "#175CD3" : "#D0D5DD"}`, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                {transportLink === val && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#175CD3", display: "block" }} />}
              </div>
              {label}
            </label>
          ))}
        </div>

        {transportLink === "own" && (
          <div style={{ background: "#F9FAFB", border: "1px solid #E4E7EC", borderRadius: 2, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>Own Transport</div>
            <TransportForm form={ownTransport} onChange={setOwnTransport} />
            <button onClick={onSave} disabled={saving} style={btnGreen}>
              {saving ? "Creating…" : "SEND SHIPMENT"}
            </button>
          </div>
        )}

        {transportLink === "existing" && (
          <div style={{ background: "#F9FAFB", border: "1px solid #E4E7EC", borderRadius: 2, padding: "16px 18px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 12 }}>Connect to Existing Transport</div>
            <TransportPickerTable transports={transports} selected={selectedTransport} onSelect={setSelectedTransport} search={transportSearch} onSearch={setTransportSearch} />
          </div>
        )}
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DigitollStart() {
  const [transports, setTransports] = useState<Transport[]>([]);
  const [shipments, setShipments]   = useState<Shipment[]>([]);
  const [filter, setFilter]         = useState("all");
  const [search, setSearch]         = useState("");
  const [active, setActive]         = useState<ActiveModal>(null);
  const [saving, setSaving]         = useState(false);
  const [sendDone, setSendDone]     = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu]   = useState<{ x: number; y: number; id: string } | null>(null);
  const [sortCol, setSortCol]       = useState<string | null>(null);
  const [sortDir, setSortDir]       = useState<"asc" | "desc">("asc");

  function handleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  function getSortValue(row: RowType, col: string): string {
    const d = row.data;
    if (col === "kind")    return row.kind;
    if (col === "state")   return d.state_id ?? "";
    if (col === "id")      return d.reference ?? "";
    if (col === "sh")      return row.kind === "transport" ? String((d as Transport).shipments?.length ?? 0) : "";
    if (col === "date")    return (d as Transport).ata ?? d.eta ?? d.created_at ?? "";
    if (col === "actor")   return d.actor ?? "";
    if (col === "resp")    return d.responsible ?? "";
    if (col === "carrier") return d.carrier ?? "";
    if (col === "border")  return d.border_crossing ?? "";
    if (col === "transport") return row.kind === "shipment" ? ((d as Shipment).own_transport ? "Own transport" : (d as Shipment).transports?.reference ?? "Unlinked") : ((d as Transport).transport_mode ?? "");
    if (col === "status")  return d.status ?? "";
    if (col === "decl")    return d.declaration_status ?? "";
    return "";
  }

  // ── Context menu state ────────────────────────────────────────────────────
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  // ── Transport form state ──────────────────────────────────────────────────
  const emptyTrForm = { transport_mode: "Road", identifier: "", border_crossing: "", eta: "" };
  const [trForm, setTrForm]                     = useState(emptyTrForm);
  const [trShipmentSearch, setTrShipmentSearch] = useState("");
  const [trLinkedShipments, setTrLinkedShipments] = useState<string[]>([]);

  // ── Shipment form state ───────────────────────────────────────────────────
  const defaultLine = (): ShipmentLine => ({ id: crypto.randomUUID(), importer: "", receiver: "", product_description: "", gross_weight: "" });
  const [shLines, setShLines]                     = useState<ShipmentLine[]>([defaultLine()]);
  const [shTransportLink, setShTransportLink]     = useState<TransportLink>("decide_later");
  const [shTransportSearch, setShTransportSearch] = useState("");
  const [shSelectedTransport, setShSelectedTransport] = useState("");
  const [shOwnTransport, setShOwnTransport]       = useState(emptyTrForm);

  const load = useCallback(async () => {
    const [tr, sh] = await Promise.all([
      fetch("/api/transports").then(r => r.json()),
      fetch("/api/shipments").then(r => r.json()),
    ]);
    if (Array.isArray(tr)) setTransports(tr);
    if (Array.isArray(sh)) setShipments(sh);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Listen for topbar + button event ─────────────────────────────────────
  useEffect(() => {
    function handleTopbarCreate() {
      setShowCreateMenu(prev => !prev);
    }
    window.addEventListener("digitoll:open-create-menu", handleTopbarCreate);
    return () => window.removeEventListener("digitoll:open-create-menu", handleTopbarCreate);
  }, []);

  // Synka topbar delete-knappens opacity med selectedRows
  useEffect(() => {
    const btn = document.getElementById("topbar-delete-btn");
    if (btn) btn.style.opacity = selectedRows.size > 0 ? "1" : "0.5";
  }, [selectedRows]);

  // Lyssna på delete-event från topbaren
  useEffect(() => {
    function handleTopbarDelete() { deleteSelected(); }
    window.addEventListener("digitoll:delete-selected", handleTopbarDelete);
    return () => window.removeEventListener("digitoll:delete-selected", handleTopbarDelete);
  }, [selectedRows]);

  function close() { setActive(null); setSendDone(false); }

  function toggleRow(id: string) {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteSelected() {
    await Promise.all([...selectedRows].map(async id => {
      const tr = transports.find(t => t.id === id);
      const sh = shipments.find(s => s.id === id);
      if (tr) await fetch(`/api/transports/${id}`, { method: "DELETE" });
      if (sh) await fetch(`/api/shipments/${id}`, { method: "DELETE" });
    }));
    setSelectedRows(new Set());
    load();
  }

  async function deleteRow(id: string) {
    const tr = transports.find(t => t.id === id);
    const sh = shipments.find(s => s.id === id);
    if (tr) await fetch(`/api/transports/${id}`, { method: "DELETE" });
    if (sh) await fetch(`/api/shipments/${id}`, { method: "DELETE" });
    setSelectedRows(prev => { const next = new Set(prev); next.delete(id); return next; });
    setContextMenu(null);
    load();
  }

  // ── Open handlers ─────────────────────────────────────────────────────────
  function openNewTransport() {
    setTrForm(emptyTrForm); setTrLinkedShipments([]); setTrShipmentSearch("");
    setActive({ type: "new-transport" });
  }

  function openNewShipment() {
    setShLines([defaultLine()]); setShTransportLink("decide_later");
    setShTransportSearch(""); setShSelectedTransport(""); setShOwnTransport(emptyTrForm);
    setActive({ type: "new-shipment" });
  }

  function openRow(row: RowType) {
    const s = row.data.status;
    if (row.kind === "transport") {
      const t = row.data as Transport;
      if (["incomplete"].includes(s))         { setTrForm({ transport_mode: t.transport_mode ?? "Road", identifier: t.carrier ?? "", border_crossing: t.border_crossing ?? "", eta: toDatetimeLocal(t.eta) }); setTrLinkedShipments(t.shipments?.map(s => s.id) ?? []); setTrShipmentSearch(""); setActive({ type: "edit-transport", data: t }); }
      else if (s === "missing_shipments")     { setTrLinkedShipments(t.shipments?.map(s => s.id) ?? []); setTrShipmentSearch(""); setActive({ type: "link-shipments", data: t }); }
      else if (s === "awaiting_shipments")    { setActive({ type: "resolve-issues", data: t }); }
      else if (s === "ready")                 { setSendDone(false); setActive({ type: "send-transport", data: t }); }
      else if (s === "rejected")              { setActive({ type: "review-errors", data: t }); }
      else                                    { setActive({ type: "view-transport", data: t }); }
    } else {
      const sh = row.data as Shipment;
      if (["incomplete","complete_unlinked"].includes(s)) {
        setShLines([defaultLine()]); setShTransportLink(sh.own_transport ? "own" : sh.transport_id ? "existing" : "decide_later");
        setShTransportSearch(""); setShSelectedTransport(sh.transport_id ?? ""); setShOwnTransport(emptyTrForm);
        setActive({ type: "edit-shipment", data: sh });
      }
      else if (s === "ready")                 { setSendDone(false); setActive({ type: "send-shipment", data: sh }); }
      else if (s === "rejected")              { setActive({ type: "review-errors", data: sh }); }
      else                                    { setActive({ type: "view-shipment", data: sh }); }
    }
  }

  // ── Save helpers ──────────────────────────────────────────────────────────
  async function saveTransport(id: string | null) {
    setSaving(true);
    const hasRequiredFields = !!(trForm.transport_mode && trForm.border_crossing && trForm.eta);
    const newStatus = !hasRequiredFields
      ? "incomplete"
      : trLinkedShipments.length > 0
        ? "ready"
        : "missing_shipments";
    const body = { reference: trForm.identifier || `TR-${Date.now().toString().slice(-4)}`, transport_mode: trForm.transport_mode, border_crossing: trForm.border_crossing, eta: trForm.eta, carrier: trForm.identifier, status: newStatus };
    const res = id
      ? await fetch(`/api/transports/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/transports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const tr = await res.json();
      await Promise.all(trLinkedShipments.map(sid => fetch(`/api/shipments/${sid}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transport_id: tr.id }) })));
      close(); load();
    }
    setSaving(false);
  }

  async function linkShipmentsToTransport(transportId: string) {
    setSaving(true);

    // Länka alla valda shipments till transporten
    await Promise.all(trLinkedShipments.map(sid =>
      fetch(`/api/shipments/${sid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transport_id: transportId }),
      })
    ));

    // Hämta de länkade shipmentsens status för att avgöra transportstatus
    const linkedStatuses = await Promise.all(
      trLinkedShipments.map(sid =>
        fetch(`/api/shipments/${sid}`).then(r => r.json()).then(s => s.status as string)
      )
    );
    const allComplete = linkedStatuses.every(s => ["ready","complete_linked","sent","received","accepted"].includes(s));
    const newTransportStatus = allComplete ? "ready" : "awaiting_shipments";

    await fetch(`/api/transports/${transportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newTransportStatus }),
    });

    setSaving(false); close(); load();
  }

  async function saveShipment(id: string | null) {
    setSaving(true);
    let transportId = null;
    if (shTransportLink === "own") {
      const hasOwnTrFields = !!(shOwnTransport.transport_mode && shOwnTransport.border_crossing && shOwnTransport.eta);
      const ownTrStatus = hasOwnTrFields ? "missing_shipments" : "incomplete";
      const trRes = await fetch("/api/transports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference: shOwnTransport.identifier || `TR-${Date.now().toString().slice(-4)}`, transport_mode: shOwnTransport.transport_mode, border_crossing: shOwnTransport.border_crossing, eta: shOwnTransport.eta, status: ownTrStatus }) });
      if (trRes.ok) { const tr = await trRes.json(); transportId = tr.id; }
    } else if (shTransportLink === "existing") {
      transportId = shSelectedTransport || null;
    }
    // Shipment is ready if it has importer + receiver + product on at least one line
    const hasRequiredLines = shLines.some(l => l.importer && l.receiver && l.product_description);
    const isLinked = shTransportLink === "own" || (shTransportLink === "existing" && !!shSelectedTransport);
    const shStatus = hasRequiredLines
      ? isLinked ? "ready" : "complete_unlinked"
      : "incomplete";
    const body = { transport_id: transportId, own_transport: shTransportLink === "own", status: shStatus, actor: shLines[0]?.importer || "" };
    const res = id
      ? await fetch(`/api/shipments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/shipments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, reference: `SH-${Date.now().toString().slice(-4)}` }) });
    if (res.ok) { close(); load(); }
    setSaving(false);
  }

  async function sendRecord(type: "transport" | "shipment", id: string) {
    setSaving(true);
    await fetch(`/api/${type}s/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "sent" }) });
    setSaving(false); setSendDone(true); setTimeout(() => { close(); load(); }, 1800);
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
    if (filter === "today") {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end   = new Date(start.getTime() + 86400000);
      const eta   = new Date(d.eta ?? d.created_at);
      return eta >= start && eta < end;
    }
    if (filter === "this_week") {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dow   = now.getDay();
      const monday = new Date(start.getTime() - ((dow === 0 ? 6 : dow - 1) * 86400000));
      const sunday = new Date(monday.getTime() + 7 * 86400000);
      const eta   = new Date(d.eta ?? d.created_at);
      return eta >= monday && eta < sunday;
    }
    if (filter === "next_7") {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end   = new Date(start.getTime() + 7 * 86400000);
      const eta   = new Date(d.eta ?? d.created_at);
      return eta >= start && eta < end;
    }
    return true;
  });
  const sortedRows = sortCol
    ? [...filteredRows].sort((a, b) => {
        const av = getSortValue(a, sortCol).toLowerCase();
        const bv = getSortValue(b, sortCol).toLowerCase();
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      })
    : filteredRows;

  const trRows      = sortedRows.filter(r => r.kind === "transport");
  const shRows      = sortedRows.filter(r => r.kind === "shipment");
  const activeCount = allRows.filter(r => ["incomplete","missing_shipments","awaiting_shipments","complete_unlinked"].includes(r.data.status)).length;

  function nextAction(row: RowType): string {
    const s = row.data.status;
    if (["incomplete","complete_unlinked"].includes(s)) return "Complete";
    if (s === "missing_shipments")  return "Link shipments";
    if (s === "awaiting_shipments") return "Resolve issues";
    if (s === "ready")              return row.kind === "transport" ? "Send transport" : "Send shipment";
    if (s === "rejected")           return "Review errors";
    return "View";
  }

  function TableSection({ rows, heading }: { rows: RowType[]; heading: string }) {
    if (rows.length === 0) return null;
    return (
      <>
        <tr><td colSpan={14} style={{ background: "#fff", fontSize: 10, fontWeight: 700, color: "#003160", padding: "8px 14px 4px", letterSpacing: ".07em", textTransform: "uppercase" as const, borderBottom: "1px solid #E4E7EC" }}>{heading}</td></tr>
        {rows.map(row => {
          const d = row.data;
          const isTransport = row.kind === "transport";
          const next = nextAction(row);
          const isActionable = !["View"].includes(next);
          const transportDisplay = row.kind === "shipment"
            ? (d as Shipment).own_transport ? "Own transport" : (d as Shipment).transports ? `Incl. ${(d as Shipment).transports!.reference}` : "Unlinked"
            : (d as Transport).transport_mode ?? "—";
          return (
            <tr key={d.id} onClick={() => openRow(row)} style={{ borderBottom: "1px solid #E4E7EC", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F9FAFB")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <td style={{ padding: "9px 14px" }}><span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 20, borderRadius: 2, fontSize: 10, fontWeight: 700, background: isTransport ? "#EFF8FF" : "#ECFDF3", color: isTransport ? "#175CD3" : "#027A48" }}>{isTransport ? "TR" : "SH"}</span></td>
              <td style={{ padding: "9px 8px", fontWeight: 600, color: "#175CD3", fontSize: 12.5 }}>{d.state_id ?? "—"}</td>
              <td style={{ padding: "9px 8px", color: "#667085", fontSize: 12.5 }}>{d.reference}</td>
              <td style={{ padding: "9px 8px", color: "#98A2B3", fontSize: 12 }}>{isTransport ? (d as Transport).shipments?.length ?? 0 : "—"}</td>
              <td style={{ padding: "9px 8px", color: "#667085", fontSize: 11.5, whiteSpace: "nowrap" as const }}>{(d as Transport).ata ? "ATA " : "ETA "}{fmtDate((d as Transport).ata ?? d.eta)}</td>
              <td style={{ padding: "9px 8px", color: "#344054", fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{d.actor ?? "—"}</td>
              <td style={{ padding: "9px 8px", color: "#98A2B3", fontSize: 12 }}>{d.responsible ?? "—"}</td>
              <td style={{ padding: "9px 8px", color: "#98A2B3", fontSize: 12 }}>{d.carrier ?? "—"}</td>
              <td style={{ padding: "9px 8px", color: "#344054", fontSize: 12.5 }}>{d.border_crossing ?? "—"}</td>
              <td style={{ padding: "9px 8px", color: "#667085", fontSize: 12.5, whiteSpace: "nowrap" as const }}>{transportDisplay}</td>
              <td style={{ padding: "9px 8px" }}><StatusPill status={d.status} /></td>
              <td style={{ padding: "9px 8px" }}>
                {isActionable
                  ? <button onClick={e => { e.stopPropagation(); openRow(row); }} style={{ ...btnPri, padding: "4px 10px", fontSize: 11.5, whiteSpace: "nowrap" as const, background: "#446BF9" }}>{next}</button>
                  : <button onClick={e => { e.stopPropagation(); openRow(row); }} style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 2, background: "transparent", color: "#446BF9", fontSize: 11.5, fontWeight: 500, border: "1px solid #446BF9", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>View</button>}
              </td>
              <td style={{ padding: "9px 8px" }}><DeclBadge status={d.declaration_status} /></td>
              <td style={{ padding: "9px 4px" }}><button onClick={e => { e.stopPropagation(); openRow(row); }} style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", borderRadius: 2, color: "#98A2B3", fontSize: 18 }}>⋯</button></td>
            </tr>
          );
        })}
      </>
    );
  }

  // ShipmentFormBody är nu en riktig komponent med props för att undvika remount-problem

  const isOpen = (t: string) => active?.type === t;
  const activeData = active && "data" in active ? active.data : null;
  const activeTr   = active?.type === "edit-transport" || active?.type === "view-transport" || active?.type === "link-shipments" || active?.type === "resolve-issues" || active?.type === "send-transport" || (active?.type === "review-errors" && "transport_mode" in (activeData ?? {})) ? activeData as Transport : null;
  const activeSh   = active?.type === "edit-shipment"  || active?.type === "view-shipment"  || active?.type === "send-shipment"  || (active?.type === "review-errors" && !("transport_mode" in (activeData ?? {}))) ? activeData as Shipment : null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        .row-checkbox { opacity: 0; transition: opacity 0.1s; }
        .row-checkbox.visible, .row-checkbox.checked { opacity: 1 !important; }
        tr:hover .row-checkbox { opacity: 1; }
        .select-all-th:hover .row-checkbox { opacity: 1; }
      `}</style>
      {/* Context menu */}
      {contextMenu && (
        <div onClick={() => setContextMenu(null)} style={{ position: "fixed", inset: 0, zIndex: 900 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x, background: "#fff", border: "1px solid #E4E7EC", borderRadius: 2, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 901, minWidth: 160, overflow: "hidden" }}>
            <div
              onClick={() => deleteRow(contextMenu.id)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", cursor: "pointer", fontSize: 13, color: "#B42318", fontFamily: "inherit" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#FEF3F2")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontFamily: "Material Icons", fontSize: 16, lineHeight: 1 }}>delete_forever</span>
              Delete row
            </div>
          </div>
        </div>
      )}

      {/* ── Context menu (triggas från topbar + knappen) ───────────────────── */}
      {showCreateMenu && (
        <CreateMenu
          onNewTransport={openNewTransport}
          onNewShipment={openNewShipment}
          onClose={() => setShowCreateMenu(false)}
        />
      )}

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div style={{ padding: "14px 20px 0", background: "#fff", borderBottom: "1px solid #E4E7EC" }}>
        {/* Filter row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          {(() => {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const todayEnd   = new Date(todayStart.getTime() + 86400000);
            const weekEnd    = new Date(todayStart.getTime() + 7 * 86400000);

            const todayCount   = allRows.filter(r => { const d = new Date(r.data.eta ?? r.data.created_at); return d >= todayStart && d < todayEnd; }).length;
            const thisWeekCount = allRows.filter(r => { const d = new Date(r.data.eta ?? r.data.created_at); return d >= todayStart && d < new Date(todayStart.getTime() + 7 * 86400000 / 7 * 7); }).length;
            const next7Count   = allRows.filter(r => { const d = new Date(r.data.eta ?? r.data.created_at); return d >= todayStart && d < weekEnd; }).length;

            const filters: [string, string, number][] = [
              ["all",       "All",          allRows.length],
              ["active",    "Active",       activeCount],
              ["completed", "Completed",    allRows.filter(r => ["accepted","arrived"].includes(r.data.status)).length],
              ["today",     "Today",        todayCount],
              ["this_week", "This Week",    thisWeekCount],
              ["next_7",    "Next 7 Days",  next7Count],
            ];

            return filters.map(([key, label, count]) => (
              <button key={key} onClick={() => setFilter(key)} style={fBtn(filter === key)}>
                {label}
                <span style={{
                  background: filter === key ? "rgba(255,255,255,0.25)" : "#003160",
                  color: "#fff",
                  borderRadius: 2, padding: "1px 7px", fontSize: 10, fontWeight: 700,
                  minWidth: 20, textAlign: "center" as const, lineHeight: "16px",
                }}>{count}</span>
              </button>
            ));
          })()}

          {/* Right icons */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 2 }}>
            <button
              onClick={deleteSelected}
              disabled={selectedRows.size === 0}
              title={selectedRows.size > 0 ? `Delete ${selectedRows.size} selected` : "Select rows to delete"}
              style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: selectedRows.size > 0 ? "pointer" : "default", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit", opacity: selectedRows.size > 0 ? 1 : 0.5 }}
            >
              <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#003160", lineHeight: 1, userSelect: "none" }}>delete_forever</span>
            </button>
            {[
              { icon: "≡", title: "Group" },
              { icon: "↺", title: "Refresh", onClick: load },
              { icon: "⊟", title: "Filter" },
            ].map(({ icon, title, onClick }) => (
              <button key={title} title={title} onClick={onClick} style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: "pointer", borderRadius: 2, color: "#003160", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#E4E7EC", margin: "0 -20px 10px" }} />
        {/* Search row — full width, under filter */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff" }}>
            <span style={{ fontFamily: "Material Icons", fontSize: 18, color: "#98A2B3", lineHeight: 1, userSelect: "none" as const }}>search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              style={{ border: "none", outline: "none", fontSize: 13, color: "#344054", fontFamily: "inherit", width: "100%", background: "transparent" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ border: "none", background: "transparent", color: "#98A2B3", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>✕</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ background: "#fff", minWidth: 1400 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 12.5 }}>
            <colgroup>
              <col style={{ width: 36 }} />
              <col style={{ width: 42 }} />
              <col style={{ width: 55 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 36 }} />
              <col style={{ width: 54 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 155 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 36 }} />
            </colgroup>
            <thead>
              <tr style={{ background: "#fff", borderBottom: "2px solid #E4E7EC" }}>
                {/* Select-all checkbox i header */}
                <th className="select-all-th" style={{ width: 36, padding: "0 8px", textAlign: "center" as const }} onClick={() => {
                  if (selectedRows.size === sortedRows.length && sortedRows.length > 0) {
                    setSelectedRows(new Set());
                  } else {
                    setSelectedRows(new Set(sortedRows.map(r => r.data.id)));
                  }
                }}>
                  <div className={`row-checkbox${selectedRows.size > 0 ? " checked" : ""}`} style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${selectedRows.size > 0 ? "#446BF9" : "#D0D5DD"}`, background: selectedRows.size === sortedRows.length && sortedRows.length > 0 ? "#446BF9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", cursor: "pointer", transition: "all 0.1s" }}>
                    {selectedRows.size > 0 && selectedRows.size === sortedRows.length && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1, fontWeight: 700 }}>✓</span>}
                    {selectedRows.size > 0 && selectedRows.size < sortedRows.length && <span style={{ width: 8, height: 2, background: "#446BF9", display: "block", borderRadius: 1 }} />}
                  </div>
                </th>
                {([
                  ["Type", "kind"], ["State", "state"], ["ID", "id"], ["SH", "sh"], ["Source", null],
                  ["Date", "date"], ["Actor", "actor"], ["Responsible", "resp"],
                  ["Carrier", "carrier"], ["Border", "border"], ["Transport", "transport"],
                  ["Status", "status"], ["TMS Order", null], ["TMS Trip", null],
                  ["Next step", null], ["Declaration", "decl"], ["", null]
                ] as [string, string | null][]).map(([h, col], i) => (
                  <th key={i} onClick={col ? () => handleSort(col) : undefined} style={{ padding: "9px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#003160", letterSpacing: ".04em", textTransform: "uppercase" as const, whiteSpace: "nowrap", overflow: "hidden", cursor: col ? "pointer" : "default", userSelect: "none" }}>
                    {h}{col && sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(row => {
                const d = row.data;
                const isTransport = row.kind === "transport";
                const next = nextAction(row);
                const isActionable = !["View"].includes(next);
                const transportDisplay = row.kind === "shipment"
                  ? (d as Shipment).own_transport ? "Own transport" : (d as Shipment).transports ? `Incl. ${(d as Shipment).transports!.reference}` : "Unlinked"
                  : (d as Transport).transport_mode ?? "—";
                return (
                  <tr key={d.id}
                    onClick={() => openRow(row)}
                    onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, id: d.id }); }}
                    style={{ borderBottom: "1px solid #E4E7EC", cursor: "pointer", background: selectedRows.has(d.id) ? "#EDF0F3" : "transparent" }}
                    onMouseEnter={e => { if (!selectedRows.has(d.id)) e.currentTarget.style.background = "#F9FAFB"; else e.currentTarget.style.background = "#EDF0F3"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = selectedRows.has(d.id) ? "#EDF0F3" : "transparent"; }}
                  >
                    <td style={{ padding: "0 8px", width: 36, textAlign: "center" as const }} onClick={e => { e.stopPropagation(); toggleRow(d.id); }}>
                      <div className={`row-checkbox${selectedRows.has(d.id) ? " checked" : ""}`} style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${selectedRows.has(d.id) ? "#446BF9" : "#D0D5DD"}`, background: selectedRows.has(d.id) ? "#446BF9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", transition: "all 0.1s" }}>
                        {selectedRows.has(d.id) && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1, fontWeight: 700 }}>✓</span>}
                      </div>
                    </td>
                    <td style={{ padding: "9px 14px" }}><span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 20, borderRadius: 2, fontSize: 10, fontWeight: 700, background: isTransport ? "#EFF8FF" : "#ECFDF3", color: isTransport ? "#175CD3" : "#027A48" }}>{isTransport ? "TR" : "SH"}</span></td>
                    <td style={{ padding: "9px 8px" }}><SourceBadge source={d.source} /></td>
                    <td style={{ padding: "9px 8px", fontWeight: 600, color: "#175CD3", fontSize: 12.5 }}>{d.state_id ?? "—"}</td>
                    <td style={{ padding: "9px 8px", color: "#667085", fontSize: 12.5 }}>{d.reference}</td>
                    <td style={{ padding: "9px 8px", color: "#98A2B3", fontSize: 12 }}>{isTransport ? (d as Transport).shipments?.length ?? 0 : "—"}</td>
                    <td style={{ padding: "9px 8px", color: "#667085", fontSize: 11.5, whiteSpace: "nowrap" as const }}>{(d as Transport).ata ? "ATA " : "ETA "}{fmtDate((d as Transport).ata ?? d.eta)}</td>
                    <td style={{ padding: "9px 8px", color: "#344054", fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{d.actor ?? "—"}</td>
                    <td style={{ padding: "9px 8px", color: "#98A2B3", fontSize: 12 }}>{d.responsible ?? "—"}</td>
                    <td style={{ padding: "9px 8px", color: "#98A2B3", fontSize: 12 }}>{d.carrier ?? "—"}</td>
                    <td style={{ padding: "9px 8px", color: "#344054", fontSize: 12.5 }}>{d.border_crossing ?? "—"}</td>
                    <td style={{ padding: "9px 8px", color: "#667085", fontSize: 12.5, whiteSpace: "nowrap" as const }}>{transportDisplay}</td>
                    <td style={{ padding: "9px 8px" }}><StatusPill status={d.status} /></td>
                    <td style={{ padding: "9px 8px", color: "#667085", fontSize: 12 }}>{isTransport ? "—" : ((d as Shipment).tms_order_ref ?? "—")}</td>
                    <td style={{ padding: "9px 8px", color: "#667085", fontSize: 12 }}>{isTransport ? ((d as Transport).tms_trip_ref ?? "—") : "—"}</td>
                    <td style={{ padding: "9px 8px" }}>
                      {isActionable
                        ? <button onClick={e => { e.stopPropagation(); openRow(row); }} style={{ ...btnPri, padding: "4px 10px", fontSize: 11.5, whiteSpace: "nowrap" as const, background: "#446BF9" }}>{next}</button>
                        : <button onClick={e => { e.stopPropagation(); openRow(row); }} style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 2, background: "transparent", color: "#446BF9", fontSize: 11.5, fontWeight: 500, border: "1px solid #446BF9", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>View</button>}
                    </td>
                    <td style={{ padding: "9px 8px" }}><DeclBadge status={d.declaration_status} /></td>
                    <td style={{ padding: "9px 4px" }}><button onClick={e => { e.stopPropagation(); openRow(row); }} style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", borderRadius: 2, color: "#98A2B3", fontSize: 18 }}>⋯</button></td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 && <tr><td colSpan={14} style={{ padding: 40, textAlign: "center", color: "#98A2B3", fontSize: 13 }}>No records found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── NEW TRANSPORT ─────────────────────────────────────────────────── */}
      <Overlay open={isOpen("new-transport")} onClose={close} wide>
        <ModalHeader title="New Transport (Master)" onClose={close} />
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          <TransportForm form={trForm} onChange={setTrForm} />
          <div style={{ background: "#F9FAFB", border: "1px solid #E4E7EC", borderRadius: 2, padding: "16px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", marginBottom: 3 }}>SHIPMENTS</div>
            <div style={{ fontSize: 12, color: "#667085", marginBottom: 10 }}>Link the shipments to this transport now or later</div>
            <ShipmentPickerTable shipments={shipments} selected={trLinkedShipments} onToggle={id => setTrLinkedShipments(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} search={trShipmentSearch} onSearch={setTrShipmentSearch} />
          </div>
          {trLinkedShipments.length > 0 && trForm.border_crossing && trForm.eta && (
            <button onClick={() => saveTransport(null)} disabled={saving} style={btnGreen}>{saving ? "Creating…" : "SUBMIT TRANSPORT"}</button>
          )}
        </div>
        <ModalFooter><button style={btnSec} onClick={close}>Cancel</button><button style={{ ...btnPri, opacity: saving ? 0.7 : 1 }} onClick={() => saveTransport(null)} disabled={saving}>{saving ? "Saving…" : "Save"}</button></ModalFooter>
      </Overlay>

      {/* ── EDIT TRANSPORT ────────────────────────────────────────────────── */}
      <Overlay open={isOpen("edit-transport")} onClose={close} wide>
        <ModalHeader title={`Complete Transport — ${activeTr?.state_id ?? activeTr?.reference ?? ""}`} subtitle="Fill in the missing fields to complete this transport" onClose={close} />
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ marginBottom: 4 }}><StatusPill status={activeTr?.status ?? ""} /></div>
          <TransportForm form={trForm} onChange={setTrForm} />
          <div style={{ background: "#F9FAFB", border: "1px solid #E4E7EC", borderRadius: 2, padding: "16px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", marginBottom: 3 }}>SHIPMENTS</div>
            <div style={{ fontSize: 12, color: "#667085", marginBottom: 10 }}>Link the shipments to this transport now or later</div>
            <ShipmentPickerTable shipments={shipments} selected={trLinkedShipments} onToggle={id => setTrLinkedShipments(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} search={trShipmentSearch} onSearch={setTrShipmentSearch} />
          </div>
          {trLinkedShipments.length > 0 && trForm.border_crossing && trForm.eta && (
            <button onClick={() => saveTransport(activeTr?.id ?? null)} disabled={saving} style={btnGreen}>{saving ? "Saving…" : "SUBMIT TRANSPORT"}</button>
          )}
        </div>
        <ModalFooter><button style={btnSec} onClick={close}>Cancel</button><button style={{ ...btnPri, opacity: saving ? 0.7 : 1 }} onClick={() => saveTransport(activeTr?.id ?? null)} disabled={saving}>{saving ? "Saving…" : "Save"}</button></ModalFooter>
      </Overlay>

      {/* ── LINK SHIPMENTS ────────────────────────────────────────────────── */}
      <Overlay open={isOpen("link-shipments")} onClose={close} wide>
        <ModalHeader title={`Link Shipments — ${activeTr?.state_id ?? activeTr?.reference ?? ""}`} subtitle="Select which shipments should be included in this transport" onClose={close} />
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ marginBottom: 4 }}><StatusPill status={activeTr?.status ?? ""} /></div>
          <ShipmentPickerTable shipments={shipments} selected={trLinkedShipments} onToggle={id => setTrLinkedShipments(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} search={trShipmentSearch} onSearch={setTrShipmentSearch} />
        </div>
        <ModalFooter>
          <button style={btnSec} onClick={close}>Cancel</button>
          <button style={{ ...btnPri, opacity: (saving || trLinkedShipments.length === 0) ? 0.6 : 1 }} onClick={() => linkShipmentsToTransport(activeTr?.id ?? "")} disabled={saving || trLinkedShipments.length === 0}>
            {saving ? "Linking…" : `Link ${trLinkedShipments.length > 0 ? trLinkedShipments.length + " " : ""}shipment${trLinkedShipments.length !== 1 ? "s" : ""}`}
          </button>
        </ModalFooter>
      </Overlay>

      {/* ── RESOLVE ISSUES ────────────────────────────────────────────────── */}
      <Overlay open={isOpen("resolve-issues")} onClose={close} wide>
        <ModalHeader title={`Resolve Issues — ${activeTr?.state_id ?? activeTr?.reference ?? ""}`} subtitle="The following linked shipments have incomplete data" onClose={close} />
        <div style={{ padding: "20px 22px" }}>
          <div style={{ marginBottom: 16 }}><StatusPill status={activeTr?.status ?? ""} /></div>
          <div style={{ border: "1px solid #E4E7EC", borderRadius: 2, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ background: "#F9FAFB" }}>
                {["Shipment","Actor","Status","Issue"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#667085", fontSize: 10.5, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {(activeTr?.shipments ?? []).length === 0 && <tr><td colSpan={4} style={{ padding: 20, textAlign: "center", color: "#98A2B3" }}>No linked shipments</td></tr>}
                {(activeTr?.shipments ?? []).map(s => (
                  <tr key={s.id} style={{ borderTop: "1px solid #F2F4F7" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#344054" }}>{s.reference}</td>
                    <td style={{ padding: "10px 12px", color: "#667085" }}>{s.actor ?? "—"}</td>
                    <td style={{ padding: "10px 12px" }}><StatusPill status={s.status} /></td>
                    <td style={{ padding: "10px 12px", color: "#B54708", fontSize: 12 }}>{["incomplete"].includes(s.status) ? "Missing required fields" : "Awaiting data"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 14, background: "#FFFAEB", border: "1px solid #FEDF89", borderRadius: 2, padding: "10px 14px", fontSize: 12.5, color: "#B54708" }}>
            Open each shipment individually to complete its data before sending the transport.
          </div>
        </div>
        <ModalFooter><button style={btnSec} onClick={close}>Close</button></ModalFooter>
      </Overlay>

      {/* ── SEND TRANSPORT ────────────────────────────────────────────────── */}
      <Overlay open={isOpen("send-transport")} onClose={close}>
        <ModalHeader title={`Send Transport — ${activeTr?.state_id ?? activeTr?.reference ?? ""}`} onClose={close} />
        <div style={{ padding: "20px 22px" }}>
          {sendDone ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#027A48", marginBottom: 6 }}>Transport sent!</div>
              <div style={{ fontSize: 13, color: "#667085" }}>Submitted to Norwegian Customs — awaiting confirmation.</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}><StatusPill status={activeTr?.status ?? ""} /></div>
              <DetailField label="Reference"       value={activeTr?.reference} />
              <DetailField label="Border crossing" value={activeTr?.border_crossing} />
              <DetailField label="Transport mode"  value={activeTr?.transport_mode} />
              <DetailField label="ETA"             value={fmtDate(activeTr?.eta ?? null)} />
              <DetailField label="Carrier"         value={activeTr?.carrier} />
              <DetailField label="Linked shipments" value={activeTr?.shipments?.length ?? 0} />
              <div style={{ marginTop: 16, background: "#EFF8FF", border: "1px solid #B2CCFF", borderRadius: 2, padding: "10px 14px", fontSize: 12.5, color: "#175CD3" }}>
                This will submit the transport declaration to Norwegian Customs (Tolletaten).
              </div>
            </>
          )}
        </div>
        {!sendDone && (
          <ModalFooter>
            <button style={btnSec} onClick={close}>Cancel</button>
            <button style={btnSec} onClick={() => {
              if (activeTr) {
                setTrForm({ transport_mode: activeTr.transport_mode ?? "Road", identifier: activeTr.carrier ?? "", border_crossing: activeTr.border_crossing ?? "", eta: toDatetimeLocal(activeTr.eta) });
                setTrLinkedShipments(activeTr.shipments?.map(s => s.id) ?? []);
                setTrShipmentSearch("");
                setActive({ type: "edit-transport", data: activeTr });
              }
            }}>Edit</button>
            <button style={{ ...btnGreen, width: "auto", padding: "8px 20px", borderRadius: 2 }} onClick={() => sendRecord("transport", activeTr?.id ?? "")} disabled={saving}>
              {saving ? "Sending…" : "Confirm & send to Customs"}
            </button>
          </ModalFooter>
        )}
      </Overlay>

      {/* ── NEW SHIPMENT ──────────────────────────────────────────────────── */}
      <Overlay open={isOpen("new-shipment")} onClose={close} wide>
        <ModalHeader title="New Shipment (House)" onClose={close} />
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          <ShipmentFormBody lines={shLines} setLines={setShLines} transportLink={shTransportLink} setTransportLink={setShTransportLink} selectedTransport={shSelectedTransport} setSelectedTransport={setShSelectedTransport} transportSearch={shTransportSearch} setTransportSearch={setShTransportSearch} ownTransport={shOwnTransport} setOwnTransport={setShOwnTransport} transports={transports} saving={saving} onSave={() => saveShipment(null)} defaultLine={defaultLine} />
        </div>
        <ModalFooter><button style={btnSec} onClick={close}>Cancel</button><button style={{ ...btnPri, opacity: saving ? 0.7 : 1 }} onClick={() => saveShipment(null)} disabled={saving}>{saving ? "Saving…" : "Save"}</button></ModalFooter>
      </Overlay>

      {/* ── EDIT SHIPMENT ─────────────────────────────────────────────────── */}
      <Overlay open={isOpen("edit-shipment")} onClose={close} wide>
        <ModalHeader title={`Complete Shipment — ${activeSh?.state_id ?? activeSh?.reference ?? ""}`} subtitle="Fill in the missing fields to complete this shipment" onClose={close} />
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ marginBottom: 4 }}><StatusPill status={activeSh?.status ?? ""} /></div>
          <ShipmentFormBody lines={shLines} setLines={setShLines} transportLink={shTransportLink} setTransportLink={setShTransportLink} selectedTransport={shSelectedTransport} setSelectedTransport={setShSelectedTransport} transportSearch={shTransportSearch} setTransportSearch={setShTransportSearch} ownTransport={shOwnTransport} setOwnTransport={setShOwnTransport} transports={transports} saving={saving} onSave={() => saveShipment(activeSh?.id ?? null)} defaultLine={defaultLine} />
        </div>
        <ModalFooter><button style={btnSec} onClick={close}>Cancel</button><button style={{ ...btnPri, opacity: saving ? 0.7 : 1 }} onClick={() => saveShipment(activeSh?.id ?? null)} disabled={saving}>{saving ? "Saving…" : "Save"}</button></ModalFooter>
      </Overlay>

      {/* ── SEND SHIPMENT ─────────────────────────────────────────────────── */}
      <Overlay open={isOpen("send-shipment")} onClose={close}>
        <ModalHeader title={`Send Shipment — ${activeSh?.state_id ?? activeSh?.reference ?? ""}`} onClose={close} />
        <div style={{ padding: "20px 22px" }}>
          {sendDone ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#027A48", marginBottom: 6 }}>Shipment sent!</div>
              <div style={{ fontSize: 13, color: "#667085" }}>Submitted to Norwegian Customs — awaiting confirmation.</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}><StatusPill status={activeSh?.status ?? ""} /></div>
              <DetailField label="Reference" value={activeSh?.reference} />
              <DetailField label="Actor"     value={activeSh?.actor} />
              <DetailField label="Transport" value={activeSh?.own_transport ? "Own transport" : activeSh?.transports?.reference ?? "Unlinked"} />
              <DetailField label="ETA"       value={fmtDate(activeSh?.eta ?? null)} />
              <div style={{ marginTop: 16, background: "#EFF8FF", border: "1px solid #B2CCFF", borderRadius: 2, padding: "10px 14px", fontSize: 12.5, color: "#175CD3" }}>
                This will submit the shipment declaration to Norwegian Customs (Tolletaten).
              </div>
            </>
          )}
        </div>
        {!sendDone && (
          <ModalFooter>
            <button style={btnSec} onClick={close}>Cancel</button>
            <button style={btnSec} onClick={() => {
              if (activeSh) {
                setShLines([defaultLine()]);
                setShTransportLink(activeSh.own_transport ? "own" : activeSh.transport_id ? "existing" : "decide_later");
                setShTransportSearch("");
                setShSelectedTransport(activeSh.transport_id ?? "");
                setShOwnTransport(emptyTrForm);
                setActive({ type: "edit-shipment", data: activeSh });
              }
            }}>Edit</button>
            <button style={{ ...btnGreen, width: "auto", padding: "8px 20px", borderRadius: 2 }} onClick={() => sendRecord("shipment", activeSh?.id ?? "")} disabled={saving}>
              {saving ? "Sending…" : "Confirm & send to Customs"}
            </button>
          </ModalFooter>
        )}
      </Overlay>

      {/* ── REVIEW ERRORS ─────────────────────────────────────────────────── */}
      <Overlay open={isOpen("review-errors")} onClose={close}>
        <ModalHeader title={`Review Errors — ${activeData && "state_id" in activeData ? activeData.state_id ?? "" : ""}`} subtitle="The declaration was rejected by Norwegian Customs" onClose={close} />
        <div style={{ padding: "20px 22px" }}>
          <div style={{ marginBottom: 16 }}><StatusPill status="rejected" /></div>
          <div style={{ background: "#FEF3F2", border: "1px solid #FECDCA", borderRadius: 2, padding: "14px 16px", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#B42318", marginBottom: 8 }}>Rejection reasons from Tolletaten:</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#344054", lineHeight: 1.8 }}>
              <li>Missing or invalid HS code on one or more items</li>
              <li>Gross weight does not match declared net weight</li>
              <li>Importer VAT number not recognised</li>
            </ul>
          </div>
          <div style={{ background: "#FFFAEB", border: "1px solid #FEDF89", borderRadius: 2, padding: "10px 14px", fontSize: 12.5, color: "#B54708" }}>
            Correct the errors and resubmit. The declaration has been saved as a draft.
          </div>
        </div>
        <ModalFooter>
          <button style={btnSec} onClick={close}>Close</button>
          <button style={btnPri} onClick={() => {
            if (activeTr) {
              setTrForm({ transport_mode: activeTr.transport_mode ?? "Road", identifier: activeTr.carrier ?? "", border_crossing: activeTr.border_crossing ?? "", eta: toDatetimeLocal(activeTr.eta) });
              setTrLinkedShipments(activeTr.shipments?.map(s => s.id) ?? []);
              setTrShipmentSearch("");
              setActive({ type: "edit-transport", data: activeTr });
            } else if (activeSh) {
              setShLines([defaultLine()]);
              setShTransportLink(activeSh.own_transport ? "own" : activeSh.transport_id ? "existing" : "decide_later");
              setShTransportSearch("");
              setShSelectedTransport(activeSh.transport_id ?? "");
              setShOwnTransport(emptyTrForm);
              setActive({ type: "edit-shipment", data: activeSh });
            }
          }}>Edit & resubmit</button>
        </ModalFooter>
      </Overlay>

      {/* ── VIEW TRANSPORT ────────────────────────────────────────────────── */}
      <Overlay open={isOpen("view-transport")} onClose={close}>
        <ModalHeader title={`Transport ${activeTr?.state_id ?? activeTr?.reference ?? ""}`} subtitle={activeTr?.reference} onClose={close} />
        <div style={{ padding: "20px 22px" }}>
          <div style={{ marginBottom: 16 }}><StatusPill status={activeTr?.status ?? ""} /></div>
          <DetailField label="Reference"        value={activeTr?.reference} />
          <DetailField label="Border crossing"  value={activeTr?.border_crossing} />
          <DetailField label="Transport mode"   value={activeTr?.transport_mode} />
          <DetailField label="ETA"              value={fmtDate(activeTr?.eta ?? null)} />
          <DetailField label="ATA"              value={fmtDate(activeTr?.ata ?? null)} />
          <DetailField label="Carrier"          value={activeTr?.carrier} />
          <DetailField label="Actor"            value={activeTr?.actor} />
          <DetailField label="Responsible"      value={activeTr?.responsible} />
          <DetailField label="Declaration"      value={<DeclBadge status={activeTr?.declaration_status ?? "none"} />} />
          <DetailField label="Linked shipments" value={activeTr?.shipments?.length ?? 0} />
        </div>
        <ModalFooter>
          <button style={btnSec} onClick={close}>Close</button>
          {!["sent","received","accepted","arrived","rejected"].includes(activeTr?.status ?? "") && (
            <button style={btnPri} onClick={() => {
              if (activeTr) {
                setTrForm({ transport_mode: activeTr.transport_mode ?? "Road", identifier: activeTr.carrier ?? "", border_crossing: activeTr.border_crossing ?? "", eta: toDatetimeLocal(activeTr.eta) });
                setTrLinkedShipments(activeTr.shipments?.map(s => s.id) ?? []);
                setTrShipmentSearch("");
                setActive({ type: "edit-transport", data: activeTr });
              }
            }}>Edit</button>
          )}
        </ModalFooter>
      </Overlay>

      {/* ── VIEW SHIPMENT ─────────────────────────────────────────────────── */}
      <Overlay open={isOpen("view-shipment")} onClose={close}>
        <ModalHeader title={`Shipment ${activeSh?.state_id ?? activeSh?.reference ?? ""}`} subtitle={activeSh?.reference} onClose={close} />
        <div style={{ padding: "20px 22px" }}>
          <div style={{ marginBottom: 16 }}><StatusPill status={activeSh?.status ?? ""} /></div>
          <DetailField label="Reference"   value={activeSh?.reference} />
          <DetailField label="Actor"       value={activeSh?.actor} />
          <DetailField label="Transport"   value={activeSh?.own_transport ? "Own transport" : activeSh?.transports?.reference ?? "Unlinked"} />
          <DetailField label="ETA"         value={fmtDate(activeSh?.eta ?? null)} />
          <DetailField label="Carrier"     value={activeSh?.carrier} />
          <DetailField label="Responsible" value={activeSh?.responsible} />
          <DetailField label="Declaration" value={<DeclBadge status={activeSh?.declaration_status ?? "none"} />} />
        </div>
        <ModalFooter>
          <button style={btnSec} onClick={close}>Close</button>
          {!["sent","received","accepted","arrived","rejected"].includes(activeSh?.status ?? "") && (
            <button style={btnPri} onClick={() => {
              if (activeSh) {
                setShLines([defaultLine()]);
                setShTransportLink(activeSh.own_transport ? "own" : activeSh.transport_id ? "existing" : "decide_later");
                setShTransportSearch("");
                setShSelectedTransport(activeSh.transport_id ?? "");
                setShOwnTransport(emptyTrForm);
                setActive({ type: "edit-shipment", data: activeSh });
              }
            }}>Edit</button>
          )}
        </ModalFooter>
      </Overlay>
    </div>
  );
}
