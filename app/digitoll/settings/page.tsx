"use client";
import { useState, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FieldConfig {
  key: string;
  label: string;
  description: string;
  type: "text" | "number" | "date";
  required: boolean;
  enabled: boolean;
  custom: boolean;
}

type Tab = "digitoll" | "declaration";

// ── Default fields ────────────────────────────────────────────────────────────
const DIGITOLL_DEFAULTS: FieldConfig[] = [
  { key: "exp_name",          label: "Exporter name",        description: "Legal name of the exporting company",              type: "text",   required: true,  enabled: true,  custom: false },
  { key: "exp_country",       label: "Exporter country",     description: "Country of origin / export",                       type: "text",   required: true,  enabled: true,  custom: false },
  { key: "imp_name",          label: "Importer name",        description: "Legal name of the importing company in Norway",     type: "text",   required: true,  enabled: true,  custom: false },
  { key: "imp_org_no",        label: "Importer org.no",      description: "Norwegian organisation number (9 digits)",          type: "text",   required: true,  enabled: true,  custom: false },
  { key: "totalValue",        label: "Total value",          description: "Total invoice value",                               type: "number", required: true,  enabled: true,  custom: false },
  { key: "currency",          label: "Currency",             description: "Invoice currency (ISO 4217)",                       type: "text",   required: true,  enabled: true,  custom: false },
  { key: "incoterm",          label: "Incoterm",             description: "Delivery terms (EXW, FOB, DAP etc.)",               type: "text",   required: true,  enabled: true,  custom: false },
  { key: "incotermPlace",     label: "Incoterm place",       description: "Named place for the incoterm",                     type: "text",   required: false, enabled: true,  custom: false },
  { key: "destinationCountry",label: "Destination country",  description: "Country of destination (should be NO)",             type: "text",   required: true,  enabled: true,  custom: false },
  { key: "modeOfTransport",   label: "Mode of transport",    description: "Road, Ship, Fly, Rail",                            type: "text",   required: true,  enabled: true,  custom: false },
  { key: "transportRef",      label: "Transport reference",  description: "Vehicle reg. number, IMO, flight number etc.",      type: "text",   required: false, enabled: true,  custom: false },
  { key: "borderCrossing",    label: "Border crossing",      description: "Norwegian border crossing point",                   type: "text",   required: false, enabled: true,  custom: false },
  { key: "totalNetWeight",    label: "Net weight (kg)",      description: "Total net weight of all goods",                    type: "number", required: true,  enabled: true,  custom: false },
  { key: "totalGrossWeight",  label: "Gross weight (kg)",    description: "Total gross weight including packaging",            type: "number", required: false, enabled: true,  custom: false },
  { key: "hsCode",            label: "HS code",              description: "Harmonized System commodity code",                  type: "text",   required: false, enabled: true,  custom: false },
  { key: "customsValue",      label: "Customs value",        description: "Value for customs purposes (may differ from invoice)", type: "number", required: false, enabled: false, custom: false },
  { key: "invoiceDate",       label: "Invoice date",         description: "Date the invoice was issued",                      type: "date",   required: false, enabled: false, custom: false },
  { key: "invoiceNumber",     label: "Invoice number",       description: "Seller's invoice reference number",                type: "text",   required: false, enabled: false, custom: false },
];

const DECLARATION_DEFAULTS: FieldConfig[] = [
  { key: "exp_name",          label: "Exporter name",        description: "Legal name of the exporting company",              type: "text",   required: true,  enabled: true,  custom: false },
  { key: "exp_address",       label: "Exporter address",     description: "Full street address of exporter",                  type: "text",   required: true,  enabled: true,  custom: false },
  { key: "exp_country",       label: "Exporter country",     description: "Country of origin / export",                       type: "text",   required: true,  enabled: true,  custom: false },
  { key: "imp_name",          label: "Importer name",        description: "Legal name of the importing company",              type: "text",   required: true,  enabled: true,  custom: false },
  { key: "imp_address",       label: "Importer address",     description: "Full street address of importer in Norway",        type: "text",   required: true,  enabled: true,  custom: false },
  { key: "imp_org_no",        label: "Importer org.no",      description: "Norwegian organisation number (9 digits)",          type: "text",   required: true,  enabled: true,  custom: false },
  { key: "imp_vat_no",        label: "Importer VAT no.",     description: "MVA-number for the Norwegian importer",            type: "text",   required: true,  enabled: true,  custom: false },
  { key: "totalValue",        label: "Total value",          description: "Total invoice value",                               type: "number", required: true,  enabled: true,  custom: false },
  { key: "currency",          label: "Currency",             description: "Invoice currency (ISO 4217)",                       type: "text",   required: true,  enabled: true,  custom: false },
  { key: "customsValue",      label: "Customs value",        description: "Statistical/customs value in NOK",                  type: "number", required: true,  enabled: true,  custom: false },
  { key: "incoterm",          label: "Incoterm",             description: "Delivery terms",                                   type: "text",   required: true,  enabled: true,  custom: false },
  { key: "incotermPlace",     label: "Incoterm place",       description: "Named place for the incoterm",                     type: "text",   required: true,  enabled: true,  custom: false },
  { key: "destinationCountry",label: "Destination country",  description: "Country of destination",                           type: "text",   required: true,  enabled: true,  custom: false },
  { key: "countryOfOrigin",   label: "Country of origin",    description: "Where the goods were manufactured",                type: "text",   required: true,  enabled: true,  custom: false },
  { key: "hsCode",            label: "HS code",              description: "Harmonized System commodity code (min. 6 digits)", type: "text",   required: true,  enabled: true,  custom: false },
  { key: "goodsDescription",  label: "Goods description",    description: "Plain text description of goods",                  type: "text",   required: true,  enabled: true,  custom: false },
  { key: "totalNetWeight",    label: "Net weight (kg)",      description: "Total net weight of all goods",                    type: "number", required: true,  enabled: true,  custom: false },
  { key: "totalGrossWeight",  label: "Gross weight (kg)",    description: "Total gross weight including packaging",            type: "number", required: true,  enabled: true,  custom: false },
  { key: "numberOfPackages",  label: "Number of packages",   description: "Total number of packages / colli",                 type: "number", required: true,  enabled: true,  custom: false },
  { key: "modeOfTransport",   label: "Mode of transport",    description: "Road, Ship, Fly, Rail",                            type: "text",   required: true,  enabled: true,  custom: false },
  { key: "transportRef",      label: "Transport reference",  description: "Vehicle reg., IMO, flight number etc.",            type: "text",   required: true,  enabled: true,  custom: false },
  { key: "invoiceDate",       label: "Invoice date",         description: "Date the invoice was issued",                      type: "date",   required: true,  enabled: true,  custom: false },
  { key: "invoiceNumber",     label: "Invoice number",       description: "Seller's invoice reference number",                type: "text",   required: true,  enabled: true,  custom: false },
  { key: "paymentTerms",      label: "Payment terms",        description: "Net days, payment method etc.",                    type: "text",   required: false, enabled: false, custom: false },
  { key: "bankDetails",       label: "Bank / IBAN",          description: "Seller's bank account for payment",               type: "text",   required: false, enabled: false, custom: false },
];

const STORAGE_KEY_D  = "settings_fields_digitoll";
const STORAGE_KEY_SD = "settings_fields_declaration";

// ── Style tokens ──────────────────────────────────────────────────────────────
const btnPri: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "#003160", color: "#fff", fontSize: 12.5, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit" };
const btnSec: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "#fff", color: "#344054", fontSize: 12.5, fontWeight: 500, border: "1px solid #D0D5DD", cursor: "pointer", fontFamily: "inherit" };
const btnDanger: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 6, background: "#FEF3F2", color: "#B42318", fontSize: 11.5, fontWeight: 500, border: "1px solid #FECDCA", cursor: "pointer", fontFamily: "inherit" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #D0D5DD", borderRadius: 8, fontSize: 13, color: "#101828", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const };
const tabBtn = (active: boolean): React.CSSProperties => ({ padding: "8px 18px", borderRadius: 8, border: "none", background: active ? "#003160" : "transparent", color: active ? "#fff" : "#667085", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" });

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!on)} style={{ width: 36, height: 20, borderRadius: 10, background: on ? "#003160" : "#D0D5DD", cursor: "pointer", position: "relative", transition: "background .15s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .15s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
    </div>
  );
}

// ── Type badge ────────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: string }) {
  const c: Record<string, [string, string]> = { text: ["#175CD3","#EFF8FF"], number: ["#027A48","#ECFDF3"], date: ["#B54708","#FFFAEB"] };
  const [color, bg] = c[type] ?? ["#667085","#F2F4F7"];
  return <span style={{ padding: "1px 7px", borderRadius: 4, fontSize: 10.5, fontWeight: 600, color, background: bg }}>{type}</span>;
}

// ── Add field form ────────────────────────────────────────────────────────────
function AddFieldForm({ onAdd, onCancel, existingKeys }: { onAdd: (f: FieldConfig) => void; onCancel: () => void; existingKeys: string[] }) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"text"|"number"|"date">("text");
  const [required, setRequired] = useState(false);
  const [error, setError] = useState("");

  function toKey(s: string) { return s.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/__+/g, "_"); }

  function submit() {
    if (!label.trim()) { setError("Label is required"); return; }
    const key = toKey(label);
    if (existingKeys.includes(key)) { setError(`Field key "${key}" already exists`); return; }
    onAdd({ key, label: label.trim(), description: description.trim(), type, required, enabled: true, custom: true });
  }

  return (
    <div style={{ border: "1px solid #B2CCFF", borderRadius: 10, padding: "18px 20px", background: "#F5F8FF", marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#175CD3", marginBottom: 14 }}>New custom field</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#344054", marginBottom: 4 }}>LABEL *</label>
          <input style={inp} value={label} onChange={e => { setLabel(e.target.value); setError(""); }} placeholder="e.g. Buyer reference" />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#344054", marginBottom: 4 }}>TYPE</label>
          <select style={inp} value={type} onChange={e => setType(e.target.value as "text"|"number"|"date")}>
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#344054", marginBottom: 4 }}>DESCRIPTION</label>
        <input style={inp} value={description} onChange={e => setDescription(e.target.value)} placeholder="What should the AI look for?" />
      </div>
      {label && <div style={{ fontSize: 11, color: "#98A2B3", marginBottom: 10 }}>Field key: <code style={{ background: "#F2F4F7", padding: "1px 5px", borderRadius: 4 }}>{toKey(label)}</code></div>}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Toggle on={required} onChange={setRequired} />
        <span style={{ fontSize: 12.5, color: "#344054" }}>Required field</span>
      </div>
      {error && <div style={{ fontSize: 12, color: "#B42318", marginBottom: 10 }}>⚠ {error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button style={btnPri} onClick={submit}>Add field</button>
        <button style={btnSec} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("digitoll");
  const [digitollFields, setDigitollFields]     = useState<FieldConfig[]>([]);
  const [declarationFields, setDeclarationFields] = useState<FieldConfig[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filter, setFilter] = useState<"all"|"enabled"|"disabled"|"custom">("all");

  // Load from localStorage or defaults
  useEffect(() => {
    try {
      const d  = localStorage.getItem(STORAGE_KEY_D);
      const sd = localStorage.getItem(STORAGE_KEY_SD);
      setDigitollFields(d  ? JSON.parse(d)  : DIGITOLL_DEFAULTS);
      setDeclarationFields(sd ? JSON.parse(sd) : DECLARATION_DEFAULTS);
    } catch {
      setDigitollFields(DIGITOLL_DEFAULTS);
      setDeclarationFields(DECLARATION_DEFAULTS);
    }
  }, []);

  const fields    = tab === "digitoll" ? digitollFields    : declarationFields;
  const setFields = tab === "digitoll" ? setDigitollFields : setDeclarationFields;

  function toggleField(key: string, prop: "enabled"|"required", val: boolean) {
    setFields(fs => fs.map(f => f.key === key ? { ...f, [prop]: val } : f));
  }

  function removeCustomField(key: string) {
    setFields(fs => fs.filter(f => f.key !== key));
  }

  function addField(f: FieldConfig) {
    setFields(fs => [...fs, f]);
    setShowAddForm(false);
  }

  function save() {
    localStorage.setItem(STORAGE_KEY_D,  JSON.stringify(digitollFields));
    localStorage.setItem(STORAGE_KEY_SD, JSON.stringify(declarationFields));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function resetToDefaults() {
    if (!confirm("Reset all fields to defaults? Custom fields will be removed.")) return;
    if (tab === "digitoll") { setDigitollFields(DIGITOLL_DEFAULTS); localStorage.removeItem(STORAGE_KEY_D); }
    else { setDeclarationFields(DECLARATION_DEFAULTS); localStorage.removeItem(STORAGE_KEY_SD); }
  }

  const filtered = fields.filter(f => {
    if (filter === "enabled")  return f.enabled;
    if (filter === "disabled") return !f.enabled;
    if (filter === "custom")   return f.custom;
    return true;
  });

  const enabledCount  = fields.filter(f => f.enabled).length;
  const disabledCount = fields.filter(f => !f.enabled).length;
  const customCount   = fields.filter(f => f.custom).length;

  const fBtn = (active: boolean): React.CSSProperties => ({ padding: "4px 12px", borderRadius: 16, border: `1px solid ${active ? "#003160" : "#D0D5DD"}`, background: active ? "#003160" : "#fff", color: active ? "#fff" : "#344054", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" });

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24, fontFamily: "'Inter', sans-serif" }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#101828" }}>Settings</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#667085" }}>Configure which fields the AI extracts from incoming documents</p>
      </div>

      {/* Tab selector */}
      <div style={{ display: "flex", gap: 4, background: "#F2F4F7", borderRadius: 10, padding: 4, width: "fit-content", marginBottom: 24 }}>
        <button style={tabBtn(tab === "digitoll")}    onClick={() => { setTab("digitoll");    setShowAddForm(false); setFilter("all"); }}>🚛 Digitoll</button>
        <button style={tabBtn(tab === "declaration")} onClick={() => { setTab("declaration"); setShowAddForm(false); setFilter("all"); }}>📋 Full Declaration</button>
      </div>

      {/* Info banner */}
      <div style={{ background: "#EFF8FF", border: "1px solid #B2CCFF", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12.5, color: "#175CD3" }}>
        <strong>How it works:</strong> Enabled fields are included in the AI extraction prompt. Required fields are highlighted when missing. Disabled fields are ignored completely.
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Total fields", val: fields.length, color: "#101828" },
          { label: "Enabled",      val: enabledCount,  color: "#027A48" },
          { label: "Disabled",     val: disabledCount, color: "#98A2B3" },
          { label: "Custom",       val: customCount,   color: "#175CD3" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 8, padding: "10px 16px", minWidth: 100 }}>
            <div style={{ fontSize: 11, color: "#98A2B3", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filter + actions row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, flexWrap: "wrap" as const }}>
        {([ ["all","All",fields.length], ["enabled","Enabled",enabledCount], ["disabled","Disabled",disabledCount], ["custom","Custom",customCount] ] as ["all"|"enabled"|"disabled"|"custom", string, number][]).map(([key,label,count]) => (
          <button key={key} onClick={() => setFilter(key)} style={fBtn(filter === key)}>
            {label} <span style={{ marginLeft: 3, background: filter === key ? "rgba(255,255,255,.2)" : "#F2F4F7", color: filter === key ? "#fff" : "#667085", borderRadius: 8, padding: "0 5px", fontSize: 10, fontWeight: 600 }}>{count}</span>
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button style={btnSec} onClick={resetToDefaults}>Reset to defaults</button>
          <button style={{ ...btnPri, opacity: showAddForm ? 0.5 : 1 }} onClick={() => setShowAddForm(v => !v)} disabled={showAddForm}>
            ＋ Add custom field
          </button>
        </div>
      </div>

      {/* Add field form */}
      {showAddForm && (
        <AddFieldForm
          onAdd={addField}
          onCancel={() => setShowAddForm(false)}
          existingKeys={fields.map(f => f.key)}
        />
      )}

      {/* Field list */}
      <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
        {/* List header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 100px 40px", gap: 0, padding: "8px 16px", background: "#F9FAFB", borderBottom: "1px solid #E4E7EC" }}>
          {["Field","Type","Required","Enabled","",""].map((h,i) => (
            <div key={i} style={{ fontSize: 10.5, fontWeight: 700, color: "#667085", letterSpacing: ".05em", textTransform: "uppercase" as const }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "#98A2B3", fontSize: 13 }}>No fields match this filter</div>
        )}

        {filtered.map((f, i) => (
          <div key={f.key} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 100px 40px", gap: 0, padding: "12px 16px", borderBottom: i < filtered.length - 1 ? "1px solid #F2F4F7" : "none", alignItems: "center", background: f.enabled ? "#fff" : "#FAFAFA", opacity: f.enabled ? 1 : 0.6 }}>
            {/* Field info */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#101828" }}>{f.label}</span>
                {f.custom && <span style={{ background: "#EFF8FF", color: "#175CD3", borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>CUSTOM</span>}
                {f.required && f.enabled && <span style={{ background: "#FEF3F2", color: "#B42318", borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>REQ</span>}
              </div>
              <div style={{ fontSize: 11.5, color: "#98A2B3" }}>{f.description || <span style={{ fontStyle: "italic" }}>key: {f.key}</span>}</div>
            </div>
            {/* Type */}
            <div><TypeBadge type={f.type} /></div>
            {/* Required toggle */}
            <div><Toggle on={f.required} onChange={v => toggleField(f.key, "required", v)} /></div>
            {/* Enabled toggle */}
            <div><Toggle on={f.enabled} onChange={v => toggleField(f.key, "enabled", v)} /></div>
            {/* Status text */}
            <div style={{ fontSize: 11.5, color: f.enabled ? "#027A48" : "#98A2B3", fontWeight: 500 }}>
              {f.enabled ? "Active" : "Disabled"}
            </div>
            {/* Remove (custom only) */}
            <div>
              {f.custom && (
                <button onClick={() => removeCustomField(f.key)} style={btnDanger} title="Remove field">✕</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Save bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "#fff", border: "1px solid #E4E7EC", borderRadius: 10 }}>
        <div style={{ fontSize: 12.5, color: "#667085" }}>
          Changes apply to all new document extractions. Existing extracted data is not affected.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {saved && (
            <span style={{ fontSize: 12.5, color: "#027A48", fontWeight: 500 }}>✓ Settings saved</span>
          )}
          <button style={btnPri} onClick={save}>Save settings</button>
        </div>
      </div>
    </div>
  );
}