"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { HierarchyModal } from "@/components/HierarchyModal";

interface Trip {
  id: string;
  reference: string;
  tags: string | null;
  status: string;
  departure: string | null;
  arrival: string | null;
  from_city: string | null;
  to_city: string | null;
  trip_status: string;
  customs_status: string;
  packages: number | null;
  gross_weight: number | null;
  loading_meters: number | null;
  resource: string | null;
  order_ids: string[];
  digitoll_id: string | null;
  cms_id: string | null;
}

const TABS = ["General", "Automation", "Route", "Loading List", "Economy", "Documents", "Customs", "Checklist", "Logs"];

function fmtD(d: string | null) {
  if (!d) return "—";
  return d.slice(0, 16).replace("T", " ");
}
function n(v: number | null | undefined, dec = 2) {
  if (v == null) return "0." + "0".repeat(dec);
  return v.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Customs");
  const [fortollingType, setFortollingType] = useState<"egen"|"ekstern">("egen");
  const [externalMrn, setExternalMrn] = useState("");
  const [savingMrn, setSavingMrn] = useState(false);
  const [hierarchyOpen, setHierarchyOpen] = useState(false);
  const [orders, setOrders] = useState<{id:string;reference:string;consignor:string|null;consignee:string|null;digitoll_id:string|null;gross_weight:number|null;packages:number|null}[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/tms/trips/${id}`);
    if (res.ok) {
      const d = await res.json();
      setTrip({ ...d, from_city: d.from_city ?? d.from, to_city: d.to_city ?? d.to });
      setFortollingType(d.fortolling_type === "ekstern" ? "ekstern" : "egen");
      setExternalMrn(d.external_mrn ?? "");
      // Load linked orders
      if (d.order_ids?.length) {
        fetch("/api/tms/orders").then(r => r.json()).then(all => {
          setOrders(all.filter((o: {id:string}) => d.order_ids.includes(o.id)));
        });
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

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#98A2B3", fontSize: 13, fontFamily: "Inter,sans-serif" }}>
      Loading…
    </div>
  );
  if (!trip) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#EF4444", fontSize: 13, fontFamily: "Inter,sans-serif" }}>
      Trip not found
    </div>
  );

  async function saveFortolling(type: "egen"|"ekstern") {
    setFortollingType(type);
    await fetch(`/api/tms/trips/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fortolling_type: type }),
    });
  }

  async function saveExternalMrn() {
    setSavingMrn(true);
    await fetch(`/api/tms/trips/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ external_mrn: externalMrn }),
    });
    setSavingMrn(false);
  }

  const COUNTRY_FOR: Record<string, string> = {
    "Gothenburg": "SE", "Stockholm": "SE", "Malmö": "SE", "Norrköping": "SE", "Helsingborg": "SE",
    "Oslo": "NO", "Bergen": "NO", "Trondheim": "NO", "Stavanger": "NO", "Kristiansand": "NO", "Drammen": "NO", "Tromsø": "NO",
    "Copenhagen": "DK", "Aarhus": "DK", "Padborg": "DK",
  };
  const fromCountry = trip ? (COUNTRY_FOR[trip.from_city ?? ""] ?? "??") : "??";
  const toCountry   = trip ? (COUNTRY_FOR[trip.to_city   ?? ""] ?? "??") : "??";
  const isDomestic  = trip?.is_domestic ?? (fromCountry === toCountry && fromCountry !== "??");
  const canSend = !!(customsForm.vehicle_reg_no && customsForm.customs_place && customsForm.transport_mode && orders.length > 0);

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

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 8.5, fontWeight: 700, color: "#003160", textTransform: "uppercase", letterSpacing: ".08em" }}>TRIP</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", lineHeight: 1.2 }}>{trip.reference}</div>
        </div>

        {trip.tags && (
          <span style={{ fontFamily: "Material Icons", fontSize: 16, color: "#98A2B3", lineHeight: 1 }}>local_offer</span>
        )}

        <div style={{ width: 1, height: 32, background: "#E4E7EC", flexShrink: 0, margin: "0 4px" }} />

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0 }}>
          {[
            { icon: "inventory_2", value: n(trip.packages, 0) },
            { icon: "straighten", value: n(trip.loading_meters, 2) },
            { icon: "view_in_ar", value: "0.00" },
            { icon: "monitor_weight", value: n(trip.gross_weight, 0) },
          ].map(({ icon, value }, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 20px", borderRight: i < 3 ? "1px solid #F2F4F7" : "none" }}>
              <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#003160", lineHeight: 1, marginBottom: 3 }}>{icon}</span>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#101828", fontFamily: "'Roboto Mono',monospace", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 9.5, fontWeight: 400, color: "#98A2B3", fontFamily: "'Roboto Mono',monospace", lineHeight: 1 }}>0.00</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <div style={{ display: "flex", borderRadius: 2, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}>
            <button style={{ padding: "0 16px", height: 34, background: "linear-gradient(180deg,#446BF9 0%,#0058AC 100%)", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: ".03em", borderRight: "1px solid rgba(255,255,255,0.2)", fontFamily: "inherit" }}>
              Trip actions
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

      {/* ── ROUTE / VEHICLE SECTION — 280px fixed ── */}
      <div style={{ borderBottom: "1px solid #E4E7EC", flexShrink: 0, height: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" as const, background: "#FAFAFA" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, padding: "10px 24px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <span style={{ fontFamily: "Material Icons", fontSize: 24, color: "#003160", lineHeight: 1 }}>local_shipping</span>
            <div>
              <div style={{ fontSize: 8.5, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 2 }}>VEHICLE / RESOURCE</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#101828" }}>{trip.resource ?? "—"}</div>
            </div>
            <div style={{ width: 1, height: 28, background: "#E4E7EC", margin: "0 4px" }} />
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 2, background: trip.trip_status === "Dispatched" ? "#EFF8FF" : "#F2F4F7", color: trip.trip_status === "Dispatched" ? "#175CD3" : "#667085" }}>
                {trip.trip_status}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 2, background: trip.customs_status === "Cleared" ? "#ECFDF3" : "#FFFAEB", color: trip.customs_status === "Cleared" ? "#027A48" : "#B54708" }}>
                {trip.customs_status}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", width: "100%", padding: "0 40px", gap: 0, position: "relative" as const }}>

          <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, padding: "10px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", minWidth: 160, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#22C55E", lineHeight: 1, flexShrink: 0, marginTop: 1 }}>place</span>
              <div>
                <div style={{ fontSize: 8.5, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".07em", marginBottom: 3 }}>FROM</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#101828" }}>{trip.from_city ?? "—"}</div>
                <div style={{ fontSize: 10.5, color: "#667085", marginTop: 3 }}>ETD: {fmtD(trip.departure)}</div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, position: "relative" as const, display: "flex", alignItems: "center" }}>
            <div style={{ width: "100%", height: 2, background: "linear-gradient(90deg,#D0D5DD 0%,#98A2B3 50%,#D0D5DD 100%)" }} />
            <span style={{ fontFamily: "Material Icons", fontSize: 18, color: "#667085", position: "absolute" as const, right: -4, top: "50%", transform: "translateY(-50%)" }}>chevron_right</span>
          </div>

          <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, padding: "10px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", minWidth: 200, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, justifyContent: "flex-end" }}>
              <div style={{ textAlign: "right" as const }}>
                <div style={{ fontSize: 8.5, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".07em", marginBottom: 3 }}>TO</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#101828" }}>{trip.to_city ?? "—"}</div>
                <div style={{ fontSize: 10.5, color: "#667085", marginTop: 3 }}>ETA: {fmtD(trip.arrival)}</div>
              </div>
              <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#EF4444", lineHeight: 1, flexShrink: 0, marginTop: 1 }}>place</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: "flex", background: "#DFE5EB", flexShrink: 0, height: 48, alignItems: "center", justifyContent: "center", gap: 2 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: "0 16px",
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
        ) : isDomestic ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#F2F4F7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "Material Icons", fontSize: 28, color: "#98A2B3" }}>home</span>
            </div>
            <div style={{ textAlign: "center" as const }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#344054", marginBottom: 6 }}>Inrikes transport</div>
              <div style={{ fontSize: 12.5, color: "#98A2B3" }}>
                Denne turen går fra {trip.from_city} ({fromCountry}) til {trip.to_city} ({toCountry}).<br />
                Ingen tolldeklarasjon er nødvendig for innenlandske transporter.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* FORTOLLING TYPE */}
            <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, padding: "16px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 14 }}>Fortolling</div>
              <div style={{ display: "flex", gap: 24 }}>
                {(["egen", "ekstern"] as const).map(type => (
                  <label key={type} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="radio" name="fortolling" checked={fortollingType === type}
                      onChange={() => saveFortolling(type)}
                      style={{ width: 15, height: 15, accentColor: "#446BF9", cursor: "pointer" }} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "#344054" }}>
                      {type === "egen" ? "Egen fortolling" : "Ekstern fortolling (tullombud)"}
                    </span>
                  </label>
                ))}
              </div>
              {fortollingType === "ekstern" && (
                <div style={{ marginTop: 16, display: "flex", alignItems: "flex-end", gap: 10 }}>
                  <div style={{ flex: 1, maxWidth: 340 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#344054", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 6 }}>MRN fra tullombud</div>
                    <input value={externalMrn} onChange={e => setExternalMrn(e.target.value)}
                      placeholder="24NO000000000000X0"
                      style={{ width: "100%", boxSizing: "border-box" as const, border: "1px solid #D0D5DD", borderRadius: 2, padding: "7px 10px", fontSize: 12.5, fontFamily: "'Roboto Mono',monospace", color: "#101828", outline: "none" }} />
                  </div>
                  <button onClick={saveExternalMrn} disabled={savingMrn || !externalMrn}
                    style={{ padding: "7px 16px", border: "none", borderRadius: 2, background: externalMrn ? "#003160" : "#E4E7EC", color: externalMrn ? "#fff" : "#98A2B3", fontSize: 12, fontWeight: 700, cursor: externalMrn ? "pointer" : "not-allowed", fontFamily: "inherit", marginBottom: 1 }}>
                    {savingMrn ? "Saving…" : "Register MRN"}
                  </button>
                </div>
              )}
            </div>

            {/* DIGITOLL ROW — only for own fortolling */}
            {fortollingType === "egen" && (
              <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ padding: "10px 20px", borderBottom: "1px solid #F2F4F7", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "Material Icons", fontSize: 16, color: "#003160" }}>send_to_mobile</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>Digitoll</span>
                </div>
                {trip.digitoll_id ? (
                  <div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #E4E7EC", background: "#F8FAFC" }}>
                          {["Transport ID","Mode","Customs Place","ETA","Status","Houses",""].map(h => (
                            <th key={h} style={{ padding: "8px 16px", textAlign: "left" as const, fontSize: 9.5, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr onClick={() => setHierarchyOpen(true)} style={{ cursor: "pointer" }}
                          onMouseEnter={e => e.currentTarget.style.background="#EEF4FF"}
                          onMouseLeave={e => e.currentTarget.style.background=""}>
                          <td style={{ padding: "12px 16px", fontWeight: 700, color: "#175CD3" }}>{trip.digitoll_id}</td>
                          <td style={{ padding: "12px 16px", color: "#344054" }}>{customsForm.transport_mode || "Road"}</td>
                          <td style={{ padding: "12px 16px", color: "#344054" }}>{customsForm.customs_place || "—"}</td>
                          <td style={{ padding: "12px 16px", color: "#667085" }}>{customsForm.customs_place_eta_date ? `${customsForm.customs_place_eta_date} ${customsForm.customs_place_eta_time}` : "—"}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 2, background: "#ECFDF3", color: "#027A48" }}>
                              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#027A48" }} />In Digitoll
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", color: "#344054" }}>{orders.filter(o => o.digitoll_id).length} / {orders.length}</td>
                          <td style={{ padding: "12px 16px" }}><span style={{ fontFamily: "Material Icons", fontSize: 16, color: "#98A2B3" }}>open_in_new</span></td>
                        </tr>
                      </tbody>
                    </table>
                    <div style={{ padding: "10px 16px", borderTop: "1px solid #F2F4F7" }}>
                      <button onClick={sendToDigitoll} disabled={sending}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", border: "1px solid #D0D5DD", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 11.5, fontWeight: 600, color: "#344054", fontFamily: "inherit" }}>
                        <span style={{ fontFamily: "Material Icons", fontSize: 14 }}>sync</span>
                        {sending ? "Syncing…" : "Sync changes"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#98A2B3" }}>cloud_upload</span>
                    <div style={{ flex: 1, fontSize: 12, color: "#667085" }}>Not yet sent to Digitoll. Fill in vehicle and customs details, then send.</div>
                    <button onClick={sendToDigitoll} disabled={!canSend || sending}
                      style={{ padding: "8px 18px", border: "none", borderRadius: 2, background: (canSend && !sending) ? "linear-gradient(180deg,#446BF9 0%,#0058AC 100%)" : "#E4E7EC", color: (canSend && !sending) ? "#fff" : "#98A2B3", fontSize: 12, fontWeight: 700, cursor: (canSend && !sending) ? "pointer" : "not-allowed", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: "Material Icons", fontSize: 15 }}>send</span>
                      {sending ? "Sending…" : "Send to Digitoll"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* VEHICLE / CUSTOMS FORM */}
            <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ padding: "10px 20px", borderBottom: "1px solid #F2F4F7", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "Material Icons", fontSize: 16, color: "#003160" }}>local_shipping</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>Transport / Vehicle</span>
              </div>
              <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                {[
                  { label: "Registration No", field: "vehicle_reg_no", placeholder: "e.g. AB 12345", required: true },
                  { label: "Vehicle Nationality", field: "vehicle_nationality", placeholder: "e.g. NO, SE, PL", required: true },
                  { label: "Driver Name", field: "driver_name", placeholder: "Full name" },
                  { label: "Driver Contact", field: "driver_contact", placeholder: "Phone or email" },
                  { label: "Customs Representative", field: "customs_representative", placeholder: "Name or EORI" },
                ].map(({ label, field, placeholder, required }) => (
                  <div key={field}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#344054", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 6 }}>
                      {label}{required && <span style={{ color: "#EF4444" }}> *</span>}
                    </div>
                    <input value={customsForm[field as keyof typeof customsForm] ?? ""}
                      onChange={e => setCustomsForm(f => ({ ...f, [field]: e.target.value }))}
                      onBlur={e => saveCustomsField(field, e.target.value)}
                      placeholder={placeholder}
                      style={{ width: "100%", boxSizing: "border-box" as const, border: "1px solid #D0D5DD", borderRadius: 2, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", color: "#101828", outline: "none" }}
                      onFocus={e => e.currentTarget.style.borderColor = "#446BF9"} />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#344054", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 6 }}>Transport Mode</div>
                  <select value={customsForm.transport_mode} onChange={e => { setCustomsForm(f => ({ ...f, transport_mode: e.target.value })); saveCustomsField("transport_mode", e.target.value); }}
                    style={{ width: "100%", border: "1px solid #D0D5DD", borderRadius: 2, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", color: "#101828", background: "#fff" }}>
                    {["Road","Sea","Air","Rail"].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* CUSTOMS PLACE */}
            <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ padding: "10px 20px", borderBottom: "1px solid #F2F4F7", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "Material Icons", fontSize: 16, color: "#003160" }}>location_on</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>Customs</span>
              </div>
              <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#344054", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 6 }}>Customs Place <span style={{ color: "#EF4444" }}>*</span></div>
                  <select value={customsForm.customs_place} onChange={e => { setCustomsForm(f => ({ ...f, customs_place: e.target.value })); saveCustomsField("customs_place", e.target.value); }}
                    style={{ width: "100%", border: "1px solid #D0D5DD", borderRadius: 2, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", color: customsForm.customs_place ? "#101828" : "#98A2B3", background: "#fff" }}>
                    <option value="">— Select crossing —</option>
                    <optgroup label="Østfold / Viken"><option>Svinesund (E6)</option><option>Ørje (E18)</option><option>Magnormoen (rv. 2)</option><option>Rømskog</option><option>Riksåsen</option></optgroup>
                    <optgroup label="Innlandet"><option>Trysil (rv. 25)</option><option>Engerdal</option><option>Røros (rv. 31)</option><option>Jøldalshytta</option></optgroup>
                    <optgroup label="Trøndelag"><option>Storlien (E14)</option><option>Meråker</option></optgroup>
                    <optgroup label="Nordland / Troms"><option>Björnfjell / Riksgransen (E10)</option><option>Graddis (rv. 77)</option><option>Umbukta (rv. 73)</option><option>Tunnsjødal</option></optgroup>
                    <optgroup label="Finnmark"><option>Storskog (E105)</option><option>Karigasniemi</option><option>Utsjoki</option></optgroup>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#344054", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 6 }}>Customs Place ETA — Date</div>
                  <input type="date" value={customsForm.customs_place_eta_date}
                    onChange={e => setCustomsForm(f => ({ ...f, customs_place_eta_date: e.target.value }))}
                    onBlur={e => saveCustomsField("customs_place_eta_date", e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box" as const, border: "1px solid #D0D5DD", borderRadius: 2, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", color: "#101828", outline: "none" }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#344054", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 6 }}>Customs Place ETA — Time</div>
                  <input type="time" value={customsForm.customs_place_eta_time}
                    onChange={e => setCustomsForm(f => ({ ...f, customs_place_eta_time: e.target.value }))}
                    onBlur={e => saveCustomsField("customs_place_eta_time", e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box" as const, border: "1px solid #D0D5DD", borderRadius: 2, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", color: "#101828", outline: "none" }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#344054", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 6 }}>Means of Transport Code</div>
                  <select value={customsForm.means_of_transport_code} onChange={e => { setCustomsForm(f => ({ ...f, means_of_transport_code: e.target.value })); saveCustomsField("means_of_transport_code", e.target.value); }}
                    style={{ width: "100%", border: "1px solid #D0D5DD", borderRadius: 2, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", color: customsForm.means_of_transport_code ? "#101828" : "#98A2B3", background: "#fff" }}>
                    <option value="">— Select code —</option>
                    <optgroup label="Road"><option value="31">31 — Road (motor vehicle)</option><option value="32">32 — Road (trailer)</option></optgroup>
                    <optgroup label="Rail"><option value="20">20 — Rail</option></optgroup>
                    <optgroup label="Sea"><option value="10">10 — Sea (vessel)</option><option value="11">11 — Sea (container on vessel)</option></optgroup>
                    <optgroup label="Air"><option value="40">40 — Air (aircraft)</option></optgroup>
                    <optgroup label="Other"><option value="50">50 — Mail</option><option value="70">70 — Fixed transport (pipeline)</option><option value="90">90 — Own propulsion</option></optgroup>
                  </select>
                </div>
              </div>
            </div>

            {/* ORDERS / HOUSES */}
            <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ padding: "10px 20px", borderBottom: "1px solid #F2F4F7", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "Material Icons", fontSize: 16, color: "#003160" }}>receipt_long</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>Orders / Houses</span>
                <span style={{ fontSize: 10, color: "#98A2B3", marginLeft: 4 }}>{orders.length} order{orders.length !== 1 ? "s" : ""}</span>
              </div>
              {orders.length === 0 ? (
                <div style={{ padding: "24px 20px", textAlign: "center" as const, color: "#98A2B3", fontSize: 12 }}>No orders linked to this trip.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #E4E7EC", background: "#F8FAFC" }}>
                      {["Reference","Consignor","Consignee","Gross kg","Packages","Digitoll House"].map(h => (
                        <th key={h} style={{ padding: "8px 16px", textAlign: "left" as const, fontSize: 9.5, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id} style={{ borderBottom: "1px solid #F2F4F7" }}
                        onMouseEnter={e => e.currentTarget.style.background="#F8FAFC"}
                        onMouseLeave={e => e.currentTarget.style.background=""}>
                        <td style={{ padding: "10px 16px", fontWeight: 600, color: "#175CD3" }}>{o.reference}</td>
                        <td style={{ padding: "10px 16px", color: "#344054" }}>{o.consignor}</td>
                        <td style={{ padding: "10px 16px", color: "#344054" }}>{o.consignee}</td>
                        <td style={{ padding: "10px 16px", color: "#344054", fontFamily: "'Roboto Mono',monospace" }}>{o.gross_weight?.toLocaleString() ?? "—"}</td>
                        <td style={{ padding: "10px 16px", color: "#344054" }}>{o.packages ?? "—"}</td>
                        <td style={{ padding: "10px 16px" }}>
                          {o.digitoll_id
                            ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "#027A48" }}><span style={{ fontFamily: "Material Icons", fontSize: 13 }}>check_circle</span>{o.digitoll_id}</span>
                            : <span style={{ fontSize: 11, color: "#98A2B3" }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {sendError && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 4, padding: "10px 16px", fontSize: 12, color: "#B42318", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "Material Icons", fontSize: 16 }}>error_outline</span>{sendError}
              </div>
            )}

          </div>
        )}
      </div>

      {/* HIERARCHY MODAL */}
      {hierarchyOpen && trip.digitoll_transport_id && (
        <HierarchyModal
          type="transport"
          id={trip.digitoll_transport_id}
          onClose={() => setHierarchyOpen(false)}
          onEdit={() => {}}
        />
      )}

    </div>
  );
}
