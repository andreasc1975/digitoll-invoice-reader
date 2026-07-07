"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface Order {
  id: string; reference: string; tags: string | null; service_code: string | null;
  consignor: string | null; consignee: string | null;
  departure: string | null; arrival: string | null;
  customs_status: string | null; gross_weight: number | null; packages: number | null;
  planning_status: string | null; departure_status: string | null;
  communication_status: string | null; trip_ids: string[]; digitoll_id: string | null;
  cms_id: string | null;
  // Customs declaration fields
  consignor_eori: string | null; consignee_eori: string | null; declarant_eori: string | null;
  invoice_number: string | null; invoice_value: number | null; invoice_currency: string | null;
  incoterms: string | null; payment_terms: string | null; country_of_origin: string | null;
  vehicle_reg_no: string | null; customs_place: string | null; customs_place_eta: string | null;
  customs_procedure: string | null; declaration_type: string | null;
  net_weight: number | null; statistical_value: number | null;
}
interface GoodsLine {
  id: string; sort_order: number; hs_code: string | null; description: string | null;
  country_of_origin: string | null; gross_weight: number | null; net_weight: number | null;
  packages: number | null; statistical_value: number | null; customs_procedure: string | null;
}
interface Trip {
  id: string; reference: string; from_city: string | null; to_city: string | null;
  departure: string | null; arrival: string | null; digitoll_id: string | null;
  vehicle_reg_no: string | null; customs_place: string | null;
}

const TABS = ["Order Information","WMS Information","Freight Lines","Packages","Price Lines","Economy","Tasks","Documents","Automation","Customs","Checklist","Logs"];
const INCOTERMS = ["EXW","FCA","FAS","FOB","CFR","CIF","CPT","CIP","DAP","DPU","DDP"];
const PROCEDURES = ["40 00 — Release for free circulation","42 00 — Free circulation with VAT exemption","61 00 — Re-export","63 00 — Re-export after inward processing","10 00 — Permanent export"];
const DECL_TYPES = ["H1 — Standard customs declaration","H2 — Simplified declaration","H3 — Declaration for low-value goods","I1 — Import declaration"];

function fmtD(d: string | null) { if (!d) return "—"; return d.slice(0,10); }
function n(v: number | null | undefined, dec = 2) { if (v == null) return ""; return v.toFixed(dec); }

const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box" as const, border: "1px solid #D0D5DD", borderRadius: 2, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", color: "#101828", outline: "none", background: "#fff" };
const sel: React.CSSProperties = { ...inp, cursor: "pointer" };
const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "#344054", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 6, display: "block" };
const sectionHead: React.CSSProperties = { padding: "10px 20px", borderBottom: "1px solid #F2F4F7", display: "flex", alignItems: "center", gap: 8 };

function FL({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <label style={lbl}>{children}{required && <span style={{ color: "#EF4444", marginLeft: 2 }}>*</span>}</label>;
}
function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, overflow: "hidden" }}>
      <div style={sectionHead}>
        <span style={{ fontFamily: "Material Icons", fontSize: 16, color: "#003160" }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>{title}</span>
      </div>
      <div style={{ padding: "16px 20px" }}>{children}</div>
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [linkedTrips, setLinkedTrips] = useState<Trip[]>([]);
  const [goodsLines, setGoodsLines] = useState<GoodsLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Customs");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendMode, setSendMode] = useState<"linked"|"standalone"|null>(null);
  const [form, setForm] = useState<Partial<Order>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/tms/orders/${id}`);
    if (res.ok) {
      const d = await res.json();
      setOrder(d);
      setForm(d);
      if (d.trip_ids?.length) {
        const tr = await fetch("/api/tms/trips");
        if (tr.ok) {
          const all = await tr.json();
          const linked = all.filter((t: Trip) => d.trip_ids.includes(t.id));
          setLinkedTrips(linked);
          // Inherit transport fields from linked trip if not set on order
          if (!d.vehicle_reg_no && linked.length > 0) {
            setForm(prev => ({ ...prev, vehicle_reg_no: linked[0].vehicle_reg_no ?? "", customs_place: linked[0].customs_place ?? "" }));
          }
        }
      }
      // Load goods lines
      const gl = await fetch(`/api/tms/orders/${id}/goods-lines`);
      if (gl.ok) setGoodsLines(await gl.json());
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!document.querySelector("link[href*='Material+Icons']")) {
      const l = document.createElement("link"); l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
      document.head.appendChild(l);
    }
  }, []);

  async function save(patch: Partial<Order>) {
    setForm(prev => ({ ...prev, ...patch }));
    await fetch(`/api/tms/orders/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function addGoodsLine() {
    const res = await fetch(`/api/tms/orders/${id}/goods-lines`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "", hs_code: "", packages: order?.packages, gross_weight: order?.gross_weight, country_of_origin: form.country_of_origin }),
    });
    if (res.ok) { const l = await res.json(); setGoodsLines(prev => [...prev, l]); }
  }

  async function updateGoodsLine(lineId: string, patch: Partial<GoodsLine>) {
    setGoodsLines(prev => prev.map(l => l.id === lineId ? { ...l, ...patch } : l));
    await fetch(`/api/tms/orders/goods-lines/${lineId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function deleteGoodsLine(lineId: string) {
    await fetch(`/api/tms/orders/goods-lines/${lineId}`, { method: "DELETE" });
    setGoodsLines(prev => prev.filter(l => l.id !== lineId));
  }

  async function sendToDigitoll() {
    setSending(true); setSendError(null);
    const res = await fetch(`/api/tms/orders/${id}/send-digitoll`, { method: "POST" });
    if (res.ok) { const d = await res.json(); setSendMode(d.mode); await load(); }
    else { const d = await res.json().catch(() => ({})); setSendError(d.error ?? "Failed"); }
    setSending(false);
  }

  if (loading) return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#98A2B3", fontSize: 13, fontFamily: "Inter,sans-serif" }}>Loading…</div>;
  if (!order) return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#EF4444", fontSize: 13, fontFamily: "Inter,sans-serif" }}>Order not found</div>;

  const csColor = order.customs_status === "Cleared" ? { bg: "#ECFDF3", color: "#027A48" } : { bg: "#FFFAEB", color: "#B54708" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "Inter,sans-serif", background: "#fff" }}>

      {/* TOP BAR */}
      <div style={{ borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", padding: "5px 16px", minHeight: 62, gap: 12, flexShrink: 0 }}>
        <button onClick={() => router.back()} style={{ width: 28, height: 28, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          onMouseEnter={e => e.currentTarget.style.background="#F2F4F7"} onMouseLeave={e => e.currentTarget.style.background="none"}>
          <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#003160" }}>arrow_back</span>
        </button>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 8.5, fontWeight: 700, color: "#003160", textTransform: "uppercase", letterSpacing: ".08em" }}>ORDER</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#101828" }}>{order.reference}</div>
        </div>
        <div style={{ width: 1, height: 32, background: "#E4E7EC", flexShrink: 0, margin: "0 4px" }} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0 }}>
          {[
            { icon: "inventory_2", label: "PACKAGES", value: order.packages ?? "—" },
            { icon: "monitor_weight", label: "GROSS KG", value: n(order.gross_weight, 2) || "—" },
            { icon: "straighten", label: "LOAD M", value: "—" },
            { icon: "view_in_ar", label: "CUBIC M", value: "—" },
          ].map(({ icon, label, value }, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 20px", borderRight: i < 3 ? "1px solid #F2F4F7" : "none" }}>
              <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#003160", lineHeight: 1, marginBottom: 3 }}>{icon}</span>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#101828", fontFamily: "'Roboto Mono',monospace", lineHeight: 1 }}>{String(value)}</div>
              <div style={{ fontSize: 8, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".06em", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <div style={{ display: "flex", borderRadius: 2, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}>
            <button style={{ padding: "0 16px", height: 34, background: "linear-gradient(180deg,#446BF9 0%,#0058AC 100%)", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: ".03em", borderRight: "1px solid rgba(255,255,255,0.2)", fontFamily: "inherit" }}>Order actions</button>
            <button style={{ width: 32, height: 34, background: "linear-gradient(180deg,#446BF9 0%,#0058AC 100%)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "Material Icons", fontSize: 16 }}>arrow_drop_down</span>
            </button>
          </div>
          <button onClick={() => router.back()} style={{ width: 30, height: 30, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={e => e.currentTarget.style.background="#F2F4F7"} onMouseLeave={e => e.currentTarget.style.background="none"}>
            <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#003160" }}>close</span>
          </button>
        </div>
      </div>

      {/* ROUTE SECTION */}
      <div style={{ borderBottom: "1px solid #E4E7EC", flexShrink: 0, height: 280, display: "flex", flexDirection: "column", justifyContent: "center", background: "#FAFAFA", padding: "0 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 28 }}>
          <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, padding: "12px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", minWidth: 180 }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".07em", marginBottom: 4 }}>CONSIGNOR</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#101828" }}>{order.consignor ?? "—"}</div>
            <div style={{ fontSize: 10.5, color: "#667085", marginTop: 3 }}>{form.consignor_eori ? `EORI: ${form.consignor_eori}` : "No EORI"}</div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-start", paddingTop: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 2, background: csColor.bg, color: csColor.color }}>{order.customs_status ?? "Unknown"}</span>
            {order.planning_status && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 2, background: "#F2F4F7", color: "#667085" }}>{order.planning_status}</span>}
          </div>
          <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, padding: "12px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", minWidth: 180, textAlign: "right" as const }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".07em", marginBottom: 4 }}>CONSIGNEE</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#101828" }}>{order.consignee ?? "—"}</div>
            <div style={{ fontSize: 10.5, color: "#667085", marginTop: 3 }}>{form.consignee_eori ? `EORI: ${form.consignee_eori}` : "No EORI"}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <div style={{ flexShrink: 0, textAlign: "center" as const, marginRight: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22C55E", border: "2px solid #fff", boxShadow: "0 0 0 2px #22C55E", margin: "0 auto 6px" }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: "#344054" }}>{fmtD(order.departure)}</div>
            <div style={{ fontSize: 9.5, color: "#98A2B3" }}>ETD</div>
          </div>
          <div style={{ flex: 1, position: "relative" as const, display: "flex", alignItems: "center" }}>
            <div style={{ width: "100%", height: 2, background: "#D0D5DD" }} />
            <div style={{ position: "absolute" as const, left: "50%", transform: "translateX(-50%)", background: "#fff", border: "1px solid #E4E7EC", borderRadius: 3, padding: "5px 12px", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", whiteSpace: "nowrap" as const }}>
              <span style={{ fontFamily: "Material Icons", fontSize: 16, color: "#003160" }}>local_shipping</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#101828" }}>{linkedTrips.length > 0 ? linkedTrips[0].reference : order.service_code ?? "—"}</span>
            </div>
            <span style={{ fontFamily: "Material Icons", fontSize: 18, color: "#667085", position: "absolute" as const, right: -4, top: "50%", transform: "translateY(-50%)" }}>chevron_right</span>
          </div>
          <div style={{ flexShrink: 0, textAlign: "center" as const, marginLeft: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff", border: "2px solid #D0D5DD", margin: "0 auto 6px" }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: "#344054" }}>{fmtD(order.arrival)}</div>
            <div style={{ fontSize: 9.5, color: "#98A2B3" }}>ETA</div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", background: "#DFE5EB", flexShrink: 0, height: 48, alignItems: "center", justifyContent: "center", gap: 2, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "0 14px", height: 28, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.7px", textTransform: "uppercase" as const, color: tab === t ? "#fff" : "#003160", background: tab === t ? "#003160" : "transparent", border: "none", borderRadius: 2, cursor: "pointer", whiteSpace: "nowrap" as const, fontFamily: "inherit", flexShrink: 0 }}
            onMouseEnter={e => { if (tab !== t) e.currentTarget.style.background = "rgba(0,49,96,0.08)"; }}
            onMouseLeave={e => { if (tab !== t) e.currentTarget.style.background = "transparent"; }}>
            {t}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflow: "auto", background: "#F8FAFC" }}>
        {tab !== "Customs" ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#98A2B3", fontSize: 13 }}>{tab} — content coming soon</div>
        ) : (
          <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* STATUS BANNER */}
            {order.digitoll_id ? (
              <div style={{ background: "#ECFDF3", border: "1px solid #A7F0BA", borderRadius: 4, padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#027A48" }}>check_circle</span>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#027A48" }}>Sent to Digitoll</div>
                  <div style={{ fontSize: 11, color: "#065F46", marginTop: 2 }}>
                    House ID: <span style={{ fontWeight: 600 }}>{order.digitoll_id}</span>
                    {sendMode === "linked" && <span style={{ marginLeft: 10, background: "#D1FAE5", padding: "1px 6px", borderRadius: 2, fontSize: 10, fontWeight: 700 }}>Linked to trip</span>}
                    {sendMode === "standalone" && <span style={{ marginLeft: 10, background: "#E0F2FE", padding: "1px 6px", borderRadius: 2, fontSize: 10, fontWeight: 700, color: "#0369A1" }}>Standalone</span>}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#98A2B3" }}>cloud_upload</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#344054" }}>Not sent to Digitoll</div>
                  <div style={{ fontSize: 11, color: "#667085", marginTop: 2 }}>
                    {linkedTrips.some(t => t.digitoll_id) ? "A linked trip is in Digitoll — this order will attach to that Master." : "Fill in the declaration details below, then send."}
                  </div>
                </div>
                {(() => {
                  const hasGoods = goodsLines.some(l => l.description);
                  const canSend = !!(order.consignor && order.consignee && order.gross_weight && order.packages && hasGoods);
                  return (
                    <button onClick={sendToDigitoll} disabled={sending || !canSend}
                      title={!canSend ? "Required: Consignor, Consignee, Gross weight, Packages, and at least one goods line with description" : ""}
                      style={{ padding: "8px 20px", border: "none", borderRadius: 2, background: (!canSend || sending) ? "#D0D5DD" : "linear-gradient(180deg,#446BF9 0%,#0058AC 100%)", color: (!canSend || sending) ? "#98A2B3" : "#fff", fontSize: 12, fontWeight: 700, cursor: (!canSend || sending) ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <span style={{ fontFamily: "Material Icons", fontSize: 15, lineHeight: 1 }}>send</span>
                      {sending ? "Sending…" : "Send to Digitoll"}
                    </button>
                  );
                })()}
              </div>
            )}

            {sendError && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 4, padding: "10px 16px", fontSize: 12, color: "#B42318", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "Material Icons", fontSize: 16 }}>error_outline</span>{sendError}
              </div>
            )}

            {/* SECTION 1 — PARTIES */}
            <Section icon="people" title="Parties">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div>
                  <FL>Consignor (avsändare)</FL>
                  <input style={inp} value={form.consignor ?? ""} onChange={e => setForm(f => ({ ...f, consignor: e.target.value }))} onBlur={e => save({ consignor: e.target.value })} placeholder="Company name" />
                </div>
                <div>
                  <FL>Consignor EORI</FL>
                  <input style={inp} value={form.consignor_eori ?? ""} onChange={e => setForm(f => ({ ...f, consignor_eori: e.target.value }))} onBlur={e => save({ consignor_eori: e.target.value })} placeholder="SE1234567890" />
                </div>
                <div>
                  <FL>Declarant EORI</FL>
                  <input style={inp} value={form.declarant_eori ?? ""} onChange={e => setForm(f => ({ ...f, declarant_eori: e.target.value }))} onBlur={e => save({ declarant_eori: e.target.value })} placeholder="SE0987654321" />
                </div>
                <div>
                  <FL>Consignee (mottaker)</FL>
                  <input style={inp} value={form.consignee ?? ""} onChange={e => setForm(f => ({ ...f, consignee: e.target.value }))} onBlur={e => save({ consignee: e.target.value })} placeholder="Company name" />
                </div>
                <div>
                  <FL>Consignee EORI</FL>
                  <input style={inp} value={form.consignee_eori ?? ""} onChange={e => setForm(f => ({ ...f, consignee_eori: e.target.value }))} onBlur={e => save({ consignee_eori: e.target.value })} placeholder="NO123456789" />
                </div>
              </div>
            </Section>

            {/* SECTION 2 — SHIPMENT */}
            <Section icon="receipt_long" title="Shipment">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div>
                  <FL required>Invoice Number</FL>
                  <input style={inp} value={form.invoice_number ?? ""} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} onBlur={e => save({ invoice_number: e.target.value })} placeholder="INV-2026-001" />
                </div>
                <div>
                  <FL required>Invoice Value</FL>
                  <input style={inp} type="number" value={form.invoice_value ?? ""} onChange={e => setForm(f => ({ ...f, invoice_value: parseFloat(e.target.value) || null }))} onBlur={e => save({ invoice_value: parseFloat(e.target.value) || null })} placeholder="0.00" />
                </div>
                <div>
                  <FL>Currency</FL>
                  <select style={sel} value={form.invoice_currency ?? "NOK"} onChange={e => { setForm(f => ({ ...f, invoice_currency: e.target.value })); save({ invoice_currency: e.target.value }); }}>
                    {["NOK","SEK","DKK","EUR","USD","GBP"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <FL>Incoterms</FL>
                  <select style={sel} value={form.incoterms ?? ""} onChange={e => { setForm(f => ({ ...f, incoterms: e.target.value })); save({ incoterms: e.target.value }); }}>
                    <option value="">— Select —</option>
                    {INCOTERMS.map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <FL>Country of Origin</FL>
                  <input style={inp} value={form.country_of_origin ?? ""} onChange={e => setForm(f => ({ ...f, country_of_origin: e.target.value }))} onBlur={e => save({ country_of_origin: e.target.value })} placeholder="e.g. SE, NO, PL" />
                </div>
                <div>
                  <FL>Net Weight (kg)</FL>
                  <input style={inp} type="number" value={form.net_weight ?? ""} onChange={e => setForm(f => ({ ...f, net_weight: parseFloat(e.target.value) || null }))} onBlur={e => save({ net_weight: parseFloat(e.target.value) || null })} placeholder="0.00" />
                </div>
              </div>
            </Section>

            {/* SECTION 3 — TRANSPORT */}
            <Section icon="local_shipping" title="Transport">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div>
                  <FL>Vehicle Reg. No.</FL>
                  <input style={inp} value={form.vehicle_reg_no ?? linkedTrips[0]?.vehicle_reg_no ?? ""} onChange={e => setForm(f => ({ ...f, vehicle_reg_no: e.target.value }))} onBlur={e => save({ vehicle_reg_no: e.target.value })} placeholder="e.g. ABC 123" />
                </div>
                <div>
                  <FL>Customs Place</FL>
                  <input style={inp} value={form.customs_place ?? linkedTrips[0]?.customs_place ?? ""} onChange={e => setForm(f => ({ ...f, customs_place: e.target.value }))} onBlur={e => save({ customs_place: e.target.value })} placeholder="e.g. Svinesund (E6)" />
                </div>
                <div>
                  <FL>Customs Place ETA</FL>
                  <input style={inp} type="datetime-local" value={form.customs_place_eta ? form.customs_place_eta.slice(0,16) : ""} onChange={e => setForm(f => ({ ...f, customs_place_eta: e.target.value }))} onBlur={e => save({ customs_place_eta: e.target.value })} />
                </div>
              </div>
              {linkedTrips.length > 0 && (
                <div style={{ marginTop: 12, padding: "8px 12px", background: "#F0F5FF", borderRadius: 2, fontSize: 11, color: "#446BF9", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: "Material Icons", fontSize: 14 }}>info</span>
                  Transport data inherited from trip {linkedTrips[0].reference} — edit above to override
                </div>
              )}
            </Section>

            {/* SECTION 4 — DECLARATION */}
            <Section icon="description" title="Declaration">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <FL required>Customs Procedure</FL>
                  <select style={sel} value={form.customs_procedure ?? ""} onChange={e => { setForm(f => ({ ...f, customs_procedure: e.target.value })); save({ customs_procedure: e.target.value }); }}>
                    <option value="">— Select procedure —</option>
                    {PROCEDURES.map(p => <option key={p} value={p.slice(0,5)}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <FL>Declaration Type</FL>
                  <select style={sel} value={form.declaration_type ?? "H1"} onChange={e => { setForm(f => ({ ...f, declaration_type: e.target.value })); save({ declaration_type: e.target.value }); }}>
                    {DECL_TYPES.map(d => <option key={d} value={d.slice(0,2)}>{d}</option>)}
                  </select>
                </div>
              </div>
            </Section>

            {/* SECTION 5 — GOODS LINES */}
            <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ ...sectionHead, justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "Material Icons", fontSize: 16, color: "#003160" }}>category</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>Goods Lines</span>
                  <span style={{ fontSize: 10, color: "#98A2B3" }}>{goodsLines.length} line{goodsLines.length !== 1 ? "s" : ""}</span>
                </div>
                <button onClick={addGoodsLine} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 12px", border: "1px solid #D0D5DD", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 11.5, fontWeight: 600, color: "#003160", fontFamily: "inherit" }}>
                  <span style={{ fontFamily: "Material Icons", fontSize: 14 }}>add</span> Add line
                </button>
              </div>
              {goodsLines.length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center" as const, color: "#98A2B3", fontSize: 12 }}>No goods lines yet. Click "Add line" to add a goods item.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #E4E7EC", background: "#F8FAFC" }}>
                        {["#","HS Code","Description","Origin","Gross kg","Net kg","Packages","Stat. Value","Procedure",""].map(h => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left" as const, fontSize: 9.5, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".05em", whiteSpace: "nowrap" as const }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {goodsLines.map((line, i) => (
                        <tr key={line.id} style={{ borderBottom: "1px solid #F2F4F7" }}
                          onMouseEnter={e => e.currentTarget.style.background="#F8FAFC"}
                          onMouseLeave={e => e.currentTarget.style.background=""}>
                          <td style={{ padding: "6px 12px", color: "#98A2B3", fontSize: 11 }}>{i+1}</td>
                          <td style={{ padding: "4px 8px" }}>
                            <input style={{ ...inp, width: 90 }} value={line.hs_code ?? ""} onChange={e => updateGoodsLine(line.id, { hs_code: e.target.value })} placeholder="0000.00.00" />
                          </td>
                          <td style={{ padding: "4px 8px" }}>
                            <input style={{ ...inp, width: 160 }} value={line.description ?? ""} onChange={e => updateGoodsLine(line.id, { description: e.target.value })} placeholder="Description" />
                          </td>
                          <td style={{ padding: "4px 8px" }}>
                            <input style={{ ...inp, width: 60 }} value={line.country_of_origin ?? ""} onChange={e => updateGoodsLine(line.id, { country_of_origin: e.target.value })} placeholder="SE" />
                          </td>
                          <td style={{ padding: "4px 8px" }}>
                            <input style={{ ...inp, width: 80 }} type="number" value={line.gross_weight ?? ""} onChange={e => updateGoodsLine(line.id, { gross_weight: parseFloat(e.target.value) || null })} placeholder="0.00" />
                          </td>
                          <td style={{ padding: "4px 8px" }}>
                            <input style={{ ...inp, width: 80 }} type="number" value={line.net_weight ?? ""} onChange={e => updateGoodsLine(line.id, { net_weight: parseFloat(e.target.value) || null })} placeholder="0.00" />
                          </td>
                          <td style={{ padding: "4px 8px" }}>
                            <input style={{ ...inp, width: 70 }} type="number" value={line.packages ?? ""} onChange={e => updateGoodsLine(line.id, { packages: parseInt(e.target.value) || null })} placeholder="0" />
                          </td>
                          <td style={{ padding: "4px 8px" }}>
                            <input style={{ ...inp, width: 90 }} type="number" value={line.statistical_value ?? ""} onChange={e => updateGoodsLine(line.id, { statistical_value: parseFloat(e.target.value) || null })} placeholder="0.00" />
                          </td>
                          <td style={{ padding: "4px 8px" }}>
                            <select style={{ ...sel, width: 90 }} value={line.customs_procedure ?? ""} onChange={e => updateGoodsLine(line.id, { customs_procedure: e.target.value })}>
                              <option value="">—</option>
                              {PROCEDURES.map(p => <option key={p} value={p.slice(0,5)}>{p.slice(0,5)}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: "4px 8px" }}>
                            <button onClick={() => deleteGoodsLine(line.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontFamily: "Material Icons", fontSize: 16 }}>delete_outline</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SECTION 6 — LINKED TRIPS */}
            {linkedTrips.length > 0 && (
              <Section icon="local_shipping" title="Linked Trips">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #E4E7EC" }}>
                      {["Reference","From","To","Departure","Arrival","Digitoll"].map(h => (
                        <th key={h} style={{ padding: "8px 0", textAlign: "left" as const, fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".05em", paddingRight: 16 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {linkedTrips.map(t => (
                      <tr key={t.id} style={{ borderBottom: "1px solid #F2F4F7" }}
                        onMouseEnter={e => e.currentTarget.style.background="#F8FAFC"}
                        onMouseLeave={e => e.currentTarget.style.background=""}>
                        <td style={{ padding: "10px 16px 10px 0", fontWeight: 600, color: "#175CD3", cursor: "pointer" }} onClick={() => router.push(`/tms/trips/${t.id}`)}>{t.reference}</td>
                        <td style={{ padding: "10px 16px 10px 0", color: "#344054" }}>{t.from_city ?? "—"}</td>
                        <td style={{ padding: "10px 16px 10px 0", color: "#344054" }}>{t.to_city ?? "—"}</td>
                        <td style={{ padding: "10px 16px 10px 0", color: "#667085" }}>{fmtD(t.departure)}</td>
                        <td style={{ padding: "10px 16px 10px 0", color: "#667085" }}>{fmtD(t.arrival)}</td>
                        <td style={{ padding: "10px 0" }}>
                          {t.digitoll_id
                            ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "#027A48" }}><span style={{ fontFamily: "Material Icons", fontSize: 13 }}>check_circle</span>{t.digitoll_id}</span>
                            : <span style={{ fontSize: 11, color: "#98A2B3" }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

          </div>
        )}
      </div>
    </div>
  );
}