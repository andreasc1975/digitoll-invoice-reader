"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface Order {
  id: string;
  reference: string;
  tags: string | null;
  service_code: string | null;
  consignor: string | null;
  consignee: string | null;
  departure: string | null;
  arrival: string | null;
  customs_status: string | null;
  gross_weight: number | null;
  packages: number | null;
  planning_status: string | null;
  departure_status: string | null;
  communication_status: string | null;
  trip_ids: string[];
  digitoll_id: string | null;
  cms_id: string | null;
}

interface Trip {
  id: string;
  reference: string;
  from_city: string | null;
  to_city: string | null;
  departure: string | null;
  arrival: string | null;
  digitoll_id: string | null;
}

const TABS = ["Order Information", "WMS Information", "Freight Lines", "Packages", "Price Lines", "Economy", "Tasks", "Documents", "Automation", "Customs", "Checklist", "Logs"];

function fmtD(d: string | null) {
  if (!d) return "—";
  return d.slice(0, 10);
}
function n(v: number | null | undefined, dec = 2) {
  if (v == null) return "0." + "0".repeat(dec);
  return v.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [linkedTrips, setLinkedTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Customs");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/tms/orders/${id}`);
    if (res.ok) {
      const d = await res.json();
      setOrder(d);
      // Load linked trips
      if (d.trip_ids?.length) {
        const tr = await fetch("/api/tms/trips");
        if (tr.ok) {
          const all = await tr.json();
          setLinkedTrips(all.filter((t: Trip) => d.trip_ids.includes(t.id)));
        }
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!document.querySelector("link[href*='Material+Icons']")) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
      document.head.appendChild(l);
    }
  }, []);

  const [sendMode, setSendMode] = useState<"linked"|"standalone"|null>(null);

  async function sendToDigitoll() {
    setSending(true);
    setSendError(null);
    const res = await fetch(`/api/tms/orders/${id}/send-digitoll`, { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      setSendMode(d.mode);
      await load();
    } else {
      const d = await res.json().catch(() => ({}));
      setSendError(d.error ?? "Failed to send to Digitoll");
    }
    setSending(false);
  }

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#98A2B3", fontSize: 13, fontFamily: "Inter,sans-serif" }}>
      Loading…
    </div>
  );
  if (!order) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#EF4444", fontSize: 13, fontFamily: "Inter,sans-serif" }}>
      Order not found
    </div>
  );

  const csColor = order.customs_status === "Cleared"
    ? { bg: "#ECFDF3", color: "#027A48" }
    : { bg: "#FFFAEB", color: "#B54708" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "Inter,sans-serif", background: "#fff" }}>

      {/* ── TOP BAR ── */}
      <div style={{ borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", padding: "5px 16px", minHeight: 62, gap: 12, flexShrink: 0 }}>
        <button onClick={() => router.back()}
          style={{ width: 28, height: 28, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.background = "#F2F4F7"}
          onMouseLeave={e => e.currentTarget.style.background = "none"}>
          <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#003160", lineHeight: 1 }}>arrow_back</span>
        </button>

        {/* Order label */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 8.5, fontWeight: 700, color: "#003160", textTransform: "uppercase", letterSpacing: ".08em" }}>ORDER</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", lineHeight: 1.2 }}>{order.reference}</div>
        </div>

        {order.tags && (
          <span style={{ fontFamily: "Material Icons", fontSize: 16, color: "#98A2B3", lineHeight: 1 }}>local_offer</span>
        )}

        <div style={{ width: 1, height: 32, background: "#E4E7EC", flexShrink: 0, margin: "0 4px" }} />

        {/* Stats */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0 }}>
          {[
            { icon: "inventory_2",    label: "PACKAGES",    value: n(order.packages, 0),      mono: true },
            { icon: "monitor_weight", label: "GROSS KG",    value: n(order.gross_weight, 2),  mono: true },
            { icon: "straighten",     label: "LOAD M",      value: "0.00",                    mono: true },
            { icon: "view_in_ar",     label: "CUBIC M",     value: "0.00",                    mono: true },
          ].map(({ icon, label, value, mono }, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 20px", borderRight: i < 3 ? "1px solid #F2F4F7" : "none" }}>
              <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#003160", lineHeight: 1, marginBottom: 3 }}>{icon}</span>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#101828", fontFamily: mono ? "'Roboto Mono',monospace" : "inherit", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 8, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".06em", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <div style={{ display: "flex", borderRadius: 2, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}>
            <button style={{ padding: "0 16px", height: 34, background: "linear-gradient(180deg,#446BF9 0%,#0058AC 100%)", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: ".03em", borderRight: "1px solid rgba(255,255,255,0.2)", fontFamily: "inherit" }}>
              Order actions
            </button>
            <button style={{ width: 32, height: 34, background: "linear-gradient(180deg,#446BF9 0%,#0058AC 100%)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "Material Icons", fontSize: 16, lineHeight: 1 }}>arrow_drop_down</span>
            </button>
          </div>
          <button style={{ width: 30, height: 30, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={e => e.currentTarget.style.background = "#F2F4F7"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}>
            <span style={{ fontFamily: "Material Icons", fontSize: 18, color: "#003160", lineHeight: 1 }}>open_in_new</span>
          </button>
          <button onClick={() => router.back()}
            style={{ width: 30, height: 30, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={e => e.currentTarget.style.background = "#F2F4F7"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}>
            <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#003160", lineHeight: 1 }}>close</span>
          </button>
        </div>
      </div>

      {/* ── CONSIGNOR / CONSIGNEE / ROUTE SECTION — 280px ── */}
      <div style={{ borderBottom: "1px solid #E4E7EC", flexShrink: 0, height: 280, display: "flex", flexDirection: "column", justifyContent: "center", position: "relative" as const, background: "#FAFAFA", padding: "0 40px" }}>

        {/* Row 1: Consignor (left) — Consignee (right) */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 28 }}>
          {/* Consignor */}
          <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, padding: "12px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", minWidth: 180 }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".07em", marginBottom: 4 }}>CONSIGNOR</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#101828" }}>{order.consignor ?? "—"}</div>
            <div style={{ fontSize: 10.5, color: "#667085", marginTop: 3 }}>—</div>
          </div>

          {/* Status badges — centered top */}
          <div style={{ display: "flex", gap: 6, alignItems: "flex-start", paddingTop: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 2, background: csColor.bg, color: csColor.color }}>
              {order.customs_status ?? "Unknown"}
            </span>
            {order.planning_status && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 2, background: "#F2F4F7", color: "#667085" }}>
                {order.planning_status}
              </span>
            )}
          </div>

          {/* Consignee */}
          <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, padding: "12px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", minWidth: 180, textAlign: "right" as const }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".07em", marginBottom: 4 }}>CONSIGNEE</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#101828" }}>{order.consignee ?? "—"}</div>
            <div style={{ fontSize: 10.5, color: "#667085", marginTop: 3 }}>—</div>
          </div>
        </div>

        {/* Row 2: ETD — vehicle line — ETA */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>

          {/* ETD */}
          <div style={{ flexShrink: 0, textAlign: "center" as const, marginRight: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22C55E", border: "2px solid #fff", boxShadow: "0 0 0 2px #22C55E", margin: "0 auto 6px" }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: "#344054" }}>{fmtD(order.departure)}</div>
            <div style={{ fontSize: 9.5, color: "#98A2B3" }}>ETD</div>
          </div>

          {/* Line + vehicle */}
          <div style={{ flex: 1, position: "relative" as const, display: "flex", alignItems: "center" }}>
            <div style={{ width: "100%", height: 2, background: "#D0D5DD" }} />
            {/* Vehicle card on the line */}
            <div style={{ position: "absolute" as const, left: "50%", transform: "translateX(-50%)", background: "#fff", border: "1px solid #E4E7EC", borderRadius: 3, padding: "5px 12px", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", whiteSpace: "nowrap" as const }}>
              <span style={{ fontFamily: "Material Icons", fontSize: 16, color: "#003160", lineHeight: 1 }}>local_shipping</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#101828" }}>
                {linkedTrips.length > 0 ? linkedTrips[0].reference : order.service_code ?? "—"}
              </span>
            </div>
            {/* Arrow */}
            <span style={{ fontFamily: "Material Icons", fontSize: 18, color: "#667085", position: "absolute" as const, right: -4, top: "50%", transform: "translateY(-50%)" }}>chevron_right</span>
          </div>

          {/* ETA */}
          <div style={{ flexShrink: 0, textAlign: "center" as const, marginLeft: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff", border: "2px solid #D0D5DD", margin: "0 auto 6px" }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: "#344054" }}>{fmtD(order.arrival)}</div>
            <div style={{ fontSize: 9.5, color: "#98A2B3" }}>ETA</div>
          </div>

        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: "flex", background: "#DFE5EB", flexShrink: 0, height: 48, alignItems: "center", justifyContent: "center", gap: 2, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: "0 14px",
              height: 28,
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.7px",
              textTransform: "uppercase" as const,
              color: tab === t ? "#fff" : "#003160",
              background: tab === t ? "#003160" : "transparent",
              border: "none",
              borderRadius: 2,
              cursor: "pointer",
              whiteSpace: "nowrap" as const,
              fontFamily: "inherit",
              flexShrink: 0,
            }}
            onMouseEnter={e => { if (tab !== t) e.currentTarget.style.background = "rgba(0,49,96,0.08)"; }}
            onMouseLeave={e => { if (tab !== t) e.currentTarget.style.background = "transparent"; }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, overflow: "auto", background: "#F8FAFC" }}>
        {tab !== "Customs" ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#98A2B3", fontSize: 13 }}>
            {tab} — content coming soon
          </div>
        ) : (
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Status banner */}
            {order.digitoll_id ? (
              <div style={{ background: "#ECFDF3", border: "1px solid #A7F0BA", borderRadius: 4, padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#027A48" }}>check_circle</span>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#027A48" }}>Sent to Digitoll</div>
                  <div style={{ fontSize: 11, color: "#065F46", marginTop: 2 }}>
                    House ID: <span style={{ fontWeight: 600 }}>{order.digitoll_id}</span>
                    {sendMode === "linked" && <span style={{ marginLeft: 10, background: "#D1FAE5", padding: "1px 6px", borderRadius: 2, fontSize: 10, fontWeight: 700 }}>Linked to trip</span>}
                    {sendMode === "standalone" && <span style={{ marginLeft: 10, background: "#E0F2FE", padding: "1px 6px", borderRadius: 2, fontSize: 10, fontWeight: 700, color: "#0369A1" }}>Standalone submission</span>}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#98A2B3" }}>cloud_upload</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#344054" }}>Not sent to Digitoll</div>
                  <div style={{ fontSize: 11, color: "#667085", marginTop: 2 }}>
                    {linkedTrips.some(t => t.digitoll_id)
                      ? "A linked trip is in Digitoll — this order will be attached to that trip's Master."
                      : linkedTrips.length > 0
                      ? "Linked to a trip not yet in Digitoll — will create standalone submission."
                      : "No trip linked — will create a standalone Transport + Master + House in Digitoll."}
                  </div>
                </div>
                <button onClick={sendToDigitoll} disabled={sending}
                  style={{ marginLeft: "auto", padding: "8px 20px", border: "none", borderRadius: 2, background: sending ? "#98A2B3" : "linear-gradient(180deg,#446BF9 0%,#0058AC 100%)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span style={{ fontFamily: "Material Icons", fontSize: 15, lineHeight: 1 }}>send</span>
                  {sending ? "Sending…" : "Send to Digitoll"}
                </button>
              </div>
            )}

            {sendError && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 4, padding: "10px 16px", fontSize: 12, color: "#B42318", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "Material Icons", fontSize: 16 }}>error_outline</span>
                {sendError}
              </div>
            )}

            {/* Order details */}
            <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ padding: "10px 20px", borderBottom: "1px solid #F2F4F7", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "Material Icons", fontSize: 16, color: "#003160" }}>info</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>Consignment Details</span>
              </div>
              <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                {[
                  { label: "Consignor", value: order.consignor },
                  { label: "Consignee", value: order.consignee },
                  { label: "Service Code", value: order.service_code },
                  { label: "Gross Weight (kg)", value: order.gross_weight != null ? n(order.gross_weight, 2) : "—" },
                  { label: "Packages", value: order.packages != null ? String(order.packages) : "—" },
                  { label: "Customs Status", value: order.customs_status },
                  { label: "Departure", value: fmtD(order.departure) },
                  { label: "Arrival", value: fmtD(order.arrival) },
                  { label: "Planning Status", value: order.planning_status },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#667085", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 12.5, color: "#101828", fontWeight: 500 }}>{value ?? "—"}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Linked trips */}
            <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ padding: "10px 20px", borderBottom: "1px solid #F2F4F7", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "Material Icons", fontSize: 16, color: "#003160" }}>local_shipping</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>Linked Trips</span>
                <span style={{ fontSize: 10, color: "#98A2B3", marginLeft: 4 }}>{linkedTrips.length} trip{linkedTrips.length !== 1 ? "s" : ""}</span>
              </div>
              {linkedTrips.length === 0 ? (
                <div style={{ padding: "24px 20px", textAlign: "center" as const, color: "#98A2B3", fontSize: 12 }}>
                  No trips linked. Link from the orders list.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #E4E7EC" }}>
                      {["Reference", "From", "To", "Departure", "Arrival", "Digitoll"].map(h => (
                        <th key={h} style={{ padding: "8px 16px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {linkedTrips.map(t => (
                      <tr key={t.id} style={{ borderBottom: "1px solid #F2F4F7" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                        onMouseLeave={e => e.currentTarget.style.background = ""}>
                        <td style={{ padding: "10px 16px", fontWeight: 600, color: "#175CD3", cursor: "pointer" }}
                          onClick={() => router.push(`/tms/trips/${t.id}`)}>
                          {t.reference}
                        </td>
                        <td style={{ padding: "10px 16px", color: "#344054" }}>{t.from_city ?? "—"}</td>
                        <td style={{ padding: "10px 16px", color: "#344054" }}>{t.to_city ?? "—"}</td>
                        <td style={{ padding: "10px 16px", color: "#667085" }}>{fmtD(t.departure)}</td>
                        <td style={{ padding: "10px 16px", color: "#667085" }}>{fmtD(t.arrival)}</td>
                        <td style={{ padding: "10px 16px" }}>
                          {t.digitoll_id
                            ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "#027A48" }}>
                                <span style={{ fontFamily: "Material Icons", fontSize: 13 }}>check_circle</span>
                                {t.digitoll_id}
                              </span>
                            : <span style={{ fontSize: 11, color: "#98A2B3" }}>—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}