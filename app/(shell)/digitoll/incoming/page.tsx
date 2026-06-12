"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import ItemsTable from "@/components/ItemsTable";

// ── Types ─────────────────────────────────────────────────────────────────────
interface InvoiceField { field_key: string; field_value: string | null; confidence: string | null; source: string; }
interface Invoice {
  id: string; file_name: string; file_size: number; status: string;
  completion_pct: number; created_at: string; transport_id: string | null;
  shipment_id: string | null; source: string | null; session_id: string | null;
  file_path: string | null;
  invoice_fields: InvoiceField[];
}
interface Transport { id: string; reference: string; status: string; }
type ViewMode = "table" | "split";
type Destination = "digitoll" | "sad" | "cms" | null;
type CreateType = "transport" | "shipment" | null;

// Conflict resolver types
interface FieldConflict {
  fieldKey: string;
  label: string;
  values: { value: string; source: string; confidence: string | null; docName: string; docIdx: number }[];
}
interface ConflictResolution { [fieldKey: string]: number; } // index into values array

// ── Field definitions ─────────────────────────────────────────────────────────
const DIGITOLL_FIELDS = [
  { key: "exp_name",          label: "Exporter name",       required: true,  section: "EXPORTER" },
  { key: "exp_address",       label: "Exporter address",    required: true,  section: "EXPORTER" },
  { key: "imp_name",          label: "Importer name",       required: true,  section: "IMPORTER" },
  { key: "imp_address",       label: "Importer address",    required: true,  section: "IMPORTER" },
  { key: "imp_id",            label: "EORI / VAT Number",   required: false, section: "IMPORTER" },
  { key: "totalValue",        label: "Total value",         required: true,  section: "GOODS" },
  { key: "currency",          label: "Currency",            required: true,  section: "GOODS" },
  { key: "totalNetWeight",    label: "Net weight (kg)",     required: true,  section: "GOODS" },
  { key: "totalGrossWeight",  label: "Gross weight (kg)",   required: true,  section: "GOODS" },
  { key: "hsCode",            label: "HS Code",             required: false, section: "GOODS" },
  { key: "originCountry",     label: "Country of Origin",   required: false, section: "GOODS" },
  { key: "destinationCountry",label: "Destination Country", required: true,  section: "CUSTOMS" },
  { key: "customsValue",      label: "Customs Value",       required: true,  section: "CUSTOMS" },
  { key: "procedureCode",     label: "Procedure Code",      required: false, section: "CUSTOMS" },
  { key: "modeOfTransport",   label: "Mode of Transport",   required: true,  section: "TRANSPORT" },
  { key: "incoterm",          label: "Incoterm",            required: true,  section: "TRANSPORT" },
  { key: "incotermPlace",     label: "Place",               required: true,  section: "TRANSPORT" },
  { key: "transportRef",      label: "Transport Reference", required: false, section: "TRANSPORT" },
];

const SAD_FIELDS = [
  // A — Parties
  { key: "sad_exp_name",           label: "Exporter name",              required: true,  section: "A — PARTIES",    placeholder: "Legal name of exporting company" },
  { key: "sad_exp_address",        label: "Exporter address",           required: true,  section: "A — PARTIES",    placeholder: "Full street address" },
  { key: "sad_exp_country",        label: "Exporter country",           required: true,  section: "A — PARTIES",    placeholder: "e.g. SE" },
  { key: "sad_exp_org_no",         label: "Exporter org. no.",          required: false, section: "A — PARTIES",    placeholder: "Organisation/VAT number" },
  { key: "sad_imp_name",           label: "Importer name",              required: true,  section: "A — PARTIES",    placeholder: "Legal name of importing company" },
  { key: "sad_imp_address",        label: "Importer address",           required: true,  section: "A — PARTIES",    placeholder: "Full street address in Norway" },
  { key: "sad_imp_org_no",         label: "Importer org. no.",          required: true,  section: "A — PARTIES",    placeholder: "Norwegian organisation number (9 digits)" },
  { key: "sad_imp_vat_no",         label: "Importer VAT no.",           required: true,  section: "A — PARTIES",    placeholder: "MVA + 9 digits" },
  { key: "sad_declarant_name",     label: "Declarant / agent name",     required: false, section: "A — PARTIES",    placeholder: "Customs agent name" },
  { key: "sad_declarant_org_no",   label: "Declarant org. no.",         required: false, section: "A — PARTIES",    placeholder: "Customs agent org. number" },
  // B — References
  { key: "sad_declaration_ref",    label: "Declaration reference",      required: false, section: "B — REFERENCES", placeholder: "Declarant's own reference" },
  { key: "sad_invoice_number",     label: "Invoice number",             required: true,  section: "B — REFERENCES", placeholder: "Seller's invoice reference" },
  { key: "sad_invoice_date",       label: "Invoice date",               required: true,  section: "B — REFERENCES", placeholder: "e.g. 2026-06-10" },
  { key: "sad_prev_document",      label: "Previous document",          required: false, section: "B — REFERENCES", placeholder: "Transit MRN or preceding document" },
  // C — Transport
  { key: "sad_incoterm",           label: "Incoterm",                   required: true,  section: "C — TRANSPORT",  placeholder: "e.g. DAP, FOB, CIF" },
  { key: "sad_incoterm_place",     label: "Incoterm place",             required: true,  section: "C — TRANSPORT",  placeholder: "Named place" },
  { key: "sad_transport_mode_border", label: "Transport mode at border",required: true,  section: "C — TRANSPORT",  placeholder: "Road / Sea / Air / Rail" },
  { key: "sad_transport_ref_border",  label: "Transport reference",     required: true,  section: "C — TRANSPORT",  placeholder: "Vehicle reg., IMO, flight no." },
  { key: "sad_border_crossing",    label: "Border crossing",            required: true,  section: "C — TRANSPORT",  placeholder: "e.g. Svinesund" },
  { key: "sad_country_dispatch",   label: "Country of dispatch",        required: true,  section: "C — TRANSPORT",  placeholder: "e.g. SE" },
  { key: "sad_country_destination",label: "Country of destination",     required: true,  section: "C — TRANSPORT",  placeholder: "e.g. NO" },
  // D — Goods
  { key: "sad_goods_description",  label: "Goods description",          required: true,  section: "D — GOODS",      placeholder: "Plain text description" },
  { key: "sad_hs_code",            label: "HS / commodity code",        required: true,  section: "D — GOODS",      placeholder: "Min. 6 digits" },
  { key: "sad_country_origin",     label: "Country of origin",          required: true,  section: "D — GOODS",      placeholder: "e.g. DE" },
  { key: "sad_gross_weight",       label: "Gross weight (kg)",          required: true,  section: "D — GOODS",      placeholder: "Total incl. packaging" },
  { key: "sad_net_weight",         label: "Net weight (kg)",            required: true,  section: "D — GOODS",      placeholder: "Excl. packaging" },
  { key: "sad_packages",           label: "Number of packages",         required: true,  section: "D — GOODS",      placeholder: "Total colli" },
  // E — Value & Duties
  { key: "sad_invoice_value",      label: "Invoice value",              required: true,  section: "E — VALUE",      placeholder: "Total invoice value" },
  { key: "sad_currency",           label: "Currency",                   required: true,  section: "E — VALUE",      placeholder: "ISO 4217 e.g. EUR" },
  { key: "sad_exchange_rate",      label: "Exchange rate",              required: false, section: "E — VALUE",      placeholder: "To NOK" },
  { key: "sad_statistical_value",  label: "Statistical value (NOK)",    required: true,  section: "E — VALUE",      placeholder: "Basis for VAT" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtSize(b: number) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return Math.round(b / 1024) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}
function barColor(pct: number) {
  if (pct >= 100) return "#12B76A";
  if (pct >= 60)  return "#F79009";
  return "#F04438";
}
function calcCompletion(fields: typeof DIGITOLL_FIELDS, local: Record<string, { value: string }>) {
  const required = fields.filter(f => f.required);
  const filled   = required.filter(f => (local[f.key]?.value ?? "").trim() !== "");
  return { filled: filled.length, total: required.length, pct: required.length ? Math.round(filled.length / required.length * 100) : 0 };
}
function docStatus(inv: Invoice) {
  if (inv.transport_id || inv.shipment_id) return { label: "Processed", color: "#027A48", bg: "#ECFDF3", tip: "Linked to a transport or shipment" };
  if (inv.completion_pct >= 60)            return { label: "Ready",     color: "#B54708", bg: "#FFFAEB", tip: "Data extracted — ready to use" };
  return { label: "Needs review", color: "#B42318", bg: "#FEF3F2", tip: "Extraction incomplete — review required" };
}

const SOURCE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  ehf:      { label: "EHF/PEPPOL", icon: "⚡", color: "#027A48", bg: "#ECFDF3" },
  edi:      { label: "EDI",        icon: "🔗", color: "#175CD3", bg: "#EFF8FF" },
  sftp:     { label: "SFTP",       icon: "📡", color: "#6941C6", bg: "#F9F5FF" },
  api:      { label: "API",        icon: "🔌", color: "#C11574", bg: "#FDF2FA" },
  email:    { label: "Email",      icon: "📧", color: "#B54708", bg: "#FFFAEB" },
  portal:   { label: "Portal",     icon: "🌐", color: "#344054", bg: "#F2F4F7" },
  scan_ocr: { label: "Scan/OCR",   icon: "🖨️",  color: "#667085", bg: "#F2F4F7" },
  upload:   { label: "Upload",     icon: "↑",   color: "#344054", bg: "#F2F4F7" },
};
function SourceBadge({ source }: { source: string | null }) {
  const cfg = SOURCE_CONFIG[source ?? "upload"] ?? SOURCE_CONFIG.upload;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 2, fontSize: 11, fontWeight: 500, background: cfg.bg, color: cfg.color, whiteSpace: "nowrap" as const }}>{cfg.icon} {cfg.label}</span>;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const btnPri: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 2, background: "#003160", color: "#fff", fontSize: 12.5, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit" };
const btnSec: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 2, background: "#fff", color: "#344054", fontSize: 12.5, fontWeight: 500, border: "1px solid #D0D5DD", cursor: "pointer", fontFamily: "inherit" };
const fBtn = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 14px", height: 36, boxSizing: "border-box" as const, borderRadius: 2, border: "1px solid transparent", background: active ? "#003160" : "#D9DBE0", color: active ? "#fff" : "#003160", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const });
const inp: React.CSSProperties = { width: "100%", padding: "7px 10px", border: "1px solid #D0D5DD", borderRadius: 2, fontSize: 12.5, color: "#101828", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const };

// ── Main Page ─────────────────────────────────────────────────────────────────
// ── Document names cell med tooltip ──────────────────────────────────────────
function DocumentNames({ names }: { names: string[] }) {
  const [hover, setHover] = React.useState(false);
  const MAX = 2;
  const visible = names.slice(0, MAX);
  const hidden  = names.slice(MAX);
  const isPdf = (n: string) => n.endsWith(".pdf") || n.endsWith(".doc") || n.endsWith(".docx");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const }}>
      {visible.map((name, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#344054", fontSize: 12.5, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
          <span style={{ fontFamily: "Material Symbols Rounded", fontSize: 16, lineHeight: 1, userSelect: "none" as const, fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24", color: isPdf(name) ? "#D0021B" : "#003160", flexShrink: 0 }}>
            {isPdf(name) ? "docs" : "code_blocks"}
          </span>
          {name}
        </span>
      ))}
      {hidden.length > 0 && (
        <div style={{ position: "relative" as const, display: "inline-block" }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "1px 7px", borderRadius: 2, background: "#EFF8FF", color: "#175CD3", fontSize: 11, fontWeight: 700, cursor: "default" }}>
            +{hidden.length}
          </span>
          {hover && (
            <div style={{ position: "absolute" as const, left: 0, top: "calc(100% + 4px)", background: "#101828", color: "#fff", borderRadius: 2, padding: "8px 12px", zIndex: 50, minWidth: 180, boxShadow: "0 4px 16px rgba(0,0,0,0.18)" }}>
              {hidden.map((name, i) => (
                <div key={i} style={{ fontSize: 11.5, marginBottom: i < hidden.length - 1 ? 4 : 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: "Material Symbols Rounded", fontSize: 14, lineHeight: 1, fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24", color: isPdf(name) ? "#FDA29B" : "#84ADFF" }}>
                    {isPdf(name) ? "docs" : "code_blocks"}
                  </span>
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Mapping: extracted field keys → SAD field keys ───────────────────────────
const TO_SAD: Record<string, string> = {
  exp_name:           "sad_exp_name",
  exp_address:        "sad_exp_address",
  exp_country:        "sad_exp_country",
  exp_org_no:         "sad_exp_org_no",
  imp_name:           "sad_imp_name",
  imp_address:        "sad_imp_address",
  imp_org_no:         "sad_imp_org_no",
  imp_id:             "sad_imp_org_no",
  imp_vat_no:         "sad_imp_vat_no",
  totalValue:         "sad_invoice_value",
  currency:           "sad_currency",
  customsValue:       "sad_statistical_value",
  incoterm:           "sad_incoterm",
  incotermPlace:      "sad_incoterm_place",
  destinationCountry: "sad_country_destination",
  modeOfTransport:    "sad_transport_mode_border",
  transportRef:       "sad_transport_ref_border",
  borderCrossing:     "sad_border_crossing",
  hsCode:             "sad_hs_code",
  originCountry:      "sad_country_origin",
  countryOfOrigin:    "sad_country_origin",
  totalGrossWeight:   "sad_gross_weight",
  totalNetWeight:     "sad_net_weight",
  numberOfPackages:   "sad_packages",
  invoiceDate:        "sad_invoice_date",
  invoiceNumber:      "sad_invoice_number",
  exchangeRate:       "sad_exchange_rate",
};

function fieldsToLocalMap(fields: { field_key: string; field_value: string | null; confidence: string | null; source: string }[]) {
  const map: Record<string, { value: string; source: string; confidence: string | null }> = {};
  for (const f of fields) {
    if (!f.field_value) continue;
    const val = { value: f.field_value, source: f.source, confidence: f.confidence };
    map[f.field_key] = val;
    const sadKey = TO_SAD[f.field_key];
    if (sadKey) map[sadKey] = val;
  }
  return map;
}

export default function IncomingDocuments() {
  const router = useRouter();

  const [invoices, setInvoices]         = useState<Invoice[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu]   = useState<{ x: number; y: number; rowId: string } | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [savingLater, setSavingLater]   = useState(false);
  const [transports, setTransports]     = useState<Transport[]>([]);
  const [filter, setFilter]             = useState("all");
  const [search, setSearch]             = useState("");
  const [view, setView]                 = useState<ViewMode>("table");
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [processing, setProcessing]     = useState(false);
  const [progress, setProgress]         = useState(0);
  const [fileUrl, setFileUrl]           = useState<string | null>(null);
  const [fileType, setFileType]         = useState<string>("application/pdf");
  const [destination, setDestination]   = useState<Destination>(null);
  const [formMode, setFormMode]         = useState<"digitoll" | "sad">("digitoll");
  const [createType, setCreateType]     = useState<CreateType>(null);
  const [linkTransportId, setLinkTransportId] = useState("");
  const [saving, setSaving]             = useState(false);
  const [showCmsAnim, setShowCmsAnim]   = useState(false);
  const [cmsStep, setCmsStep]           = useState(0);

  // Multi-file state
  const [uploadedFiles, setUploadedFiles] = useState<{ file: File; url: string; type: string; invoiceId: string | null; name: string }[]>([]);
  const [activeFileIdx, setActiveFileIdx] = useState(0);

  // Conflict resolver state
  const [conflicts, setConflicts]               = useState<FieldConflict[]>([]);
  const [resolutions, setResolutions]           = useState<ConflictResolution>({});
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictIdx, setConflictIdx]           = useState(0);

  // Editable fields state
  const [localFields, setLocalFields]   = useState<Record<string, { value: string; source: string; confidence: string | null }>>({});
  const [initialFields, setInitialFields] = useState<Record<string, string>>({});

  // Lyssna på topbar + för filuppladdning
  useEffect(() => {
    function handleTopbarCreate() { fileInput.current?.click(); }
    window.addEventListener("digitoll:open-create-menu", handleTopbarCreate);
    return () => window.removeEventListener("digitoll:open-create-menu", handleTopbarCreate);
  }, []);

  // Lyssna på topbar delete
  useEffect(() => {
    async function handleTopbarDelete() { await deleteSelectedRows(); }
    window.addEventListener("digitoll:delete-selected", handleTopbarDelete);
    return () => window.removeEventListener("digitoll:delete-selected", handleTopbarDelete);
  }, [selectedRows, invoices]);

  // Uppdatera topbar trash-ikon baserat på selection
  useEffect(() => {
    const btn = document.getElementById("topbar-delete-btn");
    if (!btn) return;
    btn.style.opacity = selectedRows.size > 0 ? "1" : "0.5";
  }, [selectedRows]);

  function toggleRow(rowId: string) {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId); else next.add(rowId);
      return next;
    });
  }

  async function deleteSelectedRows(extraId?: string) {
    const toDelete = extraId
      ? new Set([...selectedRows, extraId])
      : selectedRows;
    if (toDelete.size === 0 && !extraId) return;
    setDeleting(true);
    setContextMenu(null);
    const invoiceIds: string[] = [];
    for (const rowId of toDelete) {
      // rowId är första invoicens id i sessionen
      const rep = invoices.find(i => i.id === rowId);
      if (rep?.session_id) {
        invoices.filter(i => i.session_id === rep.session_id).forEach(i => invoiceIds.push(i.id));
      } else if (rep) {
        invoiceIds.push(rep.id);
      }
    }
    await Promise.all(invoiceIds.map(id =>
      fetch(`/api/invoices/${id}`, { method: "DELETE" })
    ));
    setDeleting(false);
    setSelectedRows(new Set());
    setContextMenu(null);
    load();
  }

  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [inv, tr] = await Promise.all([
      fetch("/api/invoices").then(r => r.json()),
      fetch("/api/transports").then(r => r.json()),
    ]);
    if (Array.isArray(inv)) setInvoices(inv);
    if (Array.isArray(tr))  setTransports(tr);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Simulerad progressbar — snabb i början, saknar in mot 85%, väntar på svar
  function startProgress() {
    setProgress(0);
    let current = 0;
    const steps = [
      { target: 15, duration: 300 },
      { target: 35, duration: 500 },
      { target: 55, duration: 700 },
      { target: 72, duration: 900 },
      { target: 85, duration: 1200 },
    ];
    let i = 0;
    function runStep() {
      if (i >= steps.length) return;
      const { target, duration } = steps[i];
      const start = current;
      const startTime = Date.now();
      function animate() {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 2); // ease-out
        current = start + (target - start) * eased;
        setProgress(Math.round(current));
        if (t < 1) requestAnimationFrame(animate);
        else { i++; runStep(); }
      }
      requestAnimationFrame(animate);
    }
    runStep();
  }

  function completeProgress(cb: () => void) {
    setProgress(95);
    setTimeout(() => {
      setProgress(100);
      setTimeout(cb, 400);
    }, 300);
  }

  // Load fields when activeInvoice changes
  useEffect(() => {
    if (!activeInvoice) return;
    const map: Record<string, { value: string; source: string; confidence: string | null }> = {};
    setLocalFields(fieldsToLocalMap(activeInvoice.invoice_fields));

    setFileUrl(null);
    fetch(`/api/invoices/${activeInvoice.id}/file`).then(async res => {
      if (res.ok) {
        const blob = await res.blob();
        setFileUrl(URL.createObjectURL(blob));
        setFileType(blob.type);
      }
    });
  }, [activeInvoice?.id]); // eslint-disable-line

  async function saveField(fieldKey: string, value: string) {
    if (!activeInvoice) return;
    setLocalFields(prev => ({ ...prev, [fieldKey]: { ...prev[fieldKey], value, source: "manual", confidence: null } }));
    await fetch(`/api/invoices/${activeInvoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldKey, fieldValue: value }),
    });
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const fileArr = Array.from(files);
    // Generera ett unikt session_id för hela denna uppladdning
    const sessionId = crypto.randomUUID();

    // Bygg initial uploadedFiles array med URL:er direkt
    const newUploads = fileArr.map(f => ({
      file: f,
      url: URL.createObjectURL(f),
      type: f.type,
      invoiceId: null as string | null,
      name: f.name,
    }));

    setUploadedFiles(newUploads);
    setActiveFileIdx(0);
    setFileUrl(newUploads[0].url);
    setFileType(newUploads[0].type);
    setDestination(null); setCreateType(null);
    setLocalFields({});
    setView("split"); setProcessing(true); startProgress();

    // Ladda upp alla filer sekventiellt med samma session_id
    const updatedUploads = [...newUploads];
    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i];
      const fd = new FormData();
      fd.append("file", file);
      fd.append("session_id", sessionId);
      const res = await fetch("/api/invoices", { method: "POST", body: fd });
      if (!res.ok) continue;
      const invoice: Invoice = await res.json();
      updatedUploads[i] = { ...updatedUploads[i], invoiceId: invoice.id };

      const fd2 = new FormData(); fd2.append("file", file); fd2.append("invoiceId", invoice.id);
      await fetch("/api/extract", { method: "POST", body: fd2 });
    }
    setUploadedFiles(updatedUploads);

    const allRes = await fetch("/api/invoices");
    if (allRes.ok) {
      const all: Invoice[] = await allRes.json();
      setInvoices(all);
      // Sätt aktivt dokument till det första uppladdade
      const firstId = updatedUploads[0]?.invoiceId;
      if (firstId) {
        const updated = all.find(i => i.id === firstId);
        if (updated) {
          setActiveInvoice(updated);
          const map: Record<string, { value: string; source: string; confidence: string | null }> = {};
          setLocalFields(fieldsToLocalMap(updated.invoice_fields));
        }
      }
    }
    completeProgress(() => setProcessing(false));

    // ── Conflict detection ────────────────────────────────────────────────
    // Samla alla extraherade fält per dokument
    const allRes2 = await fetch("/api/invoices");
    if (!allRes2.ok) return;
    const allInvoices2: Invoice[] = await allRes2.json();

    const docFields: { docName: string; docIdx: number; fields: Record<string, { value: string; confidence: string | null }> }[] = [];

    for (let i = 0; i < updatedUploads.length; i++) {
      const inv = allInvoices2.find(x => x.id === updatedUploads[i].invoiceId);
      if (!inv) continue;
      const fields: Record<string, { value: string; confidence: string | null }> = {};
      inv.invoice_fields.forEach(f => {
        if (f.field_value) {
          fields[f.field_key] = { value: f.field_value, confidence: f.confidence };
          const sk = TO_SAD[f.field_key];
          if (sk) fields[sk] = { value: f.field_value, confidence: f.confidence };
        }
      });
      docFields.push({ docName: updatedUploads[i].name, docIdx: i, fields });
    }

    if (docFields.length > 1) {
      // Hitta fält där värden skiljer sig mellan dokument
      const allKeys = [...new Set(docFields.flatMap(d => Object.keys(d.fields)))];
      const foundConflicts: FieldConflict[] = [];

      for (const key of allKeys) {
        const vals = docFields
          .filter(d => d.fields[key]?.value)
          .map(d => ({ value: d.fields[key].value, confidence: d.fields[key].confidence, source: "ai", docName: d.docName, docIdx: d.docIdx }));

        if (vals.length > 1) {
          const unique = [...new Set(vals.map(v => v.value.trim().toLowerCase()))];
          if (unique.length > 1) {
            const fieldDef = DIGITOLL_FIELDS.find(f => f.key === key) ?? SAD_FIELDS.find(f => f.key === key);
            foundConflicts.push({ fieldKey: key, label: fieldDef?.label ?? key, values: vals });
          }
        }
      }

      if (foundConflicts.length > 0) {
        setConflicts(foundConflicts);
        setResolutions({});
        setConflictIdx(0);
        setShowConflictModal(true);
      }
    }
  }

  async function saveForLater() {
    if (!activeInvoice) { discardAndReturn(); return; }
    setSavingLater(true);
    // Spara alla localFields till API
    for (const [fieldKey, fieldData] of Object.entries(localFields)) {
      await fetch(`/api/invoices/${activeInvoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldKey, fieldValue: fieldData.value }),
      });
    }
    setView("table");
    setActiveInvoice(null);
    setFileUrl(null);
    setDestination(null);
    setCreateType(null);
    setLocalFields({});
    setUploadedFiles([]);
    setActiveFileIdx(0);
    setSavingLater(false);
    load();
  }

  function applyResolutions() {
    const resolved = { ...localFields };
    for (const conflict of conflicts) {
      const chosenIdx = resolutions[conflict.fieldKey] ?? 0;
      const chosen = conflict.values[chosenIdx];
      if (chosen) {
        resolved[conflict.fieldKey] = { value: chosen.value, source: "ai", confidence: chosen.confidence };
      }
    }
    setLocalFields(resolved);
    setShowConflictModal(false);
    setConflicts([]);
  }

  async function openExisting(inv: Invoice) {
    setDestination(null); setCreateType(null); setFormMode("digitoll"); setView("split");
    setActiveFileIdx(0);

    // Hämta signed URL för det primära dokumentet
    let primaryUrl: string | null = null;
    if (inv.file_path) {
      const res = await fetch(`/api/invoices/${inv.id}/url`);
      if (res.ok) { const d = await res.json(); primaryUrl = d.url; }
    }
    setFileUrl(primaryUrl);
    setFileType(inv.file_name.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
    setActiveInvoice(inv);

    // Sätt initialFields
    const map: Record<string, string> = {};
    const initMap: Record<string, string> = {};
    inv.invoice_fields.forEach(f => { if (f.field_value) initMap[f.field_key] = f.field_value; });
    // Inkludera SAD-mappade nycklar i initialFields
    for (const [k, v] of Object.entries(initMap)) { const sk = TO_SAD[k]; if (sk) initMap[sk] = v; }
    setInitialFields(initMap);

    // Om sessionen har flera dokument — ladda alla
    if (inv.session_id) {
      const sessionInvs = invoices.filter(i => i.session_id === inv.session_id);
      const uploads = await Promise.all(sessionInvs.map(async (si) => {
        let url = "";
        if (si.file_path) {
          const r = await fetch(`/api/invoices/${si.id}/url`);
          if (r.ok) { const d = await r.json(); url = d.url; }
        }
        return { file: new File([], si.file_name), url, type: si.file_name.endsWith(".pdf") ? "application/pdf" : "image/jpeg", invoiceId: si.id, name: si.file_name };
      }));
      setUploadedFiles(uploads);
      setFileUrl(uploads[0]?.url ?? primaryUrl);
      setFileType(uploads[0]?.type ?? "application/pdf");
    } else {
      setUploadedFiles([]);
    }
  }

  async function discardAndReturn() {
    // Ta bort alla nyuppladdade dokument från databasen
    const idsToDelete = uploadedFiles
      .map(f => f.invoiceId)
      .filter(Boolean) as string[];
    const isExisting = uploadedFiles.length === 0 && activeInvoice;
    if (!isExisting) {
      await Promise.all(idsToDelete.map(id =>
        fetch(`/api/invoices/${id}`, { method: "DELETE" })
      ));
    }
    setView("table"); setActiveInvoice(null); setFileUrl(null);
    setDestination(null); setCreateType(null); setShowCmsAnim(false); setCmsStep(0); setLocalFields({});
    setUploadedFiles([]); setActiveFileIdx(0); setInitialFields({});
    load();
  }

  function discardChanges() {
    // Återställ till senast sparade värden utan att lämna vyn
    const restored: Record<string, { value: string; source: string; confidence: string | null }> = {};
    Object.entries(initialFields).forEach(([k, v]) => { restored[k] = { value: v, source: "ai", confidence: null }; });
    setLocalFields(restored);
  }

  async function removeDocument() {
    const idsToDelete = uploadedFiles.length > 0
      ? uploadedFiles.map(f => f.invoiceId).filter(Boolean) as string[]
      : activeInvoice ? [activeInvoice.id] : [];
    await Promise.all(idsToDelete.map(id =>
      fetch(`/api/invoices/${id}`, { method: "DELETE" })
    ));
    setView("table"); setActiveInvoice(null); setFileUrl(null);
    setDestination(null); setCreateType(null); setShowCmsAnim(false); setCmsStep(0); setLocalFields({});
    setUploadedFiles([]); setActiveFileIdx(0); setInitialFields({});
    load();
  }

  const isNewUpload = uploadedFiles.length > 0;
  const hasChanges = Object.entries(localFields).some(([k, v]) => v.value !== (initialFields[k] ?? ""));

  function switchToFile(idx: number) {
    const f = uploadedFiles[idx];
    if (!f) return;
    setActiveFileIdx(idx);
    setFileUrl(f.url);
    setFileType(f.type);
    // Ladda invoice-data för det valda dokumentet
    if (f.invoiceId) {
      const inv = invoices.find(i => i.id === f.invoiceId);
      if (inv) {
        setActiveInvoice(inv);
        const map: Record<string, { value: string; source: string; confidence: string | null }> = {};
        setLocalFields(fieldsToLocalMap(inv.invoice_fields));
      }
    }
  }

  function triggerCms() {
    setShowCmsAnim(true); setCmsStep(1);
    setTimeout(() => setCmsStep(2), 1200);
    setTimeout(() => setCmsStep(3), 2400);
    setTimeout(() => discardAndReturn(), 3800);
  }

  // ── SAD → Digitoll field mapping ─────────────────────────────────────────
  const SAD_TO_DIGITOLL: Record<string, string> = {
    sad_exp_name:              "exp_name",
    sad_exp_country:           "exp_country",
    sad_imp_name:              "imp_name",
    sad_imp_org_no:            "imp_org_no",
    sad_invoice_value:         "totalValue",
    sad_currency:              "currency",
    sad_incoterm:              "incoterm",
    sad_incoterm_place:        "incotermPlace",
    sad_country_destination:   "destinationCountry",
    sad_transport_mode_border: "modeOfTransport",
    sad_transport_ref_border:  "transportRef",
    sad_border_crossing:       "borderCrossing",
    sad_net_weight:            "totalNetWeight",
    sad_gross_weight:          "totalGrossWeight",
    sad_hs_code:               "hsCode",
    sad_statistical_value:     "customsValue",
    sad_invoice_date:          "invoiceDate",
    sad_invoice_number:        "invoiceNumber",
  };

  const [submitResult, setSubmitResult] = useState<{ digitollId: string | null; customsRef: string | null } | null>(null);
  const [submitting, setSubmitting]     = useState(false);

  async function submitSADOnly() {
    if (!activeInvoice) return;
    setSubmitting(true);
    const get = (k: string) => localFields[k]?.value ?? "";
    const cmsRef = `CMS-${Date.now().toString().slice(-6)}`;
    const res = await fetch("/api/customs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference:       cmsRef,
        consignor:       get("sad_exp_name"),
        consignee:       get("sad_imp_name"),
        border_crossing: get("sad_border_crossing"),
        status:          "submitted",
        digitoll_id:     null,
        // All SAD fields
        sad_exp_name:              get("sad_exp_name"),
        sad_exp_address:           get("sad_exp_address"),
        sad_exp_country:           get("sad_exp_country"),
        sad_exp_org_no:            get("sad_exp_org_no"),
        sad_imp_name:              get("sad_imp_name"),
        sad_imp_address:           get("sad_imp_address"),
        sad_imp_org_no:            get("sad_imp_org_no"),
        sad_imp_vat_no:            get("sad_imp_vat_no"),
        sad_declarant_name:        get("sad_declarant_name"),
        sad_declarant_org_no:      get("sad_declarant_org_no"),
        sad_declaration_ref:       get("sad_declaration_ref"),
        sad_invoice_number:        get("sad_invoice_number"),
        sad_invoice_date:          get("sad_invoice_date"),
        sad_prev_document:         get("sad_prev_document"),
        sad_incoterm:              get("sad_incoterm"),
        sad_incoterm_place:        get("sad_incoterm_place"),
        sad_transport_mode_border: get("sad_transport_mode_border"),
        sad_transport_ref_border:  get("sad_transport_ref_border"),
        sad_border_crossing:       get("sad_border_crossing"),
        sad_country_dispatch:      get("sad_country_dispatch"),
        sad_country_destination:   get("sad_country_destination"),
        sad_goods_description:     get("sad_goods_description"),
        sad_hs_code:               get("sad_hs_code"),
        sad_country_origin:        get("sad_country_origin"),
        sad_gross_weight:          get("sad_gross_weight"),
        sad_net_weight:            get("sad_net_weight"),
        sad_packages:              get("sad_packages"),
        sad_invoice_value:         get("sad_invoice_value"),
        sad_currency:              get("sad_currency"),
        sad_exchange_rate:         get("sad_exchange_rate"),
        sad_statistical_value:     get("sad_statistical_value"),
        sad_customs_duty_rate:     get("sad_customs_duty_rate"),
        sad_customs_duty_amount:   get("sad_customs_duty_amount"),
        sad_vat_basis:             get("sad_vat_basis"),
      }),
    });
    if (res.ok) {
      await fetch(`/api/invoices/${activeInvoice.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fieldKey: "cms_ref", fieldValue: cmsRef }) });
      setSubmitResult({ digitollId: null, customsRef: cmsRef });
    }
    setSubmitting(false);
  }

  async function submitBoth() {
    if (!activeInvoice) return;
    setSubmitting(true);
    const get = (k: string) => localFields[k]?.value ?? "";

    // Step 1: Create Digitoll transport using mapped SAD fields
    const transportRef = `T-${1000 + Math.floor(Math.random() * 9000)}`;
    const transportRes = await fetch("/api/transports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference:      transportRef,
        border_crossing: get("sad_border_crossing") || get("sad_country_destination"),
        transport_mode: get("sad_transport_mode_border") || "Road",
        carrier:        get("sad_transport_ref_border"),
        actor:          get("sad_exp_name"),
        status:         "complete_unlinked",
        declaration_status: "none",
        source:         "document_reader",
      }),
    });

    let digitollId: string | null = null;
    if (transportRes.ok) {
      const transport = await transportRes.json();
      digitollId = transport.state_id ?? transport.reference ?? transportRef;
    }

    // Step 2: Create Customs declaration with all SAD fields
    const cmsRef = `CMS-${Date.now().toString().slice(-6)}`;
    const customsRes = await fetch("/api/customs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference:       cmsRef,
        consignor:       get("sad_exp_name"),
        consignee:       get("sad_imp_name"),
        border_crossing: get("sad_border_crossing"),
        status:          "submitted",
        digitoll_id:     digitollId,
        sad_exp_name:              get("sad_exp_name"),
        sad_exp_address:           get("sad_exp_address"),
        sad_exp_country:           get("sad_exp_country"),
        sad_exp_org_no:            get("sad_exp_org_no"),
        sad_imp_name:              get("sad_imp_name"),
        sad_imp_address:           get("sad_imp_address"),
        sad_imp_org_no:            get("sad_imp_org_no"),
        sad_imp_vat_no:            get("sad_imp_vat_no"),
        sad_declarant_name:        get("sad_declarant_name"),
        sad_declarant_org_no:      get("sad_declarant_org_no"),
        sad_declaration_ref:       get("sad_declaration_ref"),
        sad_invoice_number:        get("sad_invoice_number"),
        sad_invoice_date:          get("sad_invoice_date"),
        sad_prev_document:         get("sad_prev_document"),
        sad_incoterm:              get("sad_incoterm"),
        sad_incoterm_place:        get("sad_incoterm_place"),
        sad_transport_mode_border: get("sad_transport_mode_border"),
        sad_transport_ref_border:  get("sad_transport_ref_border"),
        sad_border_crossing:       get("sad_border_crossing"),
        sad_country_dispatch:      get("sad_country_dispatch"),
        sad_country_destination:   get("sad_country_destination"),
        sad_goods_description:     get("sad_goods_description"),
        sad_hs_code:               get("sad_hs_code"),
        sad_country_origin:        get("sad_country_origin"),
        sad_gross_weight:          get("sad_gross_weight"),
        sad_net_weight:            get("sad_net_weight"),
        sad_packages:              get("sad_packages"),
        sad_invoice_value:         get("sad_invoice_value"),
        sad_currency:              get("sad_currency"),
        sad_exchange_rate:         get("sad_exchange_rate"),
        sad_statistical_value:     get("sad_statistical_value"),
        sad_customs_duty_rate:     get("sad_customs_duty_rate"),
        sad_customs_duty_amount:   get("sad_customs_duty_amount"),
        sad_vat_basis:             get("sad_vat_basis"),
      }),
    });

    // Step 3: Update Digitoll record with CMS ref if both succeeded
    if (customsRes.ok && digitollId) {
      // Customs record gets digitoll_id, Digitoll record already has its ID
    }

    // Step 4: Mark invoice as processed
    if (activeInvoice) {
      await fetch(`/api/invoices/${activeInvoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldKey: "cms_ref", fieldValue: cmsRef }),
      });
    }

    setSubmitting(false);
    setSubmitResult({ digitollId, customsRef: cmsRef });
  }

  async function handleCreate() {
    if (!activeInvoice || !createType) return;
    setSaving(true);
    const get = (k: string) => localFields[k]?.value ?? "";
    const body = createType === "transport" ? {
      reference: `TR-${Date.now().toString().slice(-4)}`,
      border_crossing: get("destinationCountry"),
      transport_mode: get("modeOfTransport") || "Road",
      carrier: get("transportRef"),
    } : {
      reference: `SH-${Date.now().toString().slice(-4)}`,
      actor: get("exp_name"),
      transport_id: linkTransportId || null,
    };
    const res = await fetch(`/api/${createType}s`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const record = await res.json();
      await fetch(`/api/invoices/${activeInvoice.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [`${createType}_id`]: record.id }) });
      setSaving(false); discardAndReturn(); router.push("/digitoll");
    } else { setSaving(false); }
  }

  // ── Filtered invoices ─────────────────────────────────────────────────────
  const sessionRows = groupIntoSessions(invoices);
  const filtered = sessionRows.filter(row => {
    const names = row.file_names.join(" ").toLowerCase();
    if (search && !names.includes(search.toLowerCase())) return false;
    const st = docStatus(row.invoices[0]);
    if (filter === "review")    return st.label === "Needs review";
    if (filter === "ready")     return st.label === "Ready";
    if (filter === "processed") return st.label === "Processed";
    return true;
  });
  const reviewCount    = sessionRows.filter(r => docStatus(r.invoices[0]).label === "Needs review").length;
  const readyCount     = sessionRows.filter(r => docStatus(r.invoices[0]).label === "Ready").length;
  const processedCount = sessionRows.filter(r => docStatus(r.invoices[0]).label === "Processed").length;

  // Live completion
  const activeFields = formMode === "digitoll" ? DIGITOLL_FIELDS : SAD_FIELDS;
  const comp          = calcCompletion(activeFields, localFields);
  const digitollComp  = calcCompletion(DIGITOLL_FIELDS, localFields);
  const sadComp       = calcCompletion(SAD_FIELDS, localFields);
  // ── Session groupering ────────────────────────────────────────────────────
  // Gruppera invoices per session_id, enskilda utan session = egna rader
  interface SessionRow {
    id: string; // representant-invoice id (första i sessionen)
    session_id: string | null;
    file_names: string[];
    file_size: number;
    status: string;
    completion_pct: number;
    created_at: string;
    source: string | null;
    invoices: Invoice[]; // alla invoices i sessionen
  }

  function groupIntoSessions(invs: Invoice[]): SessionRow[] {
    const sessionMap = new Map<string, Invoice[]>();
    const singles: Invoice[] = [];
    for (const inv of invs) {
      if (inv.session_id) {
        if (!sessionMap.has(inv.session_id)) sessionMap.set(inv.session_id, []);
        sessionMap.get(inv.session_id)!.push(inv);
      } else {
        singles.push(inv);
      }
    }
    const rows: SessionRow[] = [];
    // Sessions — visa som en rad
    for (const [sid, group] of sessionMap.entries()) {
      const sorted = [...group].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const avgPct = Math.round(sorted.reduce((s, i) => s + i.completion_pct, 0) / sorted.length);
      const worstStatus = sorted.some(i => i.status === "needs_review") ? "needs_review"
        : sorted.some(i => i.status === "extracted") ? "extracted"
        : sorted[0].status;
      rows.push({
        id: sorted[0].id,
        session_id: sid,
        file_names: sorted.map(i => i.file_name),
        file_size: sorted.reduce((s, i) => s + i.file_size, 0),
        status: worstStatus,
        completion_pct: avgPct,
        created_at: sorted[0].created_at,
        source: sorted[0].source,
        invoices: sorted,
      });
    }
    // Enskilda dokument
    for (const inv of singles) {
      rows.push({
        id: inv.id,
        session_id: null,
        file_names: [inv.file_name],
        file_size: inv.file_size,
        status: inv.status,
        completion_pct: inv.completion_pct,
        created_at: inv.created_at,
        source: inv.source,
        invoices: [inv],
      });
    }
    return rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // ── Field renderer ────────────────────────────────────────────────────────
  function renderField(f: typeof DIGITOLL_FIELDS[number]) {
    const fd      = localFields[f.key];
    const val     = fd?.value ?? "";
    const conf    = fd?.confidence ?? null;
    const manual  = fd?.source === "manual";
    const empty   = !val.trim();
    const missing = f.required && empty && !processing;

    let borderColor = "#D0D5DD";
    if (missing)     borderColor = "#FDA29B";
    else if (manual) borderColor = "#6CE9A6";
    else if (val)    borderColor = "#84ADFF";

    let confLabel = null;
    if (manual)          confLabel = <span style={{ fontSize: 10, fontWeight: 600, color: "#027A48" }}>Manual</span>;
    else if (conf === "high") confLabel = <span style={{ fontSize: 10, fontWeight: 600, color: "#027A48" }}>High confidence</span>;
    else if (conf === "med")  confLabel = <span style={{ fontSize: 10, fontWeight: 600, color: "#B54708" }}>Medium</span>;
    else if (conf === "low")  confLabel = <span style={{ fontSize: 10, fontWeight: 700, color: "#003160" }}>Low confidence</span>;

    return (
      <div key={f.key} style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#344054", textTransform: "uppercase" as const, letterSpacing: ".04em" }}>
            {f.label}{f.required && <span style={{ color: "#D92D20" }}> *</span>}
          </label>
          {confLabel}
        </div>
        <input
          style={{ ...inp, borderColor, background: missing ? "#FFF9F9" : "#fff" }}
          value={val}
          placeholder={(f as {placeholder?: string}).placeholder ?? (missing ? "Required — please fill in" : "")}
          onChange={e => setLocalFields(prev => ({ ...prev, [f.key]: { value: e.target.value, source: "manual", confidence: null } }))}
          onBlur={e => saveField(f.key, e.target.value)}
        />
        {missing && <div style={{ fontSize: 10.5, color: "#D92D20", marginTop: 2 }}>Required — please fill in this field</div>}
      </div>
    );
  }

  // ── TABLE VIEW ────────────────────────────────────────────────────────────
  const TableView = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      <div style={{ padding: "14px 20px 0", background: "#fff", borderBottom: "1px solid #E4E7EC" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          {([ ["all","All",invoices.length], ["review","Needs review",reviewCount], ["ready","Ready",readyCount], ["processed","Processed",processedCount] ] as [string,string,number][]).map(([key,label,count]) => (
            <button key={key} onClick={() => setFilter(key)} style={fBtn(filter === key)}>
              {label}
              <span style={{ background: filter === key ? "rgba(255,255,255,0.25)" : "#003160", color: "#fff", borderRadius: 2, padding: "1px 7px", fontSize: 10, fontWeight: 700, minWidth: 20, textAlign: "center" as const, lineHeight: "16px" }}>{count}</span>
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 2 }}>
            {[
              { icon: "≡", title: "Group" },
              { icon: "↺", title: "Refresh" },
              { icon: "⊟", title: "Filter" },
            ].map(({ icon, title }) => (
              <button key={title} title={title} style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: "pointer", borderRadius: 2, color: "#003160", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>
                {icon}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 1, background: "#E4E7EC", margin: "0 -20px 10px" }} />
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff" }}>
            <span style={{ fontFamily: "Material Icons", fontSize: 18, color: "#98A2B3", lineHeight: 1, userSelect: "none" as const }}>search</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." style={{ border: "none", outline: "none", fontSize: 13, color: "#344054", fontFamily: "inherit", width: "100%", background: "transparent" }} />
            {search && <button onClick={() => setSearch("")} style={{ border: "none", background: "transparent", color: "#98A2B3", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>✕</button>}
          </div>
        </div>
      </div>

      {/* Tabell-yta som också är drop-zon */}
      <div
        style={{ flex: 1, overflowY: "auto", position: "relative" as const }}
        onDragOver={e => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).setAttribute("data-drag", "true");
          const overlay = e.currentTarget.querySelector(".drop-overlay") as HTMLElement;
          if (overlay) overlay.style.display = "flex";
        }}
        onDragLeave={e => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            (e.currentTarget as HTMLElement).removeAttribute("data-drag");
            const overlay = e.currentTarget.querySelector(".drop-overlay") as HTMLElement;
            if (overlay) overlay.style.display = "none";
          }
        }}
        onDrop={e => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).removeAttribute("data-drag");
          const overlay = e.currentTarget.querySelector(".drop-overlay") as HTMLElement;
          if (overlay) overlay.style.display = "none";
          handleFiles(e.dataTransfer.files);
        }}
      >
        {/* Delete spinner overlay */}
      {deleting && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.35)", zIndex: 300, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>Deleting…</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}


        <div className="drop-overlay" style={{ display: "none", position: "absolute" as const, inset: 0, background: "rgba(68,107,249,0.06)", border: "2px dashed #446BF9", borderRadius: 2, zIndex: 10, flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 12, pointerEvents: "none" as const }}>
          <span style={{ fontFamily: "Material Icons", fontSize: 48, color: "#446BF9", lineHeight: 1 }}>upload_file</span>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#446BF9" }}>Drop to upload</div>
          <div style={{ fontSize: 13, color: "#98A2B3" }}>PDF, PNG, JPG</div>
        </div>

        <div style={{ background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" as const }}>
          <colgroup>
            <col style={{ width: 36 }} /><col style={{ width: "26%" }} /><col style={{ width: "11%" }} /><col style={{ width: "7%" }} />
            <col style={{ width: "11%" }} /><col style={{ width: "13%" }} /><col style={{ width: "11%" }} />
            <col style={{ width: 36 }} /><col style={{ width: "10%" }} /><col style={{ width: 36 }} />
          </colgroup>
          <thead style={{ background: "#fff", borderBottom: "2px solid #E4E7EC" }}>
            <tr>
              <th style={{ width: 36, padding: "0 8px", textAlign: "center" as const }} onClick={() => selectedRows.size === filtered.length ? setSelectedRows(new Set()) : setSelectedRows(new Set(filtered.map(r => r.id)))}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${selectedRows.size > 0 ? "#446BF9" : "#D0D5DD"}`, background: selectedRows.size === filtered.length && filtered.length > 0 ? "#446BF9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", cursor: "pointer" }}>
                  {selectedRows.size === filtered.length && filtered.length > 0 && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                  {selectedRows.size > 0 && selectedRows.size < filtered.length && <span style={{ width: 6, height: 2, background: "#446BF9", display: "block", borderRadius: 1 }} />}
                </div>
              </th>
              {["Document","Source","Size","Uploaded","Status","Completion","Action",""].map((h,i) => (
                <th key={i} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#003160", letterSpacing: ".04em", textTransform: "uppercase" as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Context menu */}
            {contextMenu && (
              <tr style={{ position: "fixed" as any, left: contextMenu.x, top: contextMenu.y, zIndex: 200 }}>
                <td colSpan={9}>
                  <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 2, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 160, overflow: "hidden" }}
                    onMouseLeave={() => setContextMenu(null)}>
                    <button onClick={() => deleteSelectedRows(contextMenu.rowId)} style={{ width: "100%", padding: "9px 14px", border: "none", background: "transparent", textAlign: "left" as const, fontSize: 12.5, color: "#B42318", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#FEF3F2")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <span style={{ fontFamily: "Material Icons", fontSize: 15, lineHeight: 1 }}>delete</span>
                      Delete{selectedRows.size > 1 && selectedRows.has(contextMenu.rowId) ? ` (${selectedRows.size})` : ""}
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {filtered.map(row => {
              const st = docStatus(row.invoices[0]);
              const isSelected = selectedRows.has(row.id);
              return (
                <tr key={row.id}
                  style={{ borderBottom: "1px solid #E4E7EC", cursor: "pointer", background: isSelected ? "#EDF0F3" : "transparent" }}
                  onClick={() => openExisting(row.invoices[0])}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#F9FAFB"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSelected ? "#EDF0F3" : "transparent"; }}
                  onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, rowId: row.id }); }}
                >
                  <td style={{ padding: "0 8px", width: 36, textAlign: "center" as const }} onClick={e => { e.stopPropagation(); toggleRow(row.id); }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${isSelected ? "#446BF9" : "#D0D5DD"}`, background: isSelected ? "#446BF9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", opacity: isSelected ? 1 : undefined }}
                      className="row-checkbox">
                      {isSelected && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <DocumentNames names={row.file_names} />
                  </td>
                  <td style={{ padding: "10px 12px" }}><SourceBadge source={row.source} /></td>
                  <td style={{ padding: "10px 12px", color: "#98A2B3", fontSize: 12 }}>{fmtSize(row.file_size)}</td>
                  <td style={{ padding: "10px 12px", color: "#667085", fontSize: 11.5 }}>{fmtDate(row.created_at)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span title={st.tip} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 2, fontSize: 11.5, fontWeight: 500, background: st.bg, color: st.color }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.color, flexShrink: 0 }} />{st.label}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 4, background: "#F2F4F7", borderRadius: 2, overflow: "hidden", maxWidth: 80 }}>
                        <div style={{ height: "100%", background: barColor(row.completion_pct), width: `${row.completion_pct}%` }} />
                      </div>
                      <span style={{ fontSize: 11, color: "#667085", minWidth: 28 }}>{row.completion_pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span onClick={e => { e.stopPropagation(); openExisting(row.invoices[0]); }} style={{ color: "#446BF9", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                      {st.label === "Processed" ? "View" : "Use data"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 4px" }}>
                    <button onClick={e => { e.stopPropagation(); openExisting(row.invoices[0]); }} style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", color: "#98A2B3", fontSize: 18 }}>⋯</button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "#98A2B3", fontSize: 13 }}>No documents found</td></tr>}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );

  // ── SPLIT VIEW ─────────────────────────────────────────────────────────────
  const SplitView = (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Left: document preview */}
      <div style={{ width: "48%", borderRight: "1px solid #E4E7EC", display: "flex", flexDirection: "column", background: "#F9FAFB" }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #E4E7EC", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#344054", textTransform: "uppercase" as const, letterSpacing: ".04em" }}>Source Document</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={saveForLater} title="Save for later"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 2, border: "1px solid #446BF9", background: "#fff", color: "#446BF9", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget.style.background = "#EFF8FF"); }}
              onMouseLeave={e => { (e.currentTarget.style.background = "#fff"); }}
            >
              <span style={{ fontFamily: "Material Icons", fontSize: 13, lineHeight: 1 }}>bookmark</span>
              Save for later
            </button>
            {!isNewUpload && (
              <button onClick={discardChanges} disabled={!hasChanges} title="Discard unsaved changes"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 2, border: `1px solid ${hasChanges ? "#FECDCA" : "#E4E7EC"}`, background: "#fff", color: hasChanges ? "#B42318" : "#D0D5DD", fontSize: 11.5, fontWeight: 600, cursor: hasChanges ? "pointer" : "default", fontFamily: "inherit", transition: "all 0.15s" }}
                onMouseEnter={e => { if (hasChanges) (e.currentTarget.style.background = "#FEF3F2"); }}
                onMouseLeave={e => { (e.currentTarget.style.background = "#fff"); }}
              >
                <span style={{ fontFamily: "Material Icons", fontSize: 13, lineHeight: 1 }}>undo</span>
                Discard Changes
              </button>
            )}
            <button onClick={removeDocument} title="Remove document permanently"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", color: "#667085", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget.style.background = "#FEF3F2"); (e.currentTarget.style.borderColor = "#FECDCA"); (e.currentTarget.style.color = "#B42318"); }}
              onMouseLeave={e => { (e.currentTarget.style.background = "#fff"); (e.currentTarget.style.borderColor = "#D0D5DD"); (e.currentTarget.style.color = "#667085"); }}
            >
              <span style={{ fontFamily: "Material Icons", fontSize: 13, lineHeight: 1 }}>delete</span>
              Remove
            </button>
          </div>
        </div>

        {/* Thumbnail-rad — visas om fler än ett dokument */}
        {uploadedFiles.length > 1 && (
          <div style={{ display: "flex", gap: 6, padding: "8px 12px", overflowX: "auto", borderBottom: "1px solid #E4E7EC", background: "#fff", flexShrink: 0 }}>
            {uploadedFiles.map((f, idx) => {
              const isActive = idx === activeFileIdx;
              const isPdf = f.type === "application/pdf";
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setActiveFileIdx(idx);
                    setFileUrl(f.url);
                    setFileType(f.type);
                  }}
                  title={f.name}
                  style={{ flexShrink: 0, width: 60, cursor: "pointer", borderRadius: 2, border: `2px solid ${isActive ? "#446BF9" : "#E4E7EC"}`, background: isActive ? "#EFF8FF" : "#F9FAFB", overflow: "hidden", transition: "border-color 0.15s" }}
                >
                  {isPdf ? (
                    <div style={{ height: 72, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <span style={{ fontFamily: "Material Symbols Rounded", fontSize: 24, color: isActive ? "#446BF9" : "#D0021B", lineHeight: 1, fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>docs</span>
                      <span style={{ fontSize: 8, color: isActive ? "#446BF9" : "#667085", textAlign: "center" as const, padding: "0 4px", lineHeight: 1.2, wordBreak: "break-all" as const }}>{f.name.length > 12 ? f.name.slice(0, 10) + "…" : f.name}</span>
                    </div>
                  ) : (
                    <img src={f.url} alt={f.name} style={{ width: "100%", height: 72, objectFit: "cover" as const }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {processing ? (
            <div style={{ textAlign: "center", color: "#667085", padding: "0 32px", width: "100%" }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>⏳</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#344054", marginBottom: 6 }}>Extracting data with AI…</div>
              <div style={{ fontSize: 11, color: "#98A2B3", marginBottom: 20 }}>This usually takes 8–15 seconds</div>
              <div style={{ width: "100%", height: 6, background: "#E4E7EC", borderRadius: 2, overflow: "hidden", marginBottom: 8 }}>
                <div style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: progress === 100 ? "#12B76A" : "#446BF9",
                  borderRadius: 2,
                  transition: progress === 0 ? "none" : "width 0.3s ease-out",
                }} />
              </div>
              <div style={{ fontSize: 11, color: "#446BF9", fontWeight: 600 }}>{Math.round(progress)}%</div>
              {/* Step indicators */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, gap: 4 }}>
                {[
                  { label: "Uploading",  threshold: 20 },
                  { label: "Reading",    threshold: 45 },
                  { label: "Extracting", threshold: 70 },
                  { label: "Finalizing", threshold: 90 },
                ].map(step => (
                  <div key={step.label} style={{ flex: 1, textAlign: "center" as const }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: progress >= step.threshold ? "#12B76A" : "#E4E7EC", margin: "0 auto 4px", transition: "background 0.3s" }} />
                    <div style={{ fontSize: 9.5, color: progress >= step.threshold ? "#027A48" : "#98A2B3", fontWeight: progress >= step.threshold ? 600 : 400, transition: "color 0.3s" }}>{step.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : fileUrl ? (
            fileType === "application/pdf"
              ? <iframe src={fileUrl} style={{ width: "100%", height: "100%", border: "none" }} title="Invoice preview" />
              : <img src={fileUrl} alt="Invoice preview" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          ) : (
            <div style={{ textAlign: "center", color: "#98A2B3" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 12 }}>Loading preview…</div>
            </div>
          )}
        </div>
      </div>

      {/* Right: form panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "10px 16px", background: "#fff", borderBottom: "1px solid #E4E7EC" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#344054", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, flex: 1, marginRight: 10 }}>
              {activeInvoice?.file_name ?? "New document"}
            </span>
            {/* Segmented control */}
            <div style={{ display: "flex", background: "#F2F4F7", borderRadius: 2, padding: 2, gap: 2, flexShrink: 0 }}>
              {([
                { key: "digitoll" as const, icon: "receipt_long", label: "Digitoll", fields: DIGITOLL_FIELDS },
                { key: "sad"      as const, icon: "gavel",        label: "SAD",       fields: SAD_FIELDS },
              ]).map(m => {
                const active = formMode === m.key;
                const tabComp = calcCompletion(m.fields, localFields);
                const pctColor = tabComp.pct === 100 ? "#027A48" : tabComp.pct >= 50 ? "#B54708" : "#667085";
                const pctBg   = tabComp.pct === 100 ? "#ECFDF3" : tabComp.pct >= 50 ? "#FFFAEB" : "#F2F4F7";
                return (
                  <button key={m.key} onClick={() => setFormMode(m.key)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 2, border: "none", background: active ? "#fff" : "transparent", cursor: "pointer", boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all .15s", fontFamily: "inherit" }}>
                    <span style={{ fontFamily: "Material Icons", fontSize: 14, color: active ? "#446BF9" : "#98A2B3", lineHeight: 1 }}>{m.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: active ? "#003160" : "#98A2B3" }}>{m.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 2, background: active ? pctBg : "#E4E7EC", color: active ? pctColor : "#98A2B3", minWidth: 28, textAlign: "center" as const }}>{tabComp.pct}%</span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Progress bar för aktiv tab */}
          <div style={{ height: 3, background: "#F2F4F7", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${comp.pct}%`, background: barColor(comp.pct), borderRadius: 2, transition: "width .3s" }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {processing ? (
            <div style={{ padding: "24px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#667085", marginBottom: 12 }}>
                <span style={{ fontSize: 16 }}>⏳</span>
                <span style={{ fontSize: 13 }}>AI is extracting data…</span>
                <span style={{ fontSize: 12, color: "#446BF9", fontWeight: 600, marginLeft: "auto" }}>{progress}%</span>
              </div>
              <div style={{ height: 4, background: "#E4E7EC", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "#446BF9", borderRadius: 2, transition: "width 0.3s ease-out" }} />
              </div>
            </div>
          ) : (
            <>
              {/* Legend */}
              <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
                {[["#84ADFF","AI suggestion"],["#6CE9A6","Manually edited"],["#FDA29B","Required field missing"]].map(([color,label]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#667085" }}>
                    <div style={{ width: 20, height: 3, background: color, borderRadius: 2 }} />{label}
                  </div>
                ))}
              </div>

              {/* Item lines — SAD only, visas överst så aggregerade värden fylls i fälten nedan */}
              {activeInvoice && formMode === "sad" && (
                <div style={{ marginBottom: 16 }}>
                  <ItemsTable invoiceId={activeInvoice.id} onAggregated={async () => {
                    await load();
                    // Ladda om fälten för aktiv invoice så aggregerade värden syns direkt
                    const res = await fetch("/api/invoices");
                    if (res.ok) {
                      const all: Invoice[] = await res.json();
                      const updated = all.find(i => i.id === activeInvoice.id);
                      if (updated) {
                        setActiveInvoice(updated);
                        const map: Record<string, { value: string; source: string; confidence: string | null }> = {};
                        updated.invoice_fields.forEach(f => { map[f.field_key] = { value: f.field_value ?? "", source: f.source, confidence: f.confidence }; });
                        setLocalFields(map);
                      }
                    }
                  }} />
                </div>
              )}

              {/* Fields grouped by section */}
              {(() => {
                const sections: Record<string, typeof DIGITOLL_FIELDS> = {};
                activeFields.forEach(f => { if (!sections[f.section]) sections[f.section] = []; sections[f.section].push(f); });
                return Object.entries(sections).map(([section, sFields]) => (
                  <div key={section} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".07em", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #F2F4F7" }}>{section}</div>
                    <div style={{ display: "grid", gridTemplateColumns: sFields.length === 1 ? "1fr" : "1fr 1fr", gap: "0 12px" }}>
                      {sFields.map(renderField)}
                    </div>
                  </div>
                ));
              })()}

            </>
          )}
        </div>

        {/* Fixed action footer — submit-knappar */}
        <div style={{ borderTop: "1px solid #E4E7EC", background: "#fff", flexShrink: 0 }}>

          {/* Inline confirm panel för Digitoll / Customs */}
          {(destination === "digitoll" || destination === "sad") && !submitResult && !submitting && (
            <div style={{ padding: "10px 12px", borderBottom: "1px solid #E4E7EC", background: "#F9FAFB", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "Material Icons", fontSize: 16, color: destination === "digitoll" ? "#446BF9" : "#446BF9", lineHeight: 1 }}>
                {destination === "digitoll" ? "receipt_long" : "gavel"}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "#101828", marginBottom: 2 }}>
                  {destination === "digitoll" ? "Create Digitoll transport" : "Create Customs Declaration (SAD)"}
                </div>
                {(destination === "digitoll" ? digitollComp : sadComp).pct < 100 && (
                  <div style={{ fontSize: 11, color: "#B42318" }}>
                    {(destination === "digitoll" ? digitollComp : sadComp).total - (destination === "digitoll" ? digitollComp : sadComp).filled} required field{((destination === "digitoll" ? digitollComp : sadComp).total - (destination === "digitoll" ? digitollComp : sadComp).filled) !== 1 ? "s" : ""} missing
                  </div>
                )}
              </div>
              <button onClick={() => setDestination(null)}
                style={{ padding: "5px 10px", borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", color: "#667085", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button
                onClick={async () => { if (destination === "sad") { await submitSADOnly(); } else { await handleCreate(); } }}
                disabled={(destination === "digitoll" ? digitollComp : sadComp).pct < 100 || submitting}
                style={{ padding: "5px 12px", borderRadius: 2, border: "none", background: (destination === "digitoll" ? digitollComp : sadComp).pct === 100 ? "#446BF9" : "#D9DBE0", color: "#fff", fontSize: 11.5, fontWeight: 700, cursor: (destination === "digitoll" ? digitollComp : sadComp).pct === 100 ? "pointer" : "default", fontFamily: "inherit" }}>
                Confirm
              </button>
            </div>
          )}

          {/* Knappar */}
          <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 6 }}>
            {submitResult ? (
              <button onClick={() => { saveForLater(); setSubmitResult(null); }}
                style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 14px", borderRadius: 2, border: "none", background: "#12B76A", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ fontFamily: "Material Icons", fontSize: 15, lineHeight: 1 }}>check_circle</span>
                Done — {submitResult.digitollId ?? ""}{submitResult.customsRef ? ` · ${submitResult.customsRef}` : ""}
              </button>
            ) : submitting ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#667085", fontSize: 12 }}>
                <div style={{ width: 14, height: 14, border: "2px solid #E4E7EC", borderTopColor: "#446BF9", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
                Submitting…
              </div>
            ) : (() => {
              const bothOk     = digitollComp.pct === 100 && sadComp.pct === 100;
              const digitollOk = digitollComp.pct === 100;
              const sadOk      = sadComp.pct === 100;

              const btnBase = (enabled: boolean, active: boolean): React.CSSProperties => ({
                flex: 1,
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "8px 10px", borderRadius: 2, fontFamily: "inherit",
                fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" as const,
                transition: "all 0.15s",
                cursor: enabled ? "pointer" : "not-allowed",
                                border: active ? "2px solid #446BF9" : "1px solid #D0D5DD",
                background: active ? "#EFF8FF" : enabled ? "#fff" : "#F9FAFB",
                color: active ? "#446BF9" : enabled ? "#344054" : "#98A2B3",
              });

              const btnPrimary = (enabled: boolean): React.CSSProperties => ({
                flex: 2,
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "8px 12px", borderRadius: 2, fontFamily: "inherit",
                fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" as const,
                transition: "all 0.15s",
                cursor: enabled ? "pointer" : "not-allowed",
                                border: "none",
                background: enabled ? "#446BF9" : "#D9DBE0",
                color: "#fff",
              });

              return (
                <>
                  <button
                    onClick={() => { if (bothOk) { setFormMode("sad"); submitBoth(); } }}
                    style={btnPrimary(bothOk)}
                    title={!bothOk ? `${!digitollOk ? "Digitoll fields incomplete. " : ""}${!sadOk ? "SAD fields incomplete." : ""}` : "Create Digitoll transport and Customs Declaration in one step"}
                  >
                    <span style={{ fontFamily: "Material Icons", fontSize: 15, lineHeight: 1 }}>send</span>
                    Submit both
                  </button>
                  <button
                    onClick={() => digitollOk && setDestination(destination === "digitoll" ? null : "digitoll")}
                    style={{ ...btnBase(digitollOk, destination === "digitoll"), border: destination === "digitoll" ? "2px solid #446BF9" : digitollOk ? "1px solid #D0D5DD" : "1px solid #E4E7EC" }}
                    title={!digitollOk ? `${digitollComp.total - digitollComp.filled} Digitoll fields missing` : "Create Digitoll transport"}
                  >
                    <span style={{ fontFamily: "Material Icons", fontSize: 14, lineHeight: 1 }}>receipt_long</span>
                    Digitoll
                  </button>
                  <button
                    onClick={() => { if (sadOk) { setDestination(destination === "sad" ? null : "sad"); setFormMode("sad"); } }}
                    style={{ ...btnBase(sadOk, destination === "sad"), border: destination === "sad" ? "2px solid #446BF9" : sadOk ? "1px solid #D0D5DD" : "1px solid #E4E7EC" }}
                    title={!sadOk ? `${sadComp.total - sadComp.filled} SAD fields missing` : "Create Customs Declaration"}
                  >
                    <span style={{ fontFamily: "Material Icons", fontSize: 14, lineHeight: 1 }}>gavel</span>
                    Customs
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );

  // ── CMS animation ─────────────────────────────────────────────────────────
  const CmsOverlay = showCmsAnim && (
    <div style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.6)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 2, padding: "40px 48px", textAlign: "center", maxWidth: 360, width: "100%" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{cmsStep === 1 ? "📤" : cmsStep === 2 ? "🔄" : "✅"}</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#101828", marginBottom: 8 }}>
          {cmsStep === 1 ? "Preparing data…" : cmsStep === 2 ? "Sending to CMS…" : "Data received by CMS!"}
        </div>
        <div style={{ fontSize: 13, color: "#667085" }}>
          {cmsStep === 1 ? "Serializing extracted fields to JSON" : cmsStep === 2 ? "Transmitting to your CMS endpoint" : "Successfully processed — returning to overview"}
        </div>
        <div style={{ marginTop: 20, height: 4, background: "#F2F4F7", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", background: "#12B76A", width: cmsStep === 1 ? "33%" : cmsStep === 2 ? "66%" : "100%", transition: "width 1.1s ease-in-out" }} />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes pulse { 0%,100% { transform: scale(1); opacity:1; } 50% { transform: scale(1.1); opacity:0.7; } }
        .row-checkbox { opacity: 0; transition: opacity 0.1s; }
        tr:hover .row-checkbox { opacity: 1; }
      `}</style>
      <div style={{ position: "fixed", inset: 0, zIndex: 199, display: contextMenu ? "block" : "none", background: "transparent" }} onClick={() => setContextMenu(null)} />

      {/* ── Conflict Resolver Modal ──────────────────────────────────────── */}
      {showConflictModal && conflicts.length > 0 && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.5)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 2, width: 600, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #E4E7EC" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#B54708", lineHeight: 1 }}>warning</span>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#101828", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>Field Conflicts Detected</h3>
                </div>
                <span style={{ fontSize: 12, color: "#667085" }}>{conflictIdx + 1} / {conflicts.length} conflicts</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#667085" }}>
                Multiple documents contain different values for the same fields. Choose which value to use for each conflict.
              </p>
              {/* Progress bar */}
              <div style={{ marginTop: 12, height: 4, background: "#F2F4F7", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${((conflictIdx + 1) / conflicts.length) * 100}%`, background: "#446BF9", borderRadius: 2, transition: "width 0.3s" }} />
              </div>
            </div>

            {/* Current conflict */}
            {(() => {
              const conflict = conflicts[conflictIdx];
              const chosen = resolutions[conflict.fieldKey] ?? -1;
              return (
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 6 }}>Field</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#101828" }}>{conflict.label}</div>
                    <div style={{ fontSize: 11, color: "#98A2B3", marginTop: 2, fontFamily: "monospace" }}>{conflict.fieldKey}</div>
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 10 }}>Choose a value</div>

                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                    {conflict.values.map((val, vi) => {
                      const isChosen = chosen === vi;
                      const confColor = val.confidence === "high" ? "#027A48" : val.confidence === "medium" ? "#B54708" : "#667085";
                      const confBg = val.confidence === "high" ? "#ECFDF3" : val.confidence === "medium" ? "#FFFAEB" : "#F2F4F7";
                      return (
                        <div
                          key={vi}
                          onClick={() => setResolutions(r => ({ ...r, [conflict.fieldKey]: vi }))}
                          style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderRadius: 2, border: `2px solid ${isChosen ? "#446BF9" : "#E4E7EC"}`, background: isChosen ? "#EFF8FF" : "#fff", cursor: "pointer", transition: "all 0.15s" }}
                        >
                          <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${isChosen ? "#446BF9" : "#D0D5DD"}`, background: isChosen ? "#446BF9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                            {isChosen && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#101828", marginBottom: 4 }}>{val.value}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 11, color: "#667085", display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ fontFamily: "Material Icons", fontSize: 13, lineHeight: 1 }}>description</span>
                                {val.docName.length > 30 ? val.docName.slice(0, 28) + "…" : val.docName}
                              </span>
                              {val.confidence && (
                                <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 2, background: confBg, color: confColor }}>
                                  {val.confidence} confidence
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Footer */}
            <div style={{ padding: "14px 22px", borderTop: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 6 }}>
                {conflicts.map((_, i) => (
                  <div key={i} onClick={() => setConflictIdx(i)} style={{ width: 8, height: 8, borderRadius: "50%", background: resolutions[conflicts[i].fieldKey] !== undefined ? "#446BF9" : i === conflictIdx ? "#003160" : "#E4E7EC", cursor: "pointer", transition: "background 0.15s" }} />
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {conflictIdx > 0 && (
                  <button onClick={() => setConflictIdx(i => i - 1)} style={{ padding: "7px 14px", borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", color: "#344054" }}>← Back</button>
                )}
                {conflictIdx < conflicts.length - 1 ? (
                  <button
                    onClick={() => setConflictIdx(i => i + 1)}
                    disabled={resolutions[conflicts[conflictIdx].fieldKey] === undefined}
                    style={{ padding: "7px 14px", borderRadius: 2, border: "none", background: resolutions[conflicts[conflictIdx].fieldKey] !== undefined ? "#446BF9" : "#D9DBE0", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: resolutions[conflicts[conflictIdx].fieldKey] !== undefined ? "pointer" : "default", fontFamily: "inherit" }}
                  >Next →</button>
                ) : (
                  <button
                    onClick={applyResolutions}
                    disabled={Object.keys(resolutions).length < conflicts.length}
                    style={{ padding: "7px 16px", borderRadius: 2, border: "none", background: Object.keys(resolutions).length >= conflicts.length ? "#17B26A" : "#D9DBE0", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: Object.keys(resolutions).length >= conflicts.length ? "pointer" : "default", fontFamily: "inherit" }}
                  >
                    Apply {Object.keys(resolutions).length} / {conflicts.length} resolutions ✓
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {view === "table" ? TableView : SplitView}
      {/* Save for later spinner — visas oavsett view */}
      {savingLater && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.35)", zIndex: 300, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>Saving…</div>
        </div>
      )}
      {CmsOverlay}
      <input ref={fileInput} type="file" multiple accept=".pdf,.png,.jpg,.jpeg" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
    </div>
  );
}
