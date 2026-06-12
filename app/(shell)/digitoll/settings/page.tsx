"use client";
import React, { useState, useEffect } from "react";

function getSADSection(key: string): string | null {
  if (["sad_exp_name","sad_exp_address","sad_exp_country","sad_exp_org_no","sad_imp_name","sad_imp_address","sad_imp_org_no","sad_imp_vat_no","sad_declarant_name","sad_declarant_org_no"].includes(key)) return "A — Parties (SAD fields 2, 8, 14)";
  if (["sad_declaration_ref","sad_invoice_number","sad_invoice_date","sad_prev_document","sad_licences"].includes(key)) return "B — References & Documents (SAD fields 7, 40, 44)";
  if (["sad_incoterm","sad_incoterm_place","sad_transport_mode_border","sad_transport_ref_border","sad_transport_mode_inland","sad_border_crossing","sad_country_dispatch","sad_country_destination"].includes(key)) return "C — Transport & Routing (SAD fields 15, 17, 20, 21, 25, 29)";
  if (["sad_goods_description","sad_hs_code","sad_country_origin","sad_gross_weight","sad_net_weight","sad_packages","sad_supplementary_units"].includes(key)) return "D — Goods (SAD fields 31, 33, 34, 35, 38, 41)";
  if (["sad_invoice_value","sad_currency","sad_exchange_rate","sad_statistical_value","sad_customs_duty_rate","sad_customs_duty_amount","sad_vat_basis","sad_payment_method"].includes(key)) return "E — Value & Duties (SAD fields 22, 23, 46, 47)";
  return null;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface FieldConfig {
  key: string;
  label: string;
  description: string;
  type: "text" | "number" | "date";
  required: boolean;
  enabled: boolean;
  custom: boolean;
  section?: string;
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

// SAD = Single Administrative Document — Norwegian Customs (TVINN)
// Grouped by SAD section. SAD field numbers in description for reference.
const DECLARATION_DEFAULTS: FieldConfig[] = [

  // ── SECTION A: Parties (SAD fields 2, 8, 14) ──────────────────────────────
  { key: "sad_exp_name",           label: "Exporter name",              description: "SAD field 2 — Legal name of the exporting company",                              type: "text",   required: true,  enabled: true,  custom: false },
  { key: "sad_exp_address",        label: "Exporter address",           description: "SAD field 2 — Full street address of exporter",                                  type: "text",   required: true,  enabled: true,  custom: false },
  { key: "sad_exp_country",        label: "Exporter country",           description: "SAD field 2 — ISO country code of exporter (e.g. SE, DE)",                       type: "text",   required: true,  enabled: true,  custom: false },
  { key: "sad_exp_org_no",         label: "Exporter org. no.",          description: "SAD field 2 — Organisation/VAT number of the exporter",                          type: "text",   required: false, enabled: true,  custom: false },
  { key: "sad_imp_name",           label: "Importer name",              description: "SAD field 8 — Legal name of the importing company in Norway",                    type: "text",   required: true,  enabled: true,  custom: false },
  { key: "sad_imp_address",        label: "Importer address",           description: "SAD field 8 — Full street address of importer in Norway",                        type: "text",   required: true,  enabled: true,  custom: false },
  { key: "sad_imp_org_no",         label: "Importer org. no.",          description: "SAD field 8 — Norwegian organisation number (9 digits)",                         type: "text",   required: true,  enabled: true,  custom: false },
  { key: "sad_imp_vat_no",         label: "Importer VAT no.",           description: "SAD field 8 — Norwegian MVA-number (format: MVA + 9 digits)",                   type: "text",   required: true,  enabled: true,  custom: false },
  { key: "sad_declarant_name",     label: "Declarant / agent name",     description: "SAD field 14 — Name of the customs agent or declarant submitting to TVINN",      type: "text",   required: false, enabled: true,  custom: false },
  { key: "sad_declarant_org_no",   label: "Declarant org. no.",         description: "SAD field 14 — Organisation number of the customs agent",                        type: "text",   required: false, enabled: true,  custom: false },

  // ── SECTION B: References & dates (SAD fields 7, 40, 44) ──────────────────
  { key: "sad_declaration_ref",    label: "Declaration reference",      description: "SAD field 7 — Declarant's own reference number for the declaration",             type: "text",   required: false, enabled: true,  custom: false },
  { key: "sad_invoice_number",     label: "Invoice number",             description: "SAD field 44 — Seller's invoice reference number",                               type: "text",   required: true,  enabled: true,  custom: false },
  { key: "sad_invoice_date",       label: "Invoice date",               description: "SAD field 44 — Date the invoice was issued",                                     type: "date",   required: true,  enabled: true,  custom: false },
  { key: "sad_prev_document",      label: "Previous document",          description: "SAD field 40 — Transit MRN or other preceding document reference",               type: "text",   required: false, enabled: false, custom: false },
  { key: "sad_licences",           label: "Licences / permits",         description: "SAD field 44 — Any import licences, health certificates or permits required",    type: "text",   required: false, enabled: false, custom: false },

  // ── SECTION C: Transport (SAD fields 20, 21, 25, 26, 29) ──────────────────
  { key: "sad_incoterm",           label: "Incoterm",                   description: "SAD field 20 — Delivery terms code (EXW, FOB, CIF, DAP etc.)",                  type: "text",   required: true,  enabled: true,  custom: false },
  { key: "sad_incoterm_place",     label: "Incoterm place",             description: "SAD field 20 — Named place corresponding to the incoterm",                       type: "text",   required: true,  enabled: true,  custom: false },
  { key: "sad_transport_mode_border", label: "Transport mode at border",description: "SAD field 21 — Mode of transport crossing the Norwegian border (Road/Sea/Air/Rail)", type: "text", required: true,  enabled: true,  custom: false },
  { key: "sad_transport_ref_border",  label: "Transport reference",     description: "SAD field 21 — Vehicle reg. no., IMO number, flight number or similar",         type: "text",   required: true,  enabled: true,  custom: false },
  { key: "sad_transport_mode_inland", label: "Inland transport mode",   description: "SAD field 25 — Mode of transport within Norway after border crossing",          type: "text",   required: false, enabled: false, custom: false },
  { key: "sad_border_crossing",    label: "Border crossing",            description: "SAD field 29 — Norwegian border crossing point (e.g. Svinesund, Ørje, Magnor)", type: "text",   required: true,  enabled: true,  custom: false },
  { key: "sad_country_dispatch",   label: "Country of dispatch",        description: "SAD field 15 — Country from which goods were dispatched",                        type: "text",   required: true,  enabled: true,  custom: false },
  { key: "sad_country_destination",label: "Country of destination",     description: "SAD field 17 — Country of destination (NO for Norway)",                         type: "text",   required: true,  enabled: true,  custom: false },

  // ── SECTION D: Goods (SAD fields 31, 33, 34, 35, 38, 41) ──────────────────
  { key: "sad_goods_description",  label: "Goods description",          description: "SAD field 31 — Plain text description of the goods",                             type: "text",   required: true,  enabled: true,  custom: false },
  { key: "sad_hs_code",            label: "HS / commodity code",        description: "SAD field 33 — Harmonized System code, minimum 6 digits (Norwegian tariff)",     type: "text",   required: true,  enabled: true,  custom: false },
  { key: "sad_country_origin",     label: "Country of origin",          description: "SAD field 34 — Country where the goods were manufactured or produced",           type: "text",   required: true,  enabled: true,  custom: false },
  { key: "sad_gross_weight",       label: "Gross weight (kg)",          description: "SAD field 35 — Total gross weight including all packaging",                      type: "number", required: true,  enabled: true,  custom: false },
  { key: "sad_net_weight",         label: "Net weight (kg)",            description: "SAD field 38 — Total net weight of goods excluding packaging",                   type: "number", required: true,  enabled: true,  custom: false },
  { key: "sad_packages",           label: "Number of packages",         description: "SAD field 31 — Total number of packages / colli",                                type: "number", required: true,  enabled: true,  custom: false },
  { key: "sad_supplementary_units",label: "Supplementary units",        description: "SAD field 41 — Additional quantity unit if required by tariff (litres, pairs etc.)", type: "text", required: false, enabled: false, custom: false },

  // ── SECTION E: Value & duties (SAD fields 22, 23, 46, 47) ─────────────────
  { key: "sad_invoice_value",      label: "Invoice value",              description: "SAD field 22 — Total value on the commercial invoice",                           type: "number", required: true,  enabled: true,  custom: false },
  { key: "sad_currency",           label: "Currency",                   description: "SAD field 22 — Invoice currency code (ISO 4217, e.g. EUR, SEK, USD)",           type: "text",   required: true,  enabled: true,  custom: false },
  { key: "sad_exchange_rate",      label: "Exchange rate",              description: "SAD field 23 — Exchange rate to NOK at time of declaration",                    type: "number", required: false, enabled: true,  custom: false },
  { key: "sad_statistical_value",  label: "Statistical value (NOK)",    description: "SAD field 46 — Customs/statistical value in NOK (basis for VAT calculation)",   type: "number", required: true,  enabled: true,  custom: false },
  { key: "sad_customs_duty_rate",  label: "Customs duty rate (%)",      description: "SAD field 47 — Applicable customs duty rate from Norwegian tariff",             type: "number", required: false, enabled: false, custom: false },
  { key: "sad_customs_duty_amount",label: "Customs duty amount (NOK)",  description: "SAD field 47 — Calculated customs duty in NOK",                                 type: "number", required: false, enabled: false, custom: false },
  { key: "sad_vat_basis",          label: "VAT basis (NOK)",            description: "SAD field 47 — Basis for import VAT = statistical value + duties",              type: "number", required: false, enabled: false, custom: false },
  { key: "sad_payment_method",     label: "Payment method (duties)",    description: "SAD field 47 — How duties will be paid (deferred, immediate etc.)",             type: "text",   required: false, enabled: false, custom: false },
];

const STORAGE_KEY_D  = "settings_fields_digitoll";
const STORAGE_KEY_SD = "settings_fields_declaration";

const btnPri: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 2, background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit" };
const btnSec: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 2, background: "#fff", color: "#344054", fontSize: 12.5, fontWeight: 500, border: "1px solid #D0D5DD", cursor: "pointer", fontFamily: "inherit" };
const btnDanger: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 2, background: "#FEF3F2", color: "#B42318", fontSize: 11.5, fontWeight: 500, border: "1px solid #FECDCA", cursor: "pointer", fontFamily: "inherit" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #D0D5DD", borderRadius: 2, fontSize: 13, color: "#101828", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const };
const fBtn = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 14px", height: 36, boxSizing: "border-box" as const, borderRadius: 2, border: "1px solid transparent", background: active ? "#003160" : "#D9DBE0", color: active ? "#fff" : "#003160", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const });

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!on)} style={{ width: 36, height: 20, borderRadius: 10, background: on ? "#446BF9" : "#D0D5DD", cursor: "pointer", position: "relative", transition: "background .15s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .15s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const c: Record<string, [string, string]> = { text: ["#175CD3","#EFF8FF"], number: ["#027A48","#ECFDF3"], date: ["#B54708","#FFFAEB"] };
  const [color, bg] = c[type] ?? ["#667085","#F2F4F7"];
  return <span style={{ padding: "1px 7px", borderRadius: 2, fontSize: 10, fontWeight: 700, color, background: bg, textTransform: "uppercase" as const }}>{type}</span>;
}

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
    <div style={{ border: "1px solid #B2CCFF", borderRadius: 2, padding: "18px 20px", background: "#F5F8FF", marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#175CD3", marginBottom: 14, textTransform: "uppercase" as const, letterSpacing: ".05em" }}>New custom field</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#344054", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>Label *</label>
          <input style={inp} value={label} onChange={e => { setLabel(e.target.value); setError(""); }} placeholder="e.g. Buyer reference" />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#344054", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>Type</label>
          <select style={inp} value={type} onChange={e => setType(e.target.value as "text"|"number"|"date")}>
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#344054", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>Description</label>
        <input style={inp} value={description} onChange={e => setDescription(e.target.value)} placeholder="What should the AI look for?" />
      </div>
      {label && <div style={{ fontSize: 11, color: "#98A2B3", marginBottom: 10 }}>Field key: <code style={{ background: "#F2F4F7", padding: "1px 5px", borderRadius: 2 }}>{toKey(label)}</code></div>}
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

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("digitoll");
  const [digitollFields, setDigitollFields]         = useState<FieldConfig[]>([]);
  const [declarationFields, setDeclarationFields]   = useState<FieldConfig[]>([]);
  const [showAddForm, setShowAddForm]               = useState(false);
  const [saved, setSaved]                           = useState(false);
  const [filter, setFilter]                         = useState<"all"|"enabled"|"disabled"|"custom">("all");
  const [search, setSearch]                         = useState("");

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
  function removeCustomField(key: string) { setFields(fs => fs.filter(f => f.key !== key)); }
  function addField(f: FieldConfig) { setFields(fs => [...fs, f]); setShowAddForm(false); }

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
    if (search && !f.label.toLowerCase().includes(search.toLowerCase()) && !f.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "enabled")  return f.enabled;
    if (filter === "disabled") return !f.enabled;
    if (filter === "custom")   return f.custom;
    return true;
  });

  const enabledCount  = fields.filter(f => f.enabled).length;
  const disabledCount = fields.filter(f => !f.enabled).length;
  const customCount   = fields.filter(f => f.custom).length;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Övre sektion — ljusgrå ──────────────────────────────────────────── */}
      <div style={{ background: "#F5F5F5", padding: "20px 20px 16px", borderBottom: "1px solid #E4E7EC" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#101828" }}>Settings</h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#667085" }}>Configure which fields the AI extracts from incoming documents</p>
          </div>
          <button style={btnPri} onClick={() => setShowAddForm(v => !v)} disabled={showAddForm}>
            <span style={{ fontFamily: "Material Icons", fontSize: 16, lineHeight: 1 }}>add</span>
            Add custom field
          </button>
        </div>

        {/* Tab selector med Material Icons */}
        <div style={{ display: "flex", gap: 2, background: "#E4E7EC", borderRadius: 2, padding: 3, width: "fit-content", marginBottom: 16 }}>
          {([
            { key: "digitoll",     label: "Digitoll",              icon: "receipt_long" },
            { key: "declaration",  label: "Customs Declaration",   icon: "gavel" },
          ] as { key: Tab; label: string; icon: string }[]).map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setShowAddForm(false); setFilter("all"); setSearch(""); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 2, border: "none", background: tab === t.key ? "#003160" : "transparent", color: tab === t.key ? "#fff" : "#667085", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}
            >
              <span style={{ fontFamily: "Material Icons", fontSize: 15, lineHeight: 1 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Stat-kort */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            { label: "Total fields", val: fields.length, color: "#101828" },
            { label: "Enabled",      val: enabledCount,  color: "#027A48" },
            { label: "Disabled",     val: disabledCount, color: "#98A2B3" },
            { label: "Custom",       val: customCount,   color: "#175CD3" },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 2, padding: "10px 16px" }}>
              <div style={{ fontSize: 11, color: "#98A2B3", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filter + söksektionen ───────────────────────────────────────────── */}
      <div style={{ padding: "14px 20px 0", background: "#fff", borderBottom: "1px solid #E4E7EC" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          {([ ["all","All",fields.length], ["enabled","Enabled",enabledCount], ["disabled","Disabled",disabledCount], ["custom","Custom",customCount] ] as ["all"|"enabled"|"disabled"|"custom", string, number][]).map(([key, label, count]) => (
            <button key={key} onClick={() => setFilter(key)} style={fBtn(filter === key)}>
              {label}
              <span style={{ background: filter === key ? "rgba(255,255,255,0.25)" : "#003160", color: "#fff", borderRadius: 2, padding: "1px 7px", fontSize: 10, fontWeight: 700, minWidth: 20, textAlign: "center" as const, lineHeight: "16px" }}>{count}</span>
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 2 }}>
            <button onClick={resetToDefaults} title="Reset to defaults" style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: "pointer", borderRadius: 2, color: "#003160", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>↺</button>
            <button title="Filter" style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: "pointer", borderRadius: 2, color: "#003160", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>⊟</button>
          </div>
        </div>
        <div style={{ height: 1, background: "#E4E7EC", margin: "0 -20px 10px" }} />
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff" }}>
            <span style={{ fontFamily: "Material Icons", fontSize: 18, color: "#98A2B3", lineHeight: 1, userSelect: "none" as const }}>search</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search fields..." style={{ border: "none", outline: "none", fontSize: 13, color: "#344054", fontFamily: "inherit", width: "100%", background: "transparent" }} />
            {search && <button onClick={() => setSearch("")} style={{ border: "none", background: "transparent", color: "#98A2B3", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>✕</button>}
          </div>
        </div>
      </div>

      {/* ── Fältlista ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* Add field form */}
        {showAddForm && (
          <div style={{ padding: "16px 20px 0" }}>
            <AddFieldForm onAdd={addField} onCancel={() => setShowAddForm(false)} existingKeys={fields.map(f => f.key)} />
          </div>
        )}

        {/* Info banner */}
        <div style={{ padding: "10px 20px", background: "#EFF8FF", borderBottom: "1px solid #B2CCFF", fontSize: 12, color: "#175CD3" }}>
          <strong>How it works:</strong> Enabled fields are included in the AI extraction prompt. Required fields are highlighted when missing. Disabled fields are ignored completely.
        </div>

        {/* Table */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fff", borderBottom: "2px solid #E4E7EC" }}>
              {["Field", "Type", "Required", "Enabled", "Status", ""].map((h, i) => (
                <th key={i} style={{ padding: "9px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#003160", letterSpacing: ".04em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#98A2B3", fontSize: 13 }}>No fields match</td></tr>
            )}
            {filtered.map((f, i) => {
              // Visa sektionsrubrik för SAD-fält
              const prevF = filtered[i - 1];
              const section = f.key.startsWith("sad_") ? f.description.split("—")[0].replace("SAD field ", "SAD ").trim() : null;
              const prevSection = prevF?.key.startsWith("sad_") ? prevF.description.split("—")[0].replace("SAD field ", "SAD ").trim() : null;
              const sectionLabel = tab === "declaration" && section !== prevSection ? getSADSection(f.key) : null;

              return (
                <React.Fragment key={f.key}>
                  {sectionLabel && (
                    <tr>
                      <td colSpan={6} style={{ padding: "12px 16px 6px", background: "#F9FAFB", borderBottom: "1px solid #E4E7EC", borderTop: i > 0 ? "2px solid #E4E7EC" : "none" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".08em" }}>{sectionLabel}</span>
                      </td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: "1px solid #E4E7EC", background: f.enabled ? "#fff" : "#FAFAFA", opacity: f.enabled ? 1 : 0.65 }}
                    onMouseEnter={e => (e.currentTarget.style.background = f.enabled ? "#F9FAFB" : "#F5F5F5")}
                    onMouseLeave={e => (e.currentTarget.style.background = f.enabled ? "#fff" : "#FAFAFA")}
                  >
                    <td style={{ padding: "11px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#101828" }}>{f.label}</span>
                        {f.custom && <span style={{ background: "#EFF8FF", color: "#175CD3", borderRadius: 2, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>CUSTOM</span>}
                        {f.required && f.enabled && <span style={{ background: "#FEF3F2", color: "#B42318", borderRadius: 2, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>REQ</span>}
                      </div>
                      <div style={{ fontSize: 11.5, color: "#98A2B3" }}>{f.description || <span style={{ fontStyle: "italic" }}>key: {f.key}</span>}</div>
                    </td>
                    <td style={{ padding: "11px 16px" }}><TypeBadge type={f.type} /></td>
                    <td style={{ padding: "11px 16px" }}><Toggle on={f.required} onChange={v => toggleField(f.key, "required", v)} /></td>
                    <td style={{ padding: "11px 16px" }}><Toggle on={f.enabled} onChange={v => toggleField(f.key, "enabled", v)} /></td>
                    <td style={{ padding: "11px 16px", fontSize: 11.5, color: f.enabled ? "#027A48" : "#98A2B3", fontWeight: 500 }}>
                      {f.enabled ? "Active" : "Disabled"}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      {f.custom && <button onClick={() => removeCustomField(f.key)} style={btnDanger}>✕</button>}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* Save bar */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid #E4E7EC", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, color: "#667085" }}>Changes apply to all new document extractions. Existing extracted data is not affected.</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {saved && <span style={{ fontSize: 12.5, color: "#027A48", fontWeight: 500 }}>✓ Settings saved</span>}
            <button style={btnPri} onClick={save}>Save settings</button>
          </div>
        </div>
      </div>
    </div>
  );
}
