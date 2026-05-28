"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { FIELDS, calcCompletion, progressColor, buildDigitollJSON } from "@/lib/fields";
import { SAD_FIELDS, calcSADCompletion } from "@/lib/sad-fields";
import ItemsTable from "../components/ItemsTable";

interface FieldData { field_key: string; field_value: string | null; confidence: string | null; source: string; }
interface Invoice { id: string; file_name: string; file_size: number; status: string; completion_pct: number; created_at: string; file_path: string | null; invoice_fields: FieldData[]; }

function fmtSize(b: number) { if (b < 1024) return b + "B"; if (b < 1048576) return Math.round(b / 1024) + " KB"; return (b / 1048576).toFixed(1) + " MB"; }
function fmtDate(s: string) { return new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short" }); }

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { processing: "Processing", extracted: "Extracted", reviewed: "Reviewed", exported: "Exported" };
  return <span className={`status-badge st-${status}`}>{map[status] ?? status}</span>;
}

function syntaxHL(obj: Record<string, unknown> | null): string {
  return JSON.stringify(obj, null, 2)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (m) => {
      let cls = "jn";
      if (/^"/.test(m)) cls = /:$/.test(m) ? "jk" : "js";
      else if (/null/.test(m)) cls = "jnull";
      return `<span class="${cls}">${m}</span>`;
    });
}

export default function Home() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localFields, setLocalFields] = useState<Record<string, { value: string; source: string; confidence: string | null }>>({});
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [showExport, setShowExport] = useState(false);
  const [exportPayload, setExportPayload] = useState<Record<string, unknown> | null>(null);
  const [copyOk, setCopyOk] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileUrl, setFileUrl] = useState<{ url: string; type: string } | null>(null);
  const [mode, setMode] = useState<"digitoll" | "sad">("digitoll");
  const fileInput = useRef<HTMLInputElement>(null);

  const active = invoices.find((i) => i.id === activeId) ?? null;

  const loadInvoices = useCallback(async () => {
    const res = await fetch("/api/invoices");
    if (res.ok) setInvoices(await res.json());
  }, []);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  useEffect(() => {
    if (!active) return;
    const map: Record<string, { value: string; source: string; confidence: string | null }> = {};
    active.invoice_fields.forEach((f) => {
      map[f.field_key] = { value: f.field_value ?? "", source: f.source, confidence: f.confidence };
    });
    setLocalFields(map);
    // Load file preview – retry a few times if file not yet uploaded
    const loadFile = async (retries = 5): Promise<void> => {
      const res = await fetch(`/api/invoices/${active.id}/file`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setFileUrl({ url, type: blob.type });
      } else if (retries > 0) {
        await new Promise(r => setTimeout(r, 1000));
        loadFile(retries - 1);
      }
    };
    loadFile();
  }, [active?.id]); // eslint-disable-line

  async function deleteInvoice(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this invoice? This action cannot be undone.")) return;
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    if (activeId === id) setActiveId(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      // Create local preview URL immediately
      const url = URL.createObjectURL(file);
      setFileUrl({ url, type: file.type });

      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/invoices", { method: "POST", body: fd });
      if (!res.ok) continue;
      const invoice: Invoice = await res.json();
      setInvoices((prev) => [{ ...invoice, invoice_fields: [] }, ...prev]);
      setActiveId(invoice.id);
      setProcessing((p) => new Set(p).add(invoice.id));

      const fd2 = new FormData();
      fd2.append("file", file);
      fd2.append("invoiceId", invoice.id);
      const extRes = await fetch("/api/extract", { method: "POST", body: fd2 });
      setProcessing((p) => { const s = new Set(p); s.delete(invoice.id); return s; });
      if (extRes.ok) {
        const fieldsRes = await fetch(`/api/invoices`);
        if (fieldsRes.ok) {
          const all: Invoice[] = await fieldsRes.json();
          setInvoices(all);
          const updated = all.find((i) => i.id === invoice.id);
          if (updated) {
            const map: Record<string, { value: string; source: string; confidence: string | null }> = {};
            updated.invoice_fields.forEach((f) => {
              map[f.field_key] = { value: f.field_value ?? "", source: f.source, confidence: f.confidence };
            });
            setLocalFields(map);
            setActiveId(invoice.id);
          }
        }
      }
    }
  }

  async function saveField(invoiceId: string, fieldKey: string, value: string) {
    setLocalFields((prev) => ({ ...prev, [fieldKey]: { value, source: "manual", confidence: null } }));
    await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldKey, fieldValue: value }),
    });
    await loadInvoices();
  }

  async function handleExport() {
    if (!active) return;
    const res = await fetch(`/api/invoices/${active.id}`, { method: "POST" });
    if (!res.ok) return;
    const { payload } = await res.json();
    setExportPayload(payload);
    setShowExport(true);
    await loadInvoices();
  }

  function downloadJSON() {
    if (!exportPayload || !active) return;
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `digitoll_${active.file_name.replace(/\.[^.]+$/, "")}.json`;
    a.click();
  }

  function copyJSON() {
    if (!exportPayload) return;
    navigator.clipboard.writeText(JSON.stringify(exportPayload, null, 2));
    setCopyOk(true);
    setTimeout(() => setCopyOk(false), 2000);
  }

  const valueMap: Record<string, string | null> = {};
  if (active) {
    FIELDS.forEach((f) => { valueMap[f.key] = localFields[f.key]?.value ?? null; });
    SAD_FIELDS.forEach((f) => { valueMap[`sad_${f.box}`] = localFields[`sad_${f.box}`]?.value ?? null; });
  }
  const comp = active
    ? mode === "digitoll"
      ? calcCompletion(valueMap)
      : calcSADCompletion(valueMap)
    : { filled: 0, total: 0, pct: 0 };
  const isReady = comp.pct === 100;

  type FieldDef = typeof FIELDS[number];
  const rows: (FieldDef | [FieldDef, FieldDef])[] = [];
  let i = 0;
  while (i < FIELDS.length) {
    const f = FIELDS[i];
    if (f.half === "left" && i + 1 < FIELDS.length && FIELDS[i + 1].half === "right") {
      rows.push([f, FIELDS[i + 1]]); i += 2;
    } else { rows.push(f); i++; }
  }

  function renderSADField(f: typeof SAD_FIELDS[number]) {
    const key = `sad_${f.box}`;
    const fd = localFields[key];
    const val = fd?.value ?? "";
    const conf = fd?.confidence ?? null;
    const isManual = fd?.source === "manual";
    const isEmpty = !val.trim();
    const showMissing = f.required && isEmpty && active && !processing.has(active.id);
    let cls = "field-input";
    if (showMissing) cls += " missing";
    else if (isManual) cls += " manual";
    else if (val) cls += " ai-filled";

    let badge = null;
    if (isManual) badge = <span className="conf-badge conf-manual">Manual</span>;
    else if (conf === "high") badge = <span className="conf-badge conf-high">High confidence</span>;
    else if (conf === "med") badge = <span className="conf-badge conf-med">Medium</span>;
    else if (conf === "low") badge = <span className="conf-badge conf-low">Low confidence</span>;

    return (
      <div className="field-row" key={key}>
        <div className="field-header">
          <span className="field-label">
            <span className="sad-box-label">Box {f.box} </span>
            {f.label}
            {f.required && <span className="req-mark">*</span>}
            {!f.required && <span className="opt-mark">(optional)</span>}
          </span>
          {badge}
        </div>
        <input
          className={cls}
          value={val}
          placeholder={f.placeholder ?? ""}
          title={f.description}
          onChange={(e) => {
            setLocalFields((prev) => ({ ...prev, [key]: { value: e.target.value, source: "manual", confidence: null } }));
          }}
          onBlur={(e) => {
            if (active) saveField(active.id, key, e.target.value);
          }}
        />
        {showMissing && <div className="missing-msg">Required — please fill in this field</div>}
      </div>
    );
  }

  function renderField(f: typeof FIELDS[number]) {
    const fd = localFields[f.key];
    const val = fd?.value ?? "";
    const conf = fd?.confidence ?? null;
    const isManual = fd?.source === "manual";
    const isEmpty = !val.trim();
    const showMissing = f.required && isEmpty && active && !processing.has(active.id);
    let cls = "field-input";
    if (showMissing) cls += " missing";
    else if (isManual) cls += " manual";
    else if (val) cls += " ai-filled";

    let badge = null;
    if (isManual) badge = <span className="conf-badge conf-manual">Manual</span>;
    else if (conf === "high") badge = <span className="conf-badge conf-high">High confidence</span>;
    else if (conf === "med") badge = <span className="conf-badge conf-med">Medium</span>;
    else if (conf === "low") badge = <span className="conf-badge conf-low">Low confidence</span>;

    return (
      <div className="field-row" key={f.key}>
        <div className="field-header">
          <span className="field-label">
            {f.label}
            {f.required && <span className="req-mark">*</span>}
            {f.stronglyRecommended && <span className="rec-mark">(recommended)</span>}
            {!f.required && !f.stronglyRecommended && <span className="opt-mark">(optional)</span>}
          </span>
          {badge}
        </div>
        <input
          className={cls}
          value={val}
          placeholder={f.placeholder ?? ""}
          onChange={(e) => {
            setLocalFields((prev) => ({ ...prev, [f.key]: { value: e.target.value, source: "manual", confidence: null } }));
          }}
          onBlur={(e) => {
            if (active) saveField(active.id, f.key, e.target.value);
          }}
        />
        {showMissing && <div className="missing-msg">Required — please fill in this field</div>}
      </div>
    );
  }

  let lastSection = "";

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-title">Invoices</span>
          <button className="btn btn-upload" onClick={() => fileInput.current?.click()}>+ Upload</button>
        </div>
        <div
          className="upload-zone"
          onClick={() => fileInput.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={dragOver ? { borderColor: "var(--blue)", background: "var(--bg-info)" } : {}}
        >
          <div className="upload-zone-icon">📄</div>
          <div className="upload-zone-txt">Drop files here or click to upload</div>
          <div className="upload-zone-sub">PDF, PNG, JPG</div>
        </div>
        <div className="invoice-list">
          {invoices.map((inv) => {
            const isProc = processing.has(inv.id);
            const pct = inv.completion_pct;
            const color = progressColor(pct);
            return (
              <div key={inv.id} className={`inv-card${activeId === inv.id ? " active" : ""}`} onClick={() => setActiveId(inv.id)}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
                  <div className="inv-name" title={inv.file_name} style={{ flex: 1 }}>{inv.file_name}</div>
                  <button
                    onClick={(e) => deleteInvoice(inv.id, e)}
                    title="Remove invoice"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: 14, padding: "0 2px", lineHeight: 1, flexShrink: 0 }}
                  >✕</button>
                </div>
                <div className="inv-meta">{fmtSize(inv.file_size)} · {fmtDate(inv.created_at)}</div>
                {isProc ? (
                  <div style={{ fontSize: 11, color: "var(--blue)", display: "flex", alignItems: "center", gap: 5 }}>
                    <span className="spinner" /> Extracting data...
                  </div>
                ) : (
                  <div className="inv-progress">
                    <div className="inv-status-dot" style={{ background: color }} />
                    <div className="prog-bar-bg"><div className="prog-bar-fill" style={{ width: pct + "%", background: color }} /></div>
                    <div className="prog-pct" style={{ color }}>{pct}%</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <input ref={fileInput} type="file" style={{ display: "none" }} accept=".pdf,.png,.jpg,.jpeg" multiple onChange={(e) => handleFiles(e.target.files)} />
      </div>

      <div className="main">
        {!active ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Select an invoice to review</span>
          </div>
        ) : (
          <>
            <div className="main-header">
              <div className="doc-title" title={active.file_name}>{active.file_name}</div>
              <div className="header-actions">
                <div className="mode-toggle">
                  <button className={`mode-btn${mode === "digitoll" ? " active" : ""}`} onClick={() => setMode("digitoll")}>Digitoll</button>
                  <button className={`mode-btn sad${mode === "sad" ? " active" : ""}`} onClick={() => setMode("sad")}>Full Declaration</button>
                </div>
                <StatusBadge status={active.status} />
                {comp.total - comp.filled > 0 && (
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{comp.total - comp.filled} fields missing</span>
                )}
                <button className={`btn${isReady ? " btn-primary" : ""}`} disabled={!isReady} onClick={handleExport}>
                  Export to Digitoll
                </button>
              </div>
            </div>
            <div className="completion-banner">
              <span className="banner-label">Completion</span>
              <div className="banner-bar-bg">
                <div className="banner-bar-fill" style={{ width: comp.pct + "%", background: progressColor(comp.pct) }} />
              </div>
              <span className="banner-count" style={{ color: progressColor(comp.pct) }}>{comp.filled} / {comp.total} required fields</span>
            </div>
            <div className="split-view">
              {/* Document preview */}
              <div className="doc-preview">
                <div className="doc-preview-header">Source Document</div>
                <div className="doc-preview-body">
                  {fileUrl ? (
                    fileUrl.type === "application/pdf" ? (
                      <iframe src={fileUrl.url} title="Invoice preview" />
                    ) : (
                      <img src={fileUrl.url} alt="Invoice preview" />
                    )
                  ) : (
                    <div className="doc-preview-empty">Upload an invoice to preview it here</div>
                  )}
                </div>
              </div>
              {/* Form panel */}
              <div className="form-panel">
                <div className="form-area">
                  {processing.has(active.id) ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-secondary)", paddingTop: 24 }}>
                      <span className="spinner" style={{ width: 16, height: 16 }} />
                      <span>Extracting data from invoice...</span>
                    </div>
                  ) : mode === "digitoll" ? (
                    rows.map((row) => {
                      if (Array.isArray(row)) {
                        const sec = row[0].section;
                        const showSec = sec !== lastSection;
                        lastSection = sec;
                        return (
                          <div key={row[0].key}>
                            {showSec && <div className="section-label">{sec}</div>}
                            <div className="two-col">{row.map(renderField)}</div>
                          </div>
                        );
                      } else {
                        const showSec = row.section !== lastSection;
                        lastSection = row.section;
                        return (
                          <div key={row.key}>
                            {showSec && <div className="section-label">{row.section}</div>}
                            {renderField(row)}
                          </div>
                        );
                      }
                    })
                  ) : (
                    // SAD form – group by width
                    (() => {
                      const elements: React.ReactNode[] = [];
                      // Items table at the top of SAD form
                      elements.push(
                        <ItemsTable
                          key="items-table"
                          invoiceId={active.id}
                          onAggregated={loadInvoices}
                        />
                      );
                      let j = 0;
                      while (j < SAD_FIELDS.length) {
                        const f = SAD_FIELDS[j];
                        if (f.width === "full") {
                          elements.push(<div key={f.box}>{renderSADField(f)}</div>);
                          j++;
                        } else if (f.width === "half" && j + 1 < SAD_FIELDS.length && SAD_FIELDS[j + 1].width === "half") {
                          const f2 = SAD_FIELDS[j + 1];
                          elements.push(
                            <div key={f.box} className="two-col">
                              {renderSADField(f)}{renderSADField(f2)}
                            </div>
                          );
                          j += 2;
                        } else if (f.width === "third" && j + 2 < SAD_FIELDS.length && SAD_FIELDS[j + 1].width === "third" && SAD_FIELDS[j + 2].width === "third") {
                          const f2 = SAD_FIELDS[j + 1];
                          const f3 = SAD_FIELDS[j + 2];
                          elements.push(
                            <div key={f.box} className="three-col">
                              {renderSADField(f)}{renderSADField(f2)}{renderSADField(f3)}
                            </div>
                          );
                          j += 3;
                        } else {
                          elements.push(<div key={f.box}>{renderSADField(f)}</div>);
                          j++;
                        }
                      }
                      return elements;
                    })()
                  )}
                </div>
                <div className="legend">
                  <div className="legend-item"><div className="legend-line" style={{ background: "var(--blue)" }} /> AI suggestion</div>
                  <div className="legend-item"><div className="legend-line" style={{ background: "var(--green)" }} /> Manually edited</div>
                  <div className="legend-item"><div className="legend-line" style={{ background: "var(--red)" }} /> Required field missing</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {showExport && exportPayload && active && (
        <div className="modal-overlay" onClick={() => setShowExport(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Export to Digitoll</span>
              <div className="modal-actions">
                {copyOk && <span className="copy-ok">Copied!</span>}
                <button className="btn" onClick={copyJSON}>Copy JSON</button>
                <button className="btn btn-primary" onClick={downloadJSON}>Download .json</button>
                <button className="btn" onClick={() => setShowExport(false)}>Close</button>
              </div>
            </div>
            <div className="modal-body">
              <div className="modal-summary">
                {[
                  ["Exporter", valueMap["exp_name"]],
                  ["Importer", valueMap["imp_name"]],
                  ["Total Value", valueMap["totalValue"] ? `${valueMap["totalValue"]} ${valueMap["currency"] ?? ""}` : "–"],
                  ["Destination", valueMap["destinationCountry"] ?? "–"],
                ].map(([label, val]) => (
                  <div key={label} className="summary-cell">
                    <div className="cell-label">{label}</div>
                    <div className="cell-val">{val || "–"}</div>
                  </div>
                ))}
              </div>
              {[
                { title: "Exporter", keys: ["exp_name", "exp_address"] },
                { title: "Importer", keys: ["imp_name", "imp_address", "imp_id"] },
                { title: "Goods", keys: ["totalValue", "currency", "totalNetWeight", "totalGrossWeight", "hsCode", "originCountry"] },
                { title: "Customs", keys: ["destinationCountry", "customsValue", "procedureCode"] },
                { title: "Transport", keys: ["modeOfTransport", "incoterm", "incotermPlace", "transportRef"] },
              ].map((sec) => (
                <div className="modal-section" key={sec.title}>
                  <div className="modal-section-title">{sec.title}</div>
                  <div className="fields-grid2">
                    {sec.keys.map((k) => {
                      const v = valueMap[k];
                      return (
                        <div className="fi" key={k}>
                          <div className="fi-key">{k}</div>
                          <div className={`fi-val${!v ? " fi-null" : ""}`}>{v || "–"}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="json-block">
                <div className="json-block-label">Raw JSON</div>
                <pre className="json-pre" dangerouslySetInnerHTML={{ __html: syntaxHL(exportPayload) }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
