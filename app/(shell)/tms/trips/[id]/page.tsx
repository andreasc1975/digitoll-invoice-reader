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
  digitoll_transport_id: string | null;
  digitoll_synced_at: string | null;
  is_domestic: boolean | null;
  fortolling_type: string | null;
  external_mrn: string | null;
  vehicle_reg_no: string | null;
  vehicle_nationality: string | null;
  driver_name: string | null;
  driver_contact: string | null;
  customs_place: string | null;
  customs_place_eta_date: string | null;
  customs_place_eta_time: string | null;
  means_of_transport_code: string | null;
  transport_mode: string | null;
  customs_representative: string | null;
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
  const [customsForm, setCustomsForm] = useState({
    vehicle_reg_no: "", vehicle_nationality: "", driver_name: "",
    driver_contact: "", customs_place: "", customs_place_eta_date: "",
    customs_place_eta_time: "", means_of_transport_code: "", transport_mode: "Road",
    customs_representative: "",
  });
  const [externalMrn, setExternalMrn] = useState("");
  const [savingMrn, setSavingMrn] = useState(false);
  const [hierarchyOpen, setHierarchyOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string|null>(null);
  const [orders, setOrders] = useState<{id:string;reference:string;consignor:string|null;consignee:string|null;digitoll_id:string|null;gross_weight:number|null;packages:number|null}[]>([]);
  const [orderGoodsLines, setOrderGoodsLines] = useState<Record<string,{hs_code:string|null;description:string|null}[]>>({});
  const [vendors, setVendors] = useState<{id:string;name:string;eori:string|null}[]>([]);
  const [digitollModal, setDigitollModal] = useState<"own"|"external"|null>(null);
  const [ownForm, setOwnForm] = useState({
    responsible_party: "Us",
    customs_place: "",
    customs_place_eta_date: "",
    customs_place_eta_time: "",
    include_master: true,
    master_doc_number: "",
    master_doc_type: "",
    master_carrier_id: "",
    master_consignor: "",
    master_consignee: "",
    master_goods_description: "",
    master_loading: "",
    master_unloading: "",
    master_equipment: "",
  });
  const [houseParties, setHouseParties] = useState<Record<string,string>>({});
  const [houseProcedures, setHouseProcedures] = useState<Record<string,string>>({});
  const [savingDigitoll, setSavingDigitoll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/tms/trips/${id}`);
    if (res.ok) {
      const d = await res.json();
      setTrip({ ...d, from_city: d.from_city ?? d.from, to_city: d.to_city ?? d.to });
      setFortollingType(d.fortolling_type === "ekstern" ? "ekstern" : "egen");
      setOwnForm(prev => ({
        ...prev,
        customs_place:          d.customs_place ?? "",
        customs_place_eta_date: d.customs_place_eta_date ?? "",
        customs_place_eta_time: d.customs_place_eta_time ?? "",
      }));
      setCustomsForm({
        vehicle_reg_no:          d.vehicle_reg_no ?? d.resource ?? "",
        vehicle_nationality:     d.vehicle_nationality ?? "",
        driver_name:             d.driver_name ?? "",
        driver_contact:          d.driver_contact ?? "",
        customs_place:           d.customs_place ?? "",
        customs_place_eta_date:  d.customs_place_eta_date ?? "",
        customs_place_eta_time:  d.customs_place_eta_time ?? "",
        means_of_transport_code: d.means_of_transport_code ?? "",
        transport_mode:          d.transport_mode ?? "Road",
        customs_representative:  d.customs_representative ?? "",
      });
      setExternalMrn(d.external_mrn ?? "");
      // Load linked orders
      if (d.order_ids?.length) {
        fetch("/api/tms/orders").then(r => r.json()).then(async (all) => {
          const linked = all.filter((o: {id:string}) => d.order_ids.includes(o.id));
          setOrders(linked);
          // Fetch goods lines for each order
          const glMap: Record<string,{hs_code:string|null;description:string|null}[]> = {};
          await Promise.all(linked.map(async (o: {id:string}) => {
            const res = await fetch(`/api/tms/orders/${o.id}/goods-lines`);
            if (res.ok) glMap[o.id] = await res.json();
          }));
          setOrderGoodsLines(glMap);
        });
      }
    }
    const vr = await fetch("/api/vendors");
    if (vr.ok) setVendors(await vr.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const COUNTRY_FOR: Record<string,string> = { "Gothenburg":"SE","Stockholm":"SE","Malmö":"SE","Norrköping":"SE","Helsingborg":"SE","Oslo":"NO","Bergen":"NO","Trondheim":"NO","Stavanger":"NO","Kristiansand":"NO","Drammen":"NO","Tromsø":"NO","Copenhagen":"DK","Aarhus":"DK","Padborg":"DK" };
  const fromCountry = COUNTRY_FOR[trip?.from_city ?? ""] ?? "??";
  const toCountry   = COUNTRY_FOR[trip?.to_city   ?? ""] ?? "??";
  const isDomestic  = trip?.is_domestic ?? (fromCountry === toCountry && fromCountry !== "??");
  const canSend = !!(trip?.vehicle_reg_no && trip?.transport_mode);

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
      body: JSON.stringify({
        external_mrn:       externalMrn,
        digitoll_synced_at: new Date().toISOString(),
      }),
    });
    await load();
    setSavingMrn(false);
  }

  async function saveCustomsField(field: string, value: string) {
    await fetch(`/api/tms/trips/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value || null }),
    });
  }

  async function createOwnDigitoll() {
    setSavingDigitoll(true);
    // Save customs data to trip first
    await fetch(`/api/tms/trips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customs_place:          ownForm.customs_place || null,
        customs_place_eta_date: ownForm.customs_place_eta_date || null,
        customs_place_eta_time: ownForm.customs_place_eta_time || null,
        fortolling_type:        "egen",
      }),
    });
    // Create Transport + Master + Houses via send-digitoll
    const res = await fetch(`/api/tms/trips/${id}/send-digitoll`, { method: "POST" });
    if (res.ok) {
      await load();
      setDigitollModal(null);
    }
    setSavingDigitoll(false);
  }

  async function registerExternalMrn() {
    setSavingMrn(true);
    await fetch(`/api/tms/trips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        external_mrn:       externalMrn,
        digitoll_synced_at: new Date().toISOString(),
        fortolling_type:    "ekstern",
      }),
    });
    await load();
    setDigitollModal(null);
    setSavingMrn(false);
  }

  async function sendToDigitoll() {
    setSending(true);
    setSendError(null);
    await fetch(`/api/tms/trips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicle_reg_no:          customsForm.vehicle_reg_no || null,
        vehicle_nationality:     customsForm.vehicle_nationality || null,
        driver_name:             customsForm.driver_name || null,
        driver_contact:          customsForm.driver_contact || null,
        customs_place:           customsForm.customs_place || null,
        customs_representative:  customsForm.customs_representative || null,
        means_of_transport_code: customsForm.means_of_transport_code || null,
        customs_place_eta_date:  customsForm.customs_place_eta_date || null,
        customs_place_eta_time:  customsForm.customs_place_eta_time || null,
        transport_mode:          customsForm.transport_mode || null,
      }),
    });
    const res = await fetch(`/api/tms/trips/${id}/send-digitoll`, { method: "POST" });
    if (res.ok) {
      await load();
    } else {
      const d = await res.json().catch(() => ({}));
      setSendError(d.error ?? "Failed to send to Digitoll");
    }
    setSending(false);
  }



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
              <div style={{ fontSize: 14, fontWeight: 700, color: "#344054", marginBottom: 6 }}>Domestic transport</div>
              <div style={{ fontSize: 12.5, color: "#98A2B3" }}>
                This trip goes from {trip.from_city} ({fromCountry}) to {trip.to_city} ({toCountry}).<br />
                No customs declaration required for domestic transport.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* DIGITOLL SECTION */}
            {!trip.digitoll_id && !trip.external_mrn ? (
              <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ padding: "10px 20px", borderBottom: "1px solid #F2F4F7", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>Transport</span>
                </div>
                <div style={{ padding: "24px 20px", display: "flex", gap: 16 }}>
                  <button onClick={() => setDigitollModal("own")}
                    style={{ flex: 1, padding: "20px 16px", border: "2px solid #E4E7EC", borderRadius: 4, background: "#fff", cursor: "pointer", textAlign: "left" as const, fontFamily: "inherit" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#446BF9"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#E4E7EC"}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 4, background: "#EEF4FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#446BF9" }}>send_to_mobile</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#101828" }}>Create Own Transport</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#667085", lineHeight: 1.5 }}>Create Transport, Master and Houses in Digitoll based on this trip's data.</div>
                  </button>
                  <button onClick={() => setDigitollModal("external")}
                    style={{ flex: 1, padding: "20px 16px", border: "2px solid #E4E7EC", borderRadius: 4, background: "#fff", cursor: "pointer", textAlign: "left" as const, fontFamily: "inherit" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#667085"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#E4E7EC"}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 4, background: "#F2F4F7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#667085" }}>receipt</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#101828" }}>Use External Declaration</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#667085", lineHeight: 1.5 }}>A customs agent has handled the declaration. Register the MRN number.</div>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ padding: "10px 20px", borderBottom: "1px solid #F2F4F7", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>Transport</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #E4E7EC", background: "#F8FAFC" }}>
                      {["Transport ID","Mode","Customs Place","ETA","Status","Ready",""].map(h => (
                        <th key={h} style={{ padding: "8px 16px", textAlign: "left" as const, fontSize: 9.5, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr onClick={() => setHierarchyOpen(true)} style={{ cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#EEF4FF"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <td style={{ padding: "12px 16px" }}>
                        {trip.digitoll_id ? (
                          <span style={{ fontWeight: 700, color: "#175CD3", fontFamily: "'Roboto Mono',monospace" }}>{trip.digitoll_id}</span>
                        ) : trip.external_mrn ? (
                          <span style={{ fontFamily: "'Roboto Mono',monospace", fontSize: 11.5, color: "#667085" }}>{trip.external_mrn}</span>
                        ) : (
                          <span style={{ color: "#98A2B3" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#344054" }}>{customsForm.transport_mode || "Road"}</td>
                      <td style={{ padding: "12px 16px", color: "#344054" }}>{customsForm.customs_place || "—"}</td>
                      <td style={{ padding: "12px 16px", color: "#667085" }}>{customsForm.customs_place_eta_date ? `${customsForm.customs_place_eta_date} ${customsForm.customs_place_eta_time}`.trim() : "—"}</td>
                      <td style={{ padding: "12px 16px" }}>
                        {!trip.digitoll_id && !trip.external_mrn ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 2, background: "#F2F4F7", color: "#667085" }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#98A2B3" }} />Not created
                          </span>
                        ) : trip.digitoll_synced_at ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 2, background: "#ECFDF3", color: "#027A48" }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#027A48" }} />{trip.external_mrn ? "Registered (external)" : "Submitted"}
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 2, background: "#EFF8FF", color: "#175CD3" }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#175CD3" }} />Created
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {(() => {
                          const ready = orders.filter(o => {
                            const gl = orderGoodsLines[o.id] ?? [];
                            return o.consignor && o.consignee && o.gross_weight && o.packages && gl.some(l => l.description && l.hs_code);
                          }).length;
                          return (
                            <span style={{ fontSize: 11, fontWeight: 700, color: ready === orders.length && orders.length > 0 ? "#027A48" : ready > 0 ? "#B54708" : "#667085" }}>
                              {ready}/{orders.length} ready
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {trip.digitoll_synced_at
                          ? <span style={{ fontFamily: "Material Icons", fontSize: 16, color: "#446BF9" }}>open_in_new</span>
                          : <button onClick={e => { e.stopPropagation(); sendToDigitoll(); }} disabled={!canSend || sending}
                              style={{ padding: "5px 12px", border: "none", borderRadius: 2, background: (canSend && !sending) ? "linear-gradient(180deg,#446BF9 0%,#0058AC 100%)" : "#E4E7EC", color: (canSend && !sending) ? "#fff" : "#98A2B3", fontSize: 11.5, fontWeight: 700, cursor: (canSend && !sending) ? "pointer" : "not-allowed", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" as const }}>
                              <span style={{ fontFamily: "Material Icons", fontSize: 13, lineHeight: 1 }}>send</span>
                              {sending ? "Sending…" : "Send to Digitoll"}
                            </button>
                        }
                      </td>
                    </tr>
                  </tbody>
                </table>
                {trip.external_mrn && trip.digitoll_synced_at && (
                  <div style={{ padding: "10px 16px", borderTop: "1px solid #F2F4F7", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>External MRN</span>
                    <span style={{ fontFamily: "'Roboto Mono',monospace", fontSize: 12.5, color: "#344054", letterSpacing: ".05em" }}>{trip.external_mrn}</span>
                  </div>
                )}
              </div>
            )}

            {/* CREATE OWN TRANSPORT MODAL */}
            {digitollModal === "own" && (
              <div onClick={() => setDigitollModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.5)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 4, width: "min(760px,95vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
                  <div style={{ padding: "16px 24px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#101828" }}>Digitoll Messages — {trip.reference}</div>
                      <div style={{ fontSize: 11, color: "#667085", marginTop: 2 }}>{trip.from_city} → {trip.to_city}</div>
                    </div>
                    <button onClick={() => setDigitollModal(null)} style={{ width: 28, height: 28, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#667085" }}>close</span>
                    </button>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Transport */}
                    <div style={{ border: "1px solid #E4E7EC", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ padding: "8px 16px", background: "#F8FAFC", borderBottom: "1px solid #E4E7EC", fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>Transport</div>
                      <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#667085", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 4 }}>Trip No</div>
                          <div style={{ fontSize: 12.5, fontWeight: 600, padding: "7px 10px", background: "#F8FAFC", borderRadius: 2, border: "1px solid #E4E7EC", color: "#344054" }}>{trip.reference}</div>
                        </div>
                        <div style={{ gridColumn: "span 2" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#667085", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 4 }}>Responsible Party</div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <div style={{ display: "flex", border: "1px solid #D0D5DD", borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
                              {(["Us", "Vendor"] as const).map(opt => {
                                const isActive = opt === "Us" ? ownForm.responsible_party === "Us" : ownForm.responsible_party !== "Us";
                                return (
                                  <button key={opt} onClick={() => setOwnForm(f => ({ ...f, responsible_party: opt === "Us" ? "Us" : "" }))}
                                    style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, border: "none", background: isActive ? "#003160" : "#fff", color: isActive ? "#fff" : "#344054", cursor: "pointer", fontFamily: "inherit" }}>
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                            {ownForm.responsible_party !== "Us" && (
                              <select value={ownForm.responsible_party} onChange={e => setOwnForm(f => ({ ...f, responsible_party: e.target.value }))}
                                style={{ flex: 1, border: "1px solid #D0D5DD", borderRadius: 2, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", background: "#fff" }}>
                                <option value="">— Select vendor —</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                              </select>
                            )}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#667085", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 4 }}>Customs Place</div>
                          <select value={ownForm.customs_place} onChange={e => setOwnForm(f => ({ ...f, customs_place: e.target.value }))}
                            style={{ width: "100%", border: "1px solid #D0D5DD", borderRadius: 2, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", background: "#fff", color: ownForm.customs_place ? "#101828" : "#98A2B3" }}>
                            <option value="">— Select —</option>
                            {["Svinesund (E6)","Ørje (E18)","Magnormoen (rv. 2)","Rømskog","Riksåsen","Trysil (rv. 25)","Engerdal","Røros (rv. 31)","Storlien (E14)","Meråker","Björnfjell / Riksgransen (E10)","Graddis (rv. 77)","Umbukta (rv. 73)","Tunnsjødal","Storskog (E105)"].map(p => <option key={p}>{p}</option>)}
                          </select>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#667085", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 4 }}>Customs ETA</div>
                          <input type="date" value={ownForm.customs_place_eta_date} onChange={e => setOwnForm(f => ({ ...f, customs_place_eta_date: e.target.value }))}
                            style={{ width: "100%", boxSizing: "border-box" as const, border: "1px solid #D0D5DD", borderRadius: 2, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", marginBottom: 4 }} />
                          <input type="time" value={ownForm.customs_place_eta_time} onChange={e => setOwnForm(f => ({ ...f, customs_place_eta_time: e.target.value }))}
                            style={{ width: "100%", boxSizing: "border-box" as const, border: "1px solid #D0D5DD", borderRadius: 2, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit" }} />
                        </div>
                      </div>
                    </div>
                    {/* Master toggle + form */}
                    <div style={{ border: "1px solid #E4E7EC", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ padding: "8px 16px", background: "#F8FAFC", borderBottom: ownForm.include_master ? "1px solid #E4E7EC" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>Master</span>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                          <span style={{ fontSize: 11.5, color: "#344054" }}>Include Master</span>
                          <div onClick={() => setOwnForm(f => ({ ...f, include_master: !f.include_master }))}
                            style={{ width: 36, height: 20, borderRadius: 10, background: ownForm.include_master ? "#446BF9" : "#D0D5DD", position: "relative" as const, cursor: "pointer" }}>
                            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute" as const, top: 2, left: ownForm.include_master ? 18 : 2, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                          </div>
                        </label>
                      </div>
                      {ownForm.include_master && (
                        <div style={{ padding: "16px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#667085", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 4 }}>Document Number (Waybill) *</div>
                              <input value={ownForm.master_doc_number ?? ""} onChange={e => setOwnForm(f => ({ ...f, master_doc_number: e.target.value }))}
                                placeholder="e.g. 12345678"
                                style={{ width: "100%", boxSizing: "border-box" as const, border: "1px solid #D0D5DD", borderRadius: 2, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", color: "#101828" }} />
                            </div>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#667085", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 4 }}>Document Type *</div>
                              <select value={ownForm.master_doc_type ?? ""} onChange={e => setOwnForm(f => ({ ...f, master_doc_type: e.target.value }))}
                                style={{ width: "100%", border: "1px solid #D0D5DD", borderRadius: 2, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", background: "#fff" }}>
                                <option value="">— Select —</option>
                                <option value="MASTER_AWB">Master AWB</option>
                                <option value="HOUSE_AWB">House AWB</option>
                                <option value="MASTER_BL">Master B/L</option>
                                <option value="HOUSE_BL">House B/L</option>
                                <option value="CMR">CMR</option>
                                <option value="CIM">CIM</option>
                              </select>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#667085", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 4 }}>Carrier ID (EORI)</div>
                              <input value={ownForm.master_carrier_id ?? ""} onChange={e => setOwnForm(f => ({ ...f, master_carrier_id: e.target.value }))}
                                placeholder="e.g. NO123456789"
                                style={{ width: "100%", boxSizing: "border-box" as const, border: "1px solid #D0D5DD", borderRadius: 2, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", color: "#101828" }} />
                            </div>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#667085", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 4 }}>Consignor</div>
                              <input value={ownForm.master_consignor ?? ""} onChange={e => setOwnForm(f => ({ ...f, master_consignor: e.target.value }))}
                                placeholder="Sender name or EORI"
                                style={{ width: "100%", boxSizing: "border-box" as const, border: "1px solid #D0D5DD", borderRadius: 2, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", color: "#101828" }} />
                            </div>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#667085", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 4 }}>Consignee</div>
                              <input value={ownForm.master_consignee ?? ""} onChange={e => setOwnForm(f => ({ ...f, master_consignee: e.target.value }))}
                                placeholder="Recipient name or EORI"
                                style={{ width: "100%", boxSizing: "border-box" as const, border: "1px solid #D0D5DD", borderRadius: 2, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", color: "#101828" }} />
                            </div>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#667085", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 4 }}>Goods Description</div>
                              <input value={ownForm.master_goods_description ?? ""} onChange={e => setOwnForm(f => ({ ...f, master_goods_description: e.target.value }))}
                                placeholder="e.g. Frozen fish, machine parts"
                                style={{ width: "100%", boxSizing: "border-box" as const, border: "1px solid #D0D5DD", borderRadius: 2, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", color: "#101828" }} />
                            </div>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#667085", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 4 }}>Loading Location</div>
                              <input value={ownForm.master_loading ?? trip.from_city ?? ""} onChange={e => setOwnForm(f => ({ ...f, master_loading: e.target.value }))}
                                style={{ width: "100%", boxSizing: "border-box" as const, border: "1px solid #D0D5DD", borderRadius: 2, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", color: "#101828" }} />
                            </div>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#667085", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 4 }}>Unloading Location</div>
                              <input value={ownForm.master_unloading ?? trip.to_city ?? ""} onChange={e => setOwnForm(f => ({ ...f, master_unloading: e.target.value }))}
                                style={{ width: "100%", boxSizing: "border-box" as const, border: "1px solid #D0D5DD", borderRadius: 2, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", color: "#101828" }} />
                            </div>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#667085", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 4 }}>Transport Equipment</div>
                              <input value={ownForm.master_equipment ?? ""} onChange={e => setOwnForm(f => ({ ...f, master_equipment: e.target.value }))}
                                placeholder="e.g. Container no., trailer reg."
                                style={{ width: "100%", boxSizing: "border-box" as const, border: "1px solid #D0D5DD", borderRadius: 2, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", color: "#101828" }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Houses */}
                    {orders.length > 0 && (
                      <div style={{ border: "1px solid #E4E7EC", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ padding: "8px 16px", background: "#F8FAFC", borderBottom: "1px solid #E4E7EC", fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>Houses / Orders ({orders.length})</div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid #E4E7EC" }}>
                              {["Order No","Consignor","Consignee","Responsible Party","Customs Procedure"].map(h => (
                                <th key={h} style={{ padding: "8px 12px", textAlign: "left" as const, fontSize: 9.5, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map(o => (
                              <tr key={o.id} style={{ borderBottom: "1px solid #F2F4F7" }}>
                                <td style={{ padding: "8px 12px", fontWeight: 600, color: "#175CD3" }}>{o.reference}</td>
                                <td style={{ padding: "8px 12px", color: "#344054" }}>{o.consignor ?? "—"}</td>
                                <td style={{ padding: "8px 12px", color: "#344054" }}>{o.consignee ?? "—"}</td>
                                <td style={{ padding: "8px 12px" }}>
                                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                    <div style={{ display: "flex", border: "1px solid #D0D5DD", borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
                                      {["Us", "Vendor"].map(opt => (
                                        <button key={opt} onClick={() => setHouseParties(p => ({ ...p, [o.id]: opt === "Us" ? "Us" : (p[o.id] !== "Us" ? p[o.id] : "") }))}
                                          style={{ padding: "4px 10px", fontSize: 11, fontWeight: 600, border: "none", background: (houseParties[o.id] ?? "Us") === opt || ((houseParties[o.id] ?? "Us") !== "Us" && opt === "Vendor") ? "#003160" : "#fff", color: (houseParties[o.id] ?? "Us") === opt || ((houseParties[o.id] ?? "Us") !== "Us" && opt === "Vendor") ? "#fff" : "#344054", cursor: "pointer", fontFamily: "inherit" }}>
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                    {(houseParties[o.id] ?? "Us") !== "Us" && (
                                      <select value={houseParties[o.id] ?? ""} onChange={e => setHouseParties(p => ({ ...p, [o.id]: e.target.value }))}
                                        style={{ flex: 1, border: "1px solid #D0D5DD", borderRadius: 2, padding: "4px 8px", fontSize: 11.5, fontFamily: "inherit", background: "#fff" }}>
                                        <option value="">— Select vendor —</option>
                                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                      </select>
                                    )}
                                  </div>
                                </td>
                                <td style={{ padding: "8px 12px" }}>
                                  <select value={houseProcedures[o.id] ?? ""} onChange={e => setHouseProcedures(p => ({ ...p, [o.id]: e.target.value }))}
                                    style={{ width: "100%", border: "1px solid #D0D5DD", borderRadius: 2, padding: "4px 8px", fontSize: 11.5, fontFamily: "inherit", background: "#fff", color: houseProcedures[o.id] ? "#101828" : "#98A2B3" }}>
                                    <option value="">— Select —</option>
                                    <option value="40 00">40 00 — Free circulation</option>
                                    <option value="42 00">42 00 — Free circulation + VAT exemption</option>
                                    <option value="61 00">61 00 — Re-export</option>
                                    <option value="10 00">10 00 — Permanent export</option>
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "12px 24px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => setDigitollModal(null)} style={{ padding: "7px 16px", border: "1px solid #D0D5DD", borderRadius: 2, background: "#fff", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", color: "#344054" }}>Cancel</button>
                    <button onClick={createOwnDigitoll} disabled={savingDigitoll || !ownForm.customs_place}
                      style={{ padding: "7px 16px", border: "none", borderRadius: 2, background: (!savingDigitoll && ownForm.customs_place) ? "linear-gradient(180deg,#446BF9 0%,#0058AC 100%)" : "#E4E7EC", color: (!savingDigitoll && ownForm.customs_place) ? "#fff" : "#98A2B3", fontSize: 12.5, fontWeight: 700, cursor: (!savingDigitoll && ownForm.customs_place) ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                      {savingDigitoll ? "Creating…" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* USE EXTERNAL MODAL */}
            {digitollModal === "external" && (
              <div onClick={() => setDigitollModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.5)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 4, width: "min(480px,95vw)", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
                  <div style={{ padding: "16px 24px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#101828" }}>Use External Declaration</div>
                    <button onClick={() => setDigitollModal(null)} style={{ width: 28, height: 28, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#667085" }}>close</span>
                    </button>
                  </div>
                  <div style={{ padding: "24px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#344054", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 6 }}>MRN from customs agent</div>
                    <input value={externalMrn} onChange={e => setExternalMrn(e.target.value.toUpperCase())}
                      placeholder="26NO0000000000000X" maxLength={18}
                      style={{ width: "100%", boxSizing: "border-box" as const, border: `1px solid ${externalMrn.length > 0 && !/^\d{2}[A-Z]{2}[A-Z0-9]{13}[A-Z0-9]$/.test(externalMrn) ? "#F04438" : "#D0D5DD"}`, borderRadius: 2, padding: "7px 10px", fontSize: 13, fontFamily: "'Roboto Mono',monospace", color: "#101828", outline: "none" }} />
                    {externalMrn.length > 0 && !/^\d{2}[A-Z]{2}[A-Z0-9]{13}[A-Z0-9]$/.test(externalMrn) && (
                      <div style={{ fontSize: 10.5, color: "#F04438", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontFamily: "Material Icons", fontSize: 12 }}>error_outline</span>
                        Invalid format — 18 chars: 2 digits + 2 letters + 14 alphanumeric
                      </div>
                    )}
                    {/^\d{2}[A-Z]{2}[A-Z0-9]{13}[A-Z0-9]$/.test(externalMrn) && (
                      <div style={{ fontSize: 10.5, color: "#027A48", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontFamily: "Material Icons", fontSize: 12 }}>check_circle</span>
                        Valid MRN format
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "12px 24px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button onClick={() => setDigitollModal(null)} style={{ padding: "7px 16px", border: "1px solid #D0D5DD", borderRadius: 2, background: "#fff", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", color: "#344054" }}>Cancel</button>
                    <button onClick={registerExternalMrn} disabled={savingMrn || !/^\d{2}[A-Z]{2}[A-Z0-9]{13}[A-Z0-9]$/.test(externalMrn)}
                      style={{ padding: "7px 16px", border: "none", borderRadius: 2, background: /^\d{2}[A-Z]{2}[A-Z0-9]{13}[A-Z0-9]$/.test(externalMrn) ? "#003160" : "#E4E7EC", color: /^\d{2}[A-Z]{2}[A-Z0-9]{13}[A-Z0-9]$/.test(externalMrn) ? "#fff" : "#98A2B3", fontSize: 12.5, fontWeight: 700, cursor: /^\d{2}[A-Z]{2}[A-Z0-9]{13}[A-Z0-9]$/.test(externalMrn) ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                      {savingMrn ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MASTER — shown if created */}
            {(trip.digitoll_id || trip.external_mrn) && (
              <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ padding: "10px 20px", borderBottom: "1px solid #F2F4F7" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>Master</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #E4E7EC", background: "#F8FAFC" }}>
                      {["Document No","Document Type","Carrier ID","Consignor","Consignee","Loading","Unloading"].map(h => (
                        <th key={h} style={{ padding: "8px 16px", textAlign: "left" as const, fontSize: 9.5, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr onClick={() => setHierarchyOpen(true)} style={{ cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#EEF4FF"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <td style={{ padding: "12px 16px", color: "#175CD3", fontWeight: 600 }}>{ownForm.master_doc_number || "—"}</td>
                      <td style={{ padding: "12px 16px", color: "#344054" }}>{ownForm.master_doc_type || "—"}</td>
                      <td style={{ padding: "12px 16px", color: "#344054" }}>{ownForm.master_carrier_id || "—"}</td>
                      <td style={{ padding: "12px 16px", color: "#344054" }}>{ownForm.master_consignor || "—"}</td>
                      <td style={{ padding: "12px 16px", color: "#344054" }}>{ownForm.master_consignee || "—"}</td>
                      <td style={{ padding: "12px 16px", color: "#667085" }}>{ownForm.master_loading || trip.from_city || "—"}</td>
                      <td style={{ padding: "12px 16px", color: "#667085" }}>{ownForm.master_unloading || trip.to_city || "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ORDERS / HOUSES */}
            <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ padding: "10px 20px", borderBottom: "1px solid #F2F4F7", display: "flex", alignItems: "center", gap: 8 }}>
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
      {hierarchyOpen && trip && (
        trip.digitoll_transport_id ? (
          <HierarchyModal
            type="transport"
            id={trip.digitoll_transport_id!}
            onClose={() => setHierarchyOpen(false)}
            onEdit={() => {}}
          />
        ) : (
          <div onClick={() => setHierarchyOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.5)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 4, padding: "32px 40px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center" as const, maxWidth: 380 }}>
              <span style={{ fontFamily: "Material Icons", fontSize: 40, color: "#D0D5DD", display: "block", marginBottom: 16 }}>send_to_mobile</span>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#344054", marginBottom: 8 }}>Not yet in Digitoll</div>
              <div style={{ fontSize: 12.5, color: "#667085", marginBottom: 20 }}>Send this trip to Digitoll first to view and edit the hierarchy.</div>
              <button onClick={() => setHierarchyOpen(false)}
                style={{ padding: "8px 20px", border: "1px solid #D0D5DD", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 12.5, fontFamily: "inherit" }}>
                Close
              </button>
            </div>
          </div>
        )
      )}

    </div>
  );
}