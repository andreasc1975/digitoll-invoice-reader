"use client";
import React, { useState, useEffect } from "react";

type RecordType = "transport" | "master" | "house";

interface Props {
  type: RecordType;
  id: string;
  onSave: () => void;   // called after successful PATCH
  onCancel: () => void; // called on cancel
}

// ── Shared style helpers ────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: "100%", padding: "7px 10px", border: "1px solid #D0D5DD",
  borderRadius: 2, fontSize: 12.5, fontFamily: "inherit", outline: "none",
  boxSizing: "border-box" as const, background: "#fff",
};
function FL({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#344054", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>
      {children}{required && <span style={{ color: "#D92D20" }}> *</span>}
    </label>
  );
}
function Section({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em", paddingBottom: 6, borderBottom: "1px solid #F2F4F7", marginTop: 4 }}>{children}</div>;
}
function Grid2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>;
}
function Grid3({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>{children}</div>;
}

const TRANSPORT_MODES = ["Road", "Ship", "Air", "Rail"];
const BORDER_CROSSINGS = ["Svinesund", "Ørje", "Magnor", "Riksåsen", "Bjørnefjell", "Storlien", "Treriksrøysa", "Other"];

// ── Transport form ──────────────────────────────────────────────────────────
function TransportFields({ form, set }: { form: Record<string, string>; set: (f: Record<string, string>) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Section>Transport means</Section>
      <Grid2>
        <div><FL required>Transport mode</FL>
          <select style={inp} value={form.transport_mode ?? ""} onChange={e => set({ ...form, transport_mode: e.target.value })}>
            {TRANSPORT_MODES.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div><FL>Reference</FL>
          <input style={inp} value={form.reference ?? ""} onChange={e => set({ ...form, reference: e.target.value })} placeholder="Auto-generated if empty" />
        </div>
      </Grid2>
      <Grid2>
        <div><FL required>Identification number</FL>
          <input style={inp} value={form.identification_number ?? ""} onChange={e => set({ ...form, identification_number: e.target.value })} placeholder="Reg. no, IMO, IATA…" />
        </div>
        <div><FL required>Type of identification</FL>
          <select style={inp} value={form.type_of_identification ?? ""} onChange={e => set({ ...form, type_of_identification: e.target.value })}>
            <option value="">Select…</option>
            <option value="10">IMO ship identification number</option>
            <option value="11">Name of sea-going vessel</option>
            <option value="20">Wagon number</option>
            <option value="21">Train number</option>
            <option value="30">Registration number of road vehicle</option>
            <option value="40">IATA flight number</option>
            <option value="41">Registration number of aircraft</option>
            <option value="80">European vessel identification number (ENI)</option>
            <option value="81">Name of inland waterways vessel</option>
          </select>
        </div>
      </Grid2>
      <Grid2>
        <div><FL>Carrier / vehicle ref.</FL>
          <input style={inp} value={form.carrier ?? ""} onChange={e => set({ ...form, carrier: e.target.value })} placeholder="ABC 123 456" />
        </div>
        <div><FL>Conveyance ref. no.</FL>
          <input style={inp} value={form.conveyance_reference_number ?? ""} onChange={e => set({ ...form, conveyance_reference_number: e.target.value })} placeholder="Route number" />
        </div>
      </Grid2>

      <Section>Operator / driver</Section>
      <Grid2>
        <div><FL required>Operator name</FL>
          <input style={inp} value={form.operator_name ?? ""} onChange={e => set({ ...form, operator_name: e.target.value })} placeholder="Full name or company" />
        </div>
        <div><FL>Operator ID</FL>
          <input style={inp} value={form.operator_id ?? ""} onChange={e => set({ ...form, operator_id: e.target.value })} placeholder="EORI / org. no." />
        </div>
      </Grid2>

      <Section>Arrival</Section>
      <Grid2>
        <div><FL required>Border crossing</FL>
          <select style={inp} value={form.border_crossing ?? ""} onChange={e => set({ ...form, border_crossing: e.target.value })}>
            <option value="">Select…</option>
            {BORDER_CROSSINGS.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div><FL required>Customs office</FL>
          <input style={inp} value={form.customs_office ?? ""} onChange={e => set({ ...form, customs_office: e.target.value })} placeholder="e.g. NO003201" />
        </div>
      </Grid2>
      <Grid2>
        <div><FL required>Scheduled arrival</FL>
          <input style={inp} type="datetime-local" value={form.scheduled_arrival ?? ""} onChange={e => set({ ...form, scheduled_arrival: e.target.value })} />
        </div>
        <div><FL>ETA (estimated)</FL>
          <input style={inp} type="datetime-local" value={form.eta ?? ""} onChange={e => set({ ...form, eta: e.target.value })} />
        </div>
      </Grid2>
    </div>
  );
}

// ── Master form ─────────────────────────────────────────────────────────────
function MasterFields({ form, set }: { form: Record<string, string>; set: (f: Record<string, string>) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Grid2>
        <div><FL>Reference</FL>
          <input style={inp} value={form.reference ?? ""} onChange={e => set({ ...form, reference: e.target.value })} placeholder="Auto-generated if empty" />
        </div>
        <div><FL>Gross weight (kg)</FL>
          <input style={inp} value={form.gross_weight ?? ""} onChange={e => set({ ...form, gross_weight: e.target.value })} placeholder="1240.00" />
        </div>
      </Grid2>

      <Section>Consignment note / Waybill</Section>
      <Grid3>
        <div><FL required>Document number</FL>
          <input style={inp} value={form.document_number ?? ""} onChange={e => set({ ...form, document_number: e.target.value })} placeholder="12345678" />
        </div>
        <div><FL required>Document type</FL>
          <select style={inp} value={form.document_type ?? ""} onChange={e => set({ ...form, document_type: e.target.value })}>
            <option value="">Select…</option>
            <option value="740">Air waybill</option>
            <option value="741">Master air waybill</option>
            <option value="703">Bill of lading</option>
            <option value="704">Sea waybill</option>
            <option value="720">Road consignment note (CMR)</option>
            <option value="722">Rail consignment note (CIM)</option>
          </select>
        </div>
        <div><FL>Carrier ID (EORI)</FL>
          <input style={inp} value={form.carrier_id ?? ""} onChange={e => set({ ...form, carrier_id: e.target.value })} placeholder="NO123456789" />
        </div>
      </Grid3>

      <Section>Locations & Equipment</Section>
      <Grid2>
        <div><FL required>Loading location</FL>
          <input style={inp} value={form.loading_location ?? ""} onChange={e => set({ ...form, loading_location: e.target.value })} placeholder="e.g. Gothenburg port" />
        </div>
        <div><FL required>Unloading location</FL>
          <input style={inp} value={form.unloading_location ?? ""} onChange={e => set({ ...form, unloading_location: e.target.value })} placeholder="e.g. Oslo terminal" />
        </div>
      </Grid2>
      <Grid2>
        <div><FL required>Transport equipment</FL>
          <input style={inp} value={form.transport_equipment ?? ""} onChange={e => set({ ...form, transport_equipment: e.target.value })} placeholder="Container no., trailer reg…" />
        </div>
        <div><FL>Relevant documents</FL>
          <input style={inp} value={form.relevant_documents ?? ""} onChange={e => set({ ...form, relevant_documents: e.target.value })} placeholder="e.g. INV-001, PACK-001" />
        </div>
      </Grid2>
    </div>
  );
}

// ── House form ──────────────────────────────────────────────────────────────
function HouseFields({ form, set }: { form: Record<string, string>; set: (f: Record<string, string>) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Section>Parties</Section>
      <Grid2>
        <div><FL required>Exporter</FL>
          <input style={inp} value={form.exporter ?? ""} onChange={e => set({ ...form, exporter: e.target.value })} placeholder="Company name" />
        </div>
        <div><FL required>Importer</FL>
          <input style={inp} value={form.importer ?? ""} onChange={e => set({ ...form, importer: e.target.value })} placeholder="Company name" />
        </div>
      </Grid2>
      <div><FL>Importer org. no.</FL>
        <input style={inp} value={form.importer_org_no ?? ""} onChange={e => set({ ...form, importer_org_no: e.target.value })} placeholder="987654321" />
      </div>

      <Section>Goods</Section>
      <div><FL>Goods description</FL>
        <input style={inp} value={form.goods_description ?? ""} onChange={e => set({ ...form, goods_description: e.target.value })} placeholder="Automotive spare parts…" />
      </div>
      <Grid3>
        <div><FL>HS code</FL>
          <input style={inp} value={form.hs_code ?? ""} onChange={e => set({ ...form, hs_code: e.target.value })} placeholder="8708.99.97" />
        </div>
        <div><FL>Country of origin</FL>
          <input style={inp} value={form.country_origin ?? ""} onChange={e => set({ ...form, country_origin: e.target.value })} placeholder="DE" />
        </div>
        <div><FL>Packages</FL>
          <input style={inp} value={form.packages ?? ""} onChange={e => set({ ...form, packages: e.target.value })} placeholder="24 cartons" />
        </div>
      </Grid3>
      <Grid2>
        <div><FL>Gross weight (kg)</FL>
          <input style={inp} value={form.gross_weight ?? ""} onChange={e => set({ ...form, gross_weight: e.target.value })} placeholder="1240.00" />
        </div>
        <div><FL>Net weight (kg)</FL>
          <input style={inp} value={form.net_weight ?? ""} onChange={e => set({ ...form, net_weight: e.target.value })} placeholder="1108.50" />
        </div>
      </Grid2>

      <Section>Consignment note / Tracking</Section>
      <Grid2>
        <div><FL required>Tracking / waybill number</FL>
          <input style={inp} value={form.tracking_number ?? ""} onChange={e => set({ ...form, tracking_number: e.target.value })} placeholder="House waybill no." />
        </div>
        <div><FL required>Customs procedure</FL>
          <select style={inp} value={form.customs_procedure ?? ""} onChange={e => set({ ...form, customs_procedure: e.target.value })}>
            <option value="">Select…</option>
            <option value="H1">H1 — Release for free circulation</option>
            <option value="H2">H2 — Special procedure</option>
            <option value="H3">H3 — Temporary admission</option>
            <option value="H4">H4 — End use</option>
            <option value="H5">H5 — Free zone</option>
          </select>
        </div>
      </Grid2>

      <Section>Declaration references</Section>
      <Grid3>
        <div><FL>Import declaration ref.</FL>
          <input style={inp} value={form.import_declaration_ref ?? ""} onChange={e => set({ ...form, import_declaration_ref: e.target.value })} placeholder="MRN or ref. no." />
        </div>
        <div><FL>Export declaration ref.</FL>
          <input style={inp} value={form.export_declaration_ref ?? ""} onChange={e => set({ ...form, export_declaration_ref: e.target.value })} placeholder="MRN or ref. no." />
        </div>
        <div><FL>NCTS transit ref.</FL>
          <input style={inp} value={form.ncts_reference ?? ""} onChange={e => set({ ...form, ncts_reference: e.target.value })} placeholder="MRN" />
        </div>
      </Grid3>

      <Section>Locations & Equipment</Section>
      <Grid2>
        <div><FL required>Loading location</FL>
          <input style={inp} value={form.loading_location ?? ""} onChange={e => set({ ...form, loading_location: e.target.value })} placeholder="e.g. Gothenburg port" />
        </div>
        <div><FL required>Unloading location</FL>
          <input style={inp} value={form.unloading_location ?? ""} onChange={e => set({ ...form, unloading_location: e.target.value })} placeholder="e.g. Oslo terminal" />
        </div>
      </Grid2>
      <Grid2>
        <div><FL required>Transport equipment</FL>
          <input style={inp} value={form.transport_equipment ?? ""} onChange={e => set({ ...form, transport_equipment: e.target.value })} placeholder="Container no., trailer reg…" />
        </div>
        <div><FL>Relevant documents</FL>
          <input style={inp} value={form.relevant_documents ?? ""} onChange={e => set({ ...form, relevant_documents: e.target.value })} placeholder="e.g. INV-001, PACK-001" />
        </div>
      </Grid2>
    </div>
  );
}

// ── Main EditForm component ─────────────────────────────────────────────────
const API_PATH: Record<RecordType, string> = {
  transport: "/api/transports",
  master:    "/api/masters",
  house:     "/api/houses",
};

export function EditForm({ type, id, onSave, onCancel }: Props) {
  const [form, setForm]   = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Load existing data
  useEffect(() => {
    setLoading(true);
    fetch(`${API_PATH[type]}/${id}`)
      .then(r => r.json())
      .then(d => {
        // Convert all values to strings for form fields
        const f: Record<string, string> = {};
        for (const [k, v] of Object.entries(d)) {
          if (v !== null && v !== undefined && typeof v !== "object") {
            f[k] = String(v);
          }
        }
        setForm(f);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load data"); setLoading(false); });
  }, [type, id]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_PATH[type]}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setError(e.error ?? "Save failed");
        setSaving(false);
        return;
      }
      onSave();
    } catch {
      setError("Network error");
      setSaving(false);
    }
  }

  const TYPE_LABEL: Record<RecordType, string> = {
    transport: "Transport", master: "Master", house: "House",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Edit header strip */}
      <div style={{ padding: "10px 22px", background: "#F8FAFC", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "Material Icons", fontSize: 15, color: "#446BF9" }}>edit</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#446BF9", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>
          Editing {TYPE_LABEL[type]}
        </span>
        <span style={{ fontSize: 11, color: "#98A2B3", marginLeft: 2 }}>
          {form.state_id ?? form.reference ?? ""}
        </span>
        <button onClick={onCancel} style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: "#344054" }}>
          ← Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          style={{ padding: "4px 14px", borderRadius: 2, border: "none", background: saving ? "#D0D5DD" : "#446BF9", color: "#fff", fontSize: 12, fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: "inherit" }}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Form body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#98A2B3", padding: 24 }}>Loading…</div>
        ) : (
          <>
            {error && <div style={{ marginBottom: 12, padding: "8px 12px", background: "#FFF9F9", border: "1px solid #FDA29B", borderRadius: 2, fontSize: 12.5, color: "#B42318" }}>{error}</div>}
            {type === "transport" && <TransportFields form={form} set={setForm} />}
            {type === "master"    && <MasterFields    form={form} set={setForm} />}
            {type === "house"     && <HouseFields     form={form} set={setForm} />}
          </>
        )}
      </div>
    </div>
  );
}
