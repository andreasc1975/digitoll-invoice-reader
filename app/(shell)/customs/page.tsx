"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";

interface CustomsRecord {
  id: string;
  reference: string;
  consignor: string;
  consignee: string;
  border_crossing: string;
  status: "draft" | "submitted" | "cleared" | "rejected";
  digitoll_id: string | null;
  created_at: string;
  // SAD fields
  sad_exp_name?: string; sad_exp_address?: string; sad_exp_country?: string; sad_exp_org_no?: string;
  sad_imp_name?: string; sad_imp_address?: string; sad_imp_org_no?: string; sad_imp_vat_no?: string;
  sad_declarant_name?: string; sad_declarant_org_no?: string;
  sad_declaration_ref?: string; sad_invoice_number?: string; sad_invoice_date?: string; sad_prev_document?: string;
  sad_incoterm?: string; sad_incoterm_place?: string; sad_transport_mode_border?: string;
  sad_transport_ref_border?: string; sad_border_crossing?: string; sad_country_dispatch?: string; sad_country_destination?: string;
  sad_goods_description?: string; sad_hs_code?: string; sad_country_origin?: string;
  sad_gross_weight?: string; sad_net_weight?: string; sad_packages?: string;
  sad_invoice_value?: string; sad_currency?: string; sad_exchange_rate?: string; sad_statistical_value?: string;
  sad_customs_duty_rate?: string; sad_customs_duty_amount?: string; sad_vat_basis?: string;
}

const BORDER_CROSSINGS = ["Svinesund", "Ørje", "Magnor", "Riksåsen", "Bjørnefjell", "Storlien", "Treriksrøysa"];
const STATUS_CONFIG = {
  draft:     { label: "Draft",     bg: "#F2F4F7", color: "#667085", dot: "#98A2B3" },
  submitted: { label: "Submitted", bg: "#EFF8FF", color: "#175CD3", dot: "#2E90FA" },
  cleared:   { label: "Cleared",   bg: "#ECFDF3", color: "#027A48", dot: "#12B76A" },
  rejected:  { label: "Rejected",  bg: "#FEF3F2", color: "#B42318", dot: "#F04438" },
};

const SAD_SECTIONS = [
  { key: "A", label: "A — Parties (SAD fields 2, 8, 14)", fields: [
    { key: "sad_exp_name",         label: "Exporter name",          box: "2"  },
    { key: "sad_exp_address",      label: "Exporter address",        box: "2"  },
    { key: "sad_exp_country",      label: "Exporter country",        box: "2"  },
    { key: "sad_exp_org_no",       label: "Exporter org. no.",       box: "2"  },
    { key: "sad_imp_name",         label: "Importer name",           box: "8"  },
    { key: "sad_imp_address",      label: "Importer address",        box: "8"  },
    { key: "sad_imp_org_no",       label: "Importer org. no.",       box: "8"  },
    { key: "sad_imp_vat_no",       label: "Importer VAT no.",        box: "8"  },
    { key: "sad_declarant_name",   label: "Declarant / agent name",  box: "14" },
    { key: "sad_declarant_org_no", label: "Declarant org. no.",      box: "14" },
  ]},
  { key: "B", label: "B — References & Documents (SAD fields 7, 40, 44)", fields: [
    { key: "sad_declaration_ref",  label: "Declaration reference",   box: "7"  },
    { key: "sad_invoice_number",   label: "Invoice number",          box: "44" },
    { key: "sad_invoice_date",     label: "Invoice date",            box: "44" },
    { key: "sad_prev_document",    label: "Previous document",       box: "40" },
  ]},
  { key: "C", label: "C — Transport & Routing (SAD fields 15, 17, 20, 21, 25, 29)", fields: [
    { key: "sad_incoterm",              label: "Incoterm",                   box: "20" },
    { key: "sad_incoterm_place",        label: "Incoterm place",             box: "20" },
    { key: "sad_transport_mode_border", label: "Transport mode at border",   box: "21" },
    { key: "sad_transport_ref_border",  label: "Transport reference",        box: "21" },
    { key: "sad_border_crossing",       label: "Border crossing",            box: "29" },
    { key: "sad_country_dispatch",      label: "Country of dispatch",        box: "15" },
    { key: "sad_country_destination",   label: "Country of destination",     box: "17" },
  ]},
  { key: "D", label: "D — Goods (SAD fields 31, 33, 34, 35, 38, 41)", fields: [
    { key: "sad_goods_description", label: "Goods description",      box: "31" },
    { key: "sad_hs_code",           label: "HS / commodity code",    box: "33" },
    { key: "sad_country_origin",    label: "Country of origin",      box: "34" },
    { key: "sad_gross_weight",      label: "Gross weight (kg)",      box: "35" },
    { key: "sad_net_weight",        label: "Net weight (kg)",        box: "38" },
    { key: "sad_packages",          label: "Number of packages",     box: "31" },
  ]},
  { key: "E", label: "E — Value & Duties (SAD fields 22, 23, 46, 47)", fields: [
    { key: "sad_invoice_value",      label: "Invoice value",           box: "22" },
    { key: "sad_currency",           label: "Currency",                box: "22" },
    { key: "sad_exchange_rate",      label: "Exchange rate",           box: "23" },
    { key: "sad_statistical_value",  label: "Statistical value (NOK)", box: "46" },
    { key: "sad_customs_duty_rate",  label: "Customs duty rate (%)",   box: "47" },
    { key: "sad_customs_duty_amount",label: "Customs duty amount",     box: "47" },
    { key: "sad_vat_basis",          label: "VAT basis (NOK)",         box: "47" },
  ]},
];

const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #D0D5DD", borderRadius: 2, fontSize: 12.5, color: "#101828", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const };
const fBtn = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 14px", height: 36, boxSizing: "border-box" as const, borderRadius: 2, border: "1px solid transparent", background: active ? "#003160" : "#D9DBE0", color: active ? "#fff" : "#003160", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const });

type BasicForm = { reference: string; consignor: string; consignee: string; border_crossing: string; status: CustomsRecord["status"] };
const emptyForm: BasicForm = { reference: "", consignor: "", consignee: "", border_crossing: "", status: "draft" };

function FL({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#344054", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>{children}{required && <span style={{ color: "#D92D20" }}> *</span>}</label>;
}

// ── SAD Preview component ─────────────────────────────────────────────────────
function SADPreview({ record }: { record: CustomsRecord }) {
  const v = (k: keyof CustomsRecord) => (record[k] as string) || "";
  const navy  = "#1a1a2e";
  const mid   = "#999";
  const light = "#f8f8f8";

  const cell = (content: React.ReactNode, style?: React.CSSProperties) => (
    <div style={{ border: `1px solid ${mid}`, padding: "5px 7px", ...style }}>{content}</div>
  );
  const lbl = (text: string) => <div style={{ fontSize: 7.5, fontWeight: 700, color: "#444", marginBottom: 3 }}>{text}</div>;
  const val = (text: string) => <div style={{ fontSize: 9.5, color: "#101828", lineHeight: 1.4, minHeight: 13 }}>{text || <span style={{ color: "#ccc" }}>—</span>}</div>;

  return (
    <div id="sad-preview-content" style={{ fontFamily: "Arial, sans-serif", background: "#fff", padding: "12mm 14mm", width: 760, margin: "0 auto", fontSize: 9 }}>
      <style>{`
        @media print {
          body { margin: 0; background: #fff; }
          #sad-preview-content { padding: 8mm !important; width: 100% !important; }
        }
        .rd-section-label { font-size: 8px; font-weight: 700; background: ${navy}; color: #fff; padding: 3px 8px; margin-bottom: 0; display: inline-block; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, borderBottom: `2px solid ${navy}`, paddingBottom: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: navy, letterSpacing: ".04em" }}>CUSTOMS VALUE DECLARATION</div>
          <div style={{ fontSize: 8, color: "#667085", marginTop: 2 }}>Norwegian Customs (Tolletaten) · RD-0006E · TVINN Import</div>
        </div>
        <div style={{ textAlign: "right" as const }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: navy }}>{v("reference")}</div>
          <div style={{ fontSize: 8, color: "#667085" }}>Status: <strong>{record.status.toUpperCase()}</strong></div>
          {record.digitoll_id && <div style={{ fontSize: 8, color: "#027A48" }}>Digitoll ID: {record.digitoll_id}</div>}
          <div style={{ fontSize: 7.5, color: "#98A2B3" }}>{new Date(record.created_at).toLocaleDateString("sv-SE")}</div>
        </div>
      </div>

      {/* ── Part A ── */}
      <div className="rd-section-label">Part A — Must always be completed</div>
      <div style={{ border: `1px solid ${mid}`, borderTop: "none" }}>
        {/* Row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ padding: "6px 8px", borderRight: `1px solid ${mid}`, minHeight: 70 }}>
            {lbl("1. Name and address of invoice issuer (seller)")}
            {val(v("sad_exp_name"))}
            <div style={{ fontSize: 8.5, color: "#555", lineHeight: 1.4 }}>{v("sad_exp_address")}</div>
            <div style={{ fontSize: 8.5, color: "#555" }}>{[v("sad_exp_country"), v("sad_exp_org_no")].filter(Boolean).join(" · ")}</div>
          </div>
          <div style={{ padding: "6px 8px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, height: "100%" }}>
              <div style={{ borderRight: `1px solid ${mid}`, padding: "4px 6px" }}>
                {lbl("4. Invoice no. and date")}
                {val(`${v("sad_invoice_number")}${v("sad_invoice_date") ? ` · ${v("sad_invoice_date")}` : ""}`)}
              </div>
              <div style={{ padding: "4px 6px" }}>
                {lbl("5. Invoiced currency and total amount")}
                {val(`${v("sad_currency")} ${v("sad_invoice_value")}`)}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: `1px solid ${mid}` }}>
          <div style={{ padding: "6px 8px", borderRight: `1px solid ${mid}`, minHeight: 70 }}>
            {lbl("2. Name and address of declared recipient (importer)")}
            {val(v("sad_imp_name"))}
            <div style={{ fontSize: 8.5, color: "#555", lineHeight: 1.4 }}>{v("sad_imp_address")}</div>
            <div style={{ fontSize: 8.5, color: "#555" }}>
              {v("sad_imp_org_no") ? `Org.no: ${v("sad_imp_org_no")}` : ""}
              {v("sad_imp_vat_no") ? ` · MVA: ${v("sad_imp_vat_no")}` : ""}
            </div>
          </div>
          <div style={{ padding: "6px 8px" }}>
            {lbl("6. Purchase agreement")}
            <div style={{ fontSize: 8.5, color: "#555", marginBottom: 6 }}>☐ Contract  ☐ Oral agreement  ☐ Telex  ☐ Letter  ☐ Other</div>
            {lbl("7. Order confirmation")}
            <div style={{ fontSize: 8.5, color: "#555" }}>☐ Letter  ☐ Telex  ☐ Other</div>
          </div>
        </div>

        {/* Row 3 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: `1px solid ${mid}` }}>
          <div style={{ padding: "6px 8px", borderRight: `1px solid ${mid}`, minHeight: 60 }}>
            {lbl("3. Number of packages and types of goods")}
            {val(`${v("sad_packages")} · ${v("sad_goods_description")}`)}
            <div style={{ fontSize: 8.5, color: "#555" }}>HS: {v("sad_hs_code")} · Origin: {v("sad_country_origin")}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ padding: "6px 8px", borderRight: `1px solid ${mid}` }}>
              {lbl("8. Total amount paid")}
              {val(`${v("sad_currency")} ${v("sad_invoice_value")}`)}
            </div>
            <div style={{ padding: "6px 8px" }}>
              {lbl("9. Goods code")}
              {val(v("sad_hs_code"))}
              {lbl("10. Transport reference")}
              {val(v("sad_transport_ref_border"))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Part B ── */}
      <div className="rd-section-label" style={{ marginTop: 10 }}>Part B — Dependencies between buyer and seller</div>
      <div style={{ border: `1px solid ${mid}`, borderTop: "none", padding: "6px 8px", minHeight: 36 }}>
        {lbl("11. What dependencies exist between the buyer and seller:")}
        <div style={{ fontSize: 8.5, color: "#aaa", fontStyle: "italic" }}>N/A — no dependencies declared</div>
      </div>

      {/* ── Part C ── */}
      <div className="rd-section-label" style={{ marginTop: 10 }}>Part C — Special conditions (codes 2, 3 or 9 in box 24)</div>
      <div style={{ border: `1px solid ${mid}`, borderTop: "none" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${mid}` }}>
          <div style={{ padding: "6px 8px", borderRight: `1px solid ${mid}`, minHeight: 36 }}>
            {lbl("12. Restrictions in terms of right of disposal or use of goods:")}
            <div style={{ fontSize: 8.5, color: "#555" }}>☐ Yes  ☒ No</div>
          </div>
          <div style={{ padding: "6px 8px", minHeight: 36 }}>
            {lbl("14. Proceeds from buyer's onward sale accruing to seller:")}
            <div style={{ fontSize: 8.5, color: "#555" }}>☐ Yes  ☒ No</div>
          </div>
        </div>
        <div style={{ padding: "6px 8px", minHeight: 36 }}>
          {lbl("13. Special agreements in relation to the sale and price:")}
          <div style={{ fontSize: 8.5, color: "#aaa", fontStyle: "italic" }}>None</div>
        </div>
      </div>

      {/* ── Part D ── */}
      <div className="rd-section-label" style={{ marginTop: 10 }}>Part D — Must always be completed</div>
      <div style={{ border: `1px solid ${mid}`, borderTop: "none" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {/* Left — Calculation */}
          <div style={{ borderRight: `1px solid ${mid}`, padding: "6px 8px" }}>
            {lbl("15. Calculation of customs value")}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 8.5, marginTop: 4 }}>
              <thead>
                <tr style={{ background: light }}>
                  <th style={{ textAlign: "left" as const, padding: "3px 4px", borderBottom: `1px solid ${mid}` }}>Specification</th>
                  <th style={{ textAlign: "right" as const, padding: "3px 4px", borderBottom: `1px solid ${mid}` }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Invoice value", `${v("sad_currency")} ${v("sad_invoice_value")}`],
                  ["Incoterm", `${v("sad_incoterm")} ${v("sad_incoterm_place")}`],
                  ["Transport mode", `${v("sad_transport_mode_border")} via ${v("sad_border_crossing")}`],
                  ["Exchange rate", v("sad_exchange_rate") ? `1 ${v("sad_currency")} = NOK ${v("sad_exchange_rate")}` : "—"],
                  ["Statistical value (NOK)", v("sad_statistical_value") ? `NOK ${v("sad_statistical_value")}` : "—"],
                  ["Customs duty rate", v("sad_customs_duty_rate") || "0%"],
                  ["Customs duty (NOK)", v("sad_customs_duty_amount") || "NOK 0.00"],
                  ["VAT basis (NOK)", v("sad_vat_basis") || "—"],
                ].map(([spec, amt], i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : light }}>
                    <td style={{ padding: "3px 4px", color: "#555" }}>{spec}</td>
                    <td style={{ padding: "3px 4px", textAlign: "right" as const, fontWeight: amt && amt !== "—" ? 600 : 400, color: amt === "—" ? "#ccc" : "#101828" }}>{amt}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#EFF8FF" }}>
                  <td style={{ padding: "4px", fontWeight: 700, color: navy, fontSize: 9, borderTop: `1px solid ${mid}` }}>Declared customs value</td>
                  <td style={{ padding: "4px", textAlign: "right" as const, fontWeight: 700, color: navy, fontSize: 9, borderTop: `1px solid ${mid}` }}>
                    NOK {v("sad_statistical_value") || "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Right — Signature & official use */}
          <div style={{ padding: "6px 8px", display: "flex", flexDirection: "column" as const, gap: 10 }}>
            <div>
              {lbl("16. Declared recipient's signature (cf. Box 8 of the SAD)")}
              <div style={{ fontSize: 8, color: "#555", marginBottom: 16, lineHeight: 1.4 }}>
                I hereby declare that the information provided is correct and complete.
              </div>
              <div style={{ borderBottom: `1px solid ${mid}`, marginBottom: 3 }} />
              <div style={{ fontSize: 7.5, color: "#aaa" }}>Place, date, year</div>
              <div style={{ borderBottom: `1px solid ${mid}`, marginTop: 14, marginBottom: 3 }} />
              <div style={{ fontSize: 7.5, color: "#aaa" }}>Signature</div>
            </div>
            <div style={{ marginTop: "auto", borderTop: `1px solid ${mid}`, paddingTop: 6 }}>
              {lbl("17. The Norwegian Customs Service's notes")}
              <div style={{ minHeight: 36 }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Transport supplement ── */}
      <div style={{ marginTop: 10, background: light, border: `1px solid ${mid}`, padding: "6px 10px" }}>
        <div style={{ fontSize: 7.5, fontWeight: 700, color: navy, marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: ".05em" }}>Transport & routing supplement</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, fontSize: 8.5 }}>
          {[
            ["Dispatch country (15)", v("sad_country_dispatch")],
            ["Destination (17)", v("sad_country_destination")],
            ["Border crossing (29)", v("sad_border_crossing")],
            ["Prev. document (40)", v("sad_prev_document")],
            ["Declarant (14)", v("sad_declarant_name")],
            ["Declarant org.no", v("sad_declarant_org_no")],
            ["Gross weight (35)", v("sad_gross_weight") ? `${v("sad_gross_weight")} kg` : ""],
            ["Net weight (38)", v("sad_net_weight") ? `${v("sad_net_weight")} kg` : ""],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ color: "#888", fontSize: 7.5 }}>{label}</div>
              <div style={{ fontWeight: 600, color: value ? "#101828" : "#ccc" }}>{value || "—"}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 7.5, color: "#aaa", textAlign: "center" as const }}>
        RD-0006E · Generated by Maritech Digitoll · {new Date().toLocaleDateString("sv-SE")}
      </div>
    </div>
  );
}

export default function CustomsPage() {
  const [records, setRecords]         = useState<CustomsRecord[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState("all");
  const [search, setSearch]           = useState("");
  const [modal, setModal]             = useState<"new" | "edit" | "sad-edit" | "preview" | null>(null);
  const [activeRecord, setActiveRecord] = useState<CustomsRecord | null>(null);
  const [form, setForm]               = useState<BasicForm>(emptyForm);
  const [sadForm, setSadForm]         = useState<Partial<CustomsRecord>>({});
  const [saving, setSaving]           = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleCreate() { openNew(); }
    window.addEventListener("digitoll:open-create-menu", handleCreate);
    return () => window.removeEventListener("digitoll:open-create-menu", handleCreate);
  }, []);

  useEffect(() => {
    async function handleDelete() {
      if (selectedRows.size === 0) return;
      await Promise.all([...selectedRows].map(id => fetch(`/api/customs/${id}`, { method: "DELETE" })));
      setSelectedRows(new Set());
      load();
    }
    window.addEventListener("digitoll:delete-selected", handleDelete);
    return () => window.removeEventListener("digitoll:delete-selected", handleDelete);
  }, [selectedRows]);

  useEffect(() => {
    const btn = document.getElementById("topbar-delete-btn");
    if (btn) btn.style.opacity = selectedRows.size > 0 ? "1" : "0.5";
  }, [selectedRows]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/customs");
    if (res.ok) setRecords(await res.json());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = records.filter(r => {
    if (search && !JSON.stringify(r).toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "draft")     return r.status === "draft";
    if (filter === "submitted") return r.status === "submitted";
    if (filter === "cleared")   return r.status === "cleared";
    if (filter === "rejected")  return r.status === "rejected";
    if (filter === "digitoll")  return !!r.digitoll_id;
    return true;
  });

  const counts = {
    all: records.length,
    draft: records.filter(r => r.status === "draft").length,
    submitted: records.filter(r => r.status === "submitted").length,
    cleared: records.filter(r => r.status === "cleared").length,
    rejected: records.filter(r => r.status === "rejected").length,
    digitoll: records.filter(r => !!r.digitoll_id).length,
  };

  function openNew() { setForm(emptyForm); setActiveRecord(null); setModal("new"); }
  function openEdit(r: CustomsRecord) { setForm({ reference: r.reference, consignor: r.consignor, consignee: r.consignee, border_crossing: r.border_crossing, status: r.status }); setActiveRecord(r); setModal("edit"); }
  function openSADEdit(r: CustomsRecord) { setSadForm({ ...r }); setActiveRecord(r); setModal("sad-edit"); }
  function openPreview(r: CustomsRecord) { setActiveRecord(r); setModal("preview"); }
  function toggleRow(id: string) { setSelectedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  async function deleteSelected() {
    if (selectedRows.size === 0) return;
    await Promise.all([...selectedRows].map(id => fetch(`/api/customs/${id}`, { method: "DELETE" })));
    setSelectedRows(new Set()); load();
  }

  async function saveBasic() {
    if (!form.reference || !form.consignor || !form.consignee || !form.border_crossing) return;
    setSaving(true);
    if (modal === "new") {
      await fetch("/api/customs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else if (activeRecord) {
      await fetch(`/api/customs/${activeRecord.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    setSaving(false); setModal(null); load();
  }

  async function saveSAD() {
    if (!activeRecord) return;
    setSaving(true);
    await fetch(`/api/customs/${activeRecord.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sadForm) });
    setSaving(false); setModal(null); load();
  }

  function printSAD() {
    const content = document.getElementById("sad-preview-content");
    if (!content) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>SAD — ${activeRecord?.reference}</title>
    <style>body{margin:0;font-family:Arial,sans-serif;}@page{size:A4;margin:10mm;}</style></head>
    <body>${content.outerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  }

  const formValid = !!(form.reference && form.consignor && form.consignee && form.border_crossing);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Basic modal (new/edit) ──────────────────────────────────────────── */}
      {(modal === "new" || modal === "edit") && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 480, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>{modal === "new" ? "New Customs Record" : "Edit Record"}</div>
              <button onClick={() => setModal(null)} style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 16, color: "#667085", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div><FL required>Reference</FL><input style={inp} value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="CMS-000" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><FL required>Consignor</FL><input style={inp} value={form.consignor} onChange={e => setForm(f => ({ ...f, consignor: e.target.value }))} placeholder="Exporter AB" /></div>
                <div><FL required>Consignee</FL><input style={inp} value={form.consignee} onChange={e => setForm(f => ({ ...f, consignee: e.target.value }))} placeholder="Importer AS" /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><FL required>Border Crossing</FL>
                  <select style={inp} value={form.border_crossing} onChange={e => setForm(f => ({ ...f, border_crossing: e.target.value }))}>
                    <option value="">Select...</option>
                    {BORDER_CROSSINGS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div><FL>Status</FL>
                  <select style={inp} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as CustomsRecord["status"] }))}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setModal(null)} style={{ padding: "7px 16px", borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", color: "#344054" }}>Cancel</button>
              <button onClick={saveBasic} disabled={!formValid || saving} style={{ padding: "7px 16px", borderRadius: 2, border: "none", background: formValid ? "#446BF9" : "#D0D5DD", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: formValid ? "pointer" : "default", fontFamily: "inherit" }}>
                {saving ? "Saving…" : modal === "new" ? "Create" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SAD Edit modal ──────────────────────────────────────────────────── */}
      {modal === "sad-edit" && activeRecord && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 720, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>Edit SAD Declaration — {activeRecord.reference}</div>
                <div style={{ fontSize: 11.5, color: "#667085", marginTop: 2 }}>Full SAD field editor</div>
              </div>
              <button onClick={() => setModal(null)} style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 16, color: "#667085", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
              {SAD_SECTIONS.map(section => (
                <div key={section.key}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 10, paddingBottom: 6, borderBottom: "2px solid #E4E7EC" }}>
                    {section.label}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {section.fields.map(f => (
                      <div key={f.key}>
                        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#667085", marginBottom: 3, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>
                          Box {f.box} — {f.label}
                        </label>
                        <input
                          style={inp}
                          value={(sadForm[f.key as keyof CustomsRecord] as string) || ""}
                          onChange={e => setSadForm(p => ({ ...p, [f.key]: e.target.value }))}
                          placeholder={f.label}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "12px 22px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end", gap: 8, position: "sticky", bottom: 0, background: "#fff" }}>
              <button onClick={() => setModal(null)} style={{ padding: "7px 16px", borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", color: "#344054" }}>Cancel</button>
              <button onClick={saveSAD} disabled={saving} style={{ padding: "7px 16px", borderRadius: 2, border: "none", background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {saving ? "Saving…" : "Save SAD fields"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview modal ───────────────────────────────────────────────────── */}
      {modal === "preview" && activeRecord && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 820, maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>SAD Preview — {activeRecord.reference}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={printSAD} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 2, border: "1px solid #003160", background: "#fff", color: "#003160", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ fontFamily: "Material Icons", fontSize: 15, lineHeight: 1 }}>print</span>
                  Print / Download PDF
                </button>
                <button onClick={() => setModal(null)} style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 16, color: "#667085", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", background: "#F2F4F7", padding: 20 }} ref={printRef}>
              <SADPreview record={activeRecord} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        .customs-cb { opacity: 0; transition: opacity 0.1s; }
        .customs-cb.checked { opacity: 1 !important; }
        tr:hover .customs-cb { opacity: 1; }
      `}</style>

      {/* Filter bar */}
      <div style={{ padding: "14px 20px 0", background: "#fff", borderBottom: "1px solid #E4E7EC" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          {([["all","All",counts.all],["draft","Draft",counts.draft],["submitted","Submitted",counts.submitted],["cleared","Cleared",counts.cleared],["rejected","Rejected",counts.rejected],["digitoll","In Digitoll",counts.digitoll]] as [string,string,number][]).map(([key,label,count]) => (
            <button key={key} onClick={() => setFilter(key)} style={fBtn(filter === key)}>
              {label}<span style={{ background: filter === key ? "rgba(255,255,255,0.25)" : "#003160", color: "#fff", borderRadius: 2, padding: "1px 7px", fontSize: 10, fontWeight: 700, minWidth: 20, textAlign: "center" as const, lineHeight: "16px" }}>{count}</span>
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 2 }}>
            <button onClick={deleteSelected} disabled={selectedRows.size === 0} style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: selectedRows.size > 0 ? "pointer" : "default", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", opacity: selectedRows.size > 0 ? 1 : 0.4 }}>
              <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#003160", lineHeight: 1 }}>delete_forever</span>
            </button>
            <button title="Refresh" onClick={load} style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: "pointer", borderRadius: 2, color: "#003160", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>↺</button>
          </div>
        </div>
        <div style={{ height: 1, background: "#E4E7EC", margin: "0 -20px 10px" }} />
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff" }}>
            <span style={{ fontFamily: "Material Icons", fontSize: 18, color: "#98A2B3", lineHeight: 1 }}>search</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ border: "none", outline: "none", fontSize: 13, color: "#344054", fontFamily: "inherit", width: "100%", background: "transparent" }} />
            {search && <button onClick={() => setSearch("")} style={{ border: "none", background: "transparent", color: "#98A2B3", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>✕</button>}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: "#fff", borderBottom: "2px solid #E4E7EC" }}>
              <th style={{ width: 36, padding: "0 8px", textAlign: "center" as const, cursor: "pointer" }} onClick={() => selectedRows.size === filtered.length ? setSelectedRows(new Set()) : setSelectedRows(new Set(filtered.map(r => r.id)))}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${selectedRows.size > 0 ? "#446BF9" : "#D0D5DD"}`, background: selectedRows.size === filtered.length && filtered.length > 0 ? "#446BF9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                  {selectedRows.size === filtered.length && filtered.length > 0 && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                  {selectedRows.size > 0 && selectedRows.size < filtered.length && <span style={{ width: 6, height: 2, background: "#446BF9", display: "block", borderRadius: 1 }} />}
                </div>
              </th>
              {["Reference", "Consignor", "Consignee", "Border Crossing", "Status", "Digitoll ID", "Created", ""].map((h, i) => (
                <th key={i} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#003160", letterSpacing: ".04em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(record => {
              const sc = STATUS_CONFIG[record.status];
              return (
                <tr key={record.id} style={{ borderBottom: "1px solid #E4E7EC", background: selectedRows.has(record.id) ? "#EDF0F3" : "transparent" }}
                  onMouseEnter={e => { if (!selectedRows.has(record.id)) e.currentTarget.style.background = "#F9FAFB"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = selectedRows.has(record.id) ? "#EDF0F3" : "transparent"; }}>
                  <td style={{ padding: "0 8px", width: 36, textAlign: "center" as const }} onClick={() => toggleRow(record.id)}>
                    <div className={`customs-cb${selectedRows.has(record.id) ? " checked" : ""}`} style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${selectedRows.has(record.id) ? "#446BF9" : "#D0D5DD"}`, background: selectedRows.has(record.id) ? "#446BF9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                      {selectedRows.has(record.id) && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                    </div>
                  </td>
                  <td style={{ padding: "9px 12px", fontWeight: 600, color: "#175CD3" }}>{record.reference}</td>
                  <td style={{ padding: "9px 12px", color: "#344054" }}>{record.consignor}</td>
                  <td style={{ padding: "9px 12px", color: "#344054" }}>{record.consignee}</td>
                  <td style={{ padding: "9px 12px", color: "#667085" }}>{record.border_crossing}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 2, fontSize: 11.5, fontWeight: 500, background: sc.bg, color: sc.color }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: sc.dot }} />{sc.label}
                    </span>
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    {record.digitoll_id
                      ? <span style={{ fontSize: 11.5, fontWeight: 600, color: "#027A48" }}>{record.digitoll_id}</span>
                      : <span style={{ color: "#D0D5DD", fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: "9px 12px", color: "#98A2B3", fontSize: 12 }}>{new Date(record.created_at).toLocaleDateString("sv-SE")}</td>
                  <td style={{ padding: "9px 8px" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => openPreview(record)} title="Preview SAD document"
                        style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#667085" }}
                        onMouseEnter={e => { (e.currentTarget.style.borderColor = "#446BF9"); (e.currentTarget.style.color = "#446BF9"); }}
                        onMouseLeave={e => { (e.currentTarget.style.borderColor = "#E4E7EC"); (e.currentTarget.style.color = "#667085"); }}>
                        <span style={{ fontFamily: "Material Icons", fontSize: 15, lineHeight: 1 }}>visibility</span>
                      </button>
                      <button onClick={() => openSADEdit(record)} title="Edit SAD fields"
                        style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#667085" }}
                        onMouseEnter={e => { (e.currentTarget.style.borderColor = "#446BF9"); (e.currentTarget.style.color = "#446BF9"); }}
                        onMouseLeave={e => { (e.currentTarget.style.borderColor = "#E4E7EC"); (e.currentTarget.style.color = "#667085"); }}>
                        <span style={{ fontFamily: "Material Icons", fontSize: 15, lineHeight: 1 }}>edit</span>
                      </button>
                      <button onClick={() => openEdit(record)} title="Edit basic info"
                        style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#667085" }}
                        onMouseEnter={e => { (e.currentTarget.style.borderColor = "#446BF9"); (e.currentTarget.style.color = "#446BF9"); }}
                        onMouseLeave={e => { (e.currentTarget.style.borderColor = "#E4E7EC"); (e.currentTarget.style.color = "#667085"); }}>
                        <span style={{ fontFamily: "Material Icons", fontSize: 15, lineHeight: 1 }}>settings</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {loading && <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "#98A2B3" }}>Loading...</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 60, textAlign: "center", color: "#98A2B3" }}>
                <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500, color: "#667085" }}>No customs records</div>
                <button onClick={openNew} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 2, background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ fontFamily: "Material Icons", fontSize: 16, lineHeight: 1 }}>add</span>New record
                </button>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
