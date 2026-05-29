"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Invoice {
  id: string;
  file_name: string;
  file_size: number;
  status: string;
  completion_pct: number;
  created_at: string;
  transport_id: string | null;
  shipment_id: string | null;
  invoice_fields: { field_key: string; field_value: string | null; confidence: string | null; source: string }[];
}

interface Transport {
  id: string;
  reference: string;
  status: string;
}

type ViewMode = "table" | "split";
type Destination = "digitoll" | "sad" | "cms" | null;
type CreateType = "transport" | "shipment" | null;

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
  if (pct >= 60) return "#F79009";
  return "#F04438";
}

function docStatus(inv: Invoice): { label: string; color: string; bg: string; tip: string } {
  if (inv.transport_id || inv.shipment_id)
    return { label: "Processed", color: "#027A48", bg: "#ECFDF3", tip: "Linked to a transport or shipment" };
  if (inv.completion_pct >= 60)
    return { label: "Ready", color: "#B54708", bg: "#FFFAEB", tip: "Data extracted — ready to use" };
  return { label: "Needs review", color: "#B42318", bg: "#FEF3F2", tip: "Extraction incomplete — review required" };
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function IncomingDocuments() {
  const router = useRouter();

  // Data
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  // View state
  const [view, setView] = useState<ViewMode>("table");
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [processing, setProcessing] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>("application/pdf");

  // Create flow
  const [destination, setDestination] = useState<Destination>(null);
  const [createType, setCreateType] = useState<CreateType>(null);
  const [linkTransportId, setLinkTransportId] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCmsAnim, setShowCmsAnim] = useState(false);

  // CMS animation state
  const [cmsStep, setCmsStep] = useState(0);

  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [inv, tr] = await Promise.all([
      fetch("/api/invoices").then(r => r.json()),
      fetch("/api/transports").then(r => r.json()),
    ]);
    if (Array.isArray(inv)) setInvoices(inv);
    if (Array.isArray(tr)) setTransports(tr);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load file preview when activeInvoice changes
  useEffect(() => {
    if (!activeInvoice) return;
    setFileUrl(null);
    fetch(`/api/invoices/${activeInvoice.id}/file`).then(async res => {
      if (res.ok) {
        const blob = await res.blob();
        setFileUrl(URL.createObjectURL(blob));
        setFileType(blob.type);
      }
    });
  }, [activeInvoice?.id]);

  function getField(inv: Invoice, key: string) {
    return inv.invoice_fields?.find(f => f.field_key === key)?.field_value ?? null;
  }

  // ── Upload handler ────────────────────────────────────────────────────────
  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Immediate preview
    setFileUrl(URL.createObjectURL(file));
    setFileType(file.type);
    setDestination(null);
    setCreateType(null);
    setView("split");
    setProcessing(true);

    // Upload
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/invoices", { method: "POST", body: fd });
    if (!res.ok) { setProcessing(false); return; }
    const invoice: Invoice = await res.json();

    // Extract
    const fd2 = new FormData();
    fd2.append("file", file);
    fd2.append("invoiceId", invoice.id);
    await fetch("/api/extract", { method: "POST", body: fd2 });

    // Reload
    const allRes = await fetch("/api/invoices");
    if (allRes.ok) {
      const all: Invoice[] = await allRes.json();
      setInvoices(all);
      const updated = all.find(i => i.id === invoice.id);
      if (updated) setActiveInvoice(updated);
    }
    setProcessing(false);
  }

  function openExisting(inv: Invoice) {
    setActiveInvoice(inv);
    setDestination(null);
    setCreateType(null);
    setView("split");
  }

  function discardAndReturn() {
    setView("table");
    setActiveInvoice(null);
    setFileUrl(null);
    setDestination(null);
    setCreateType(null);
    setShowCmsAnim(false);
    setCmsStep(0);
    load();
  }

  // ── CMS animation ─────────────────────────────────────────────────────────
  function triggerCms() {
    setShowCmsAnim(true);
    setCmsStep(1);
    setTimeout(() => setCmsStep(2), 1200);
    setTimeout(() => setCmsStep(3), 2400);
    setTimeout(() => {
      discardAndReturn();
    }, 3800);
  }

  // ── Create transport/shipment ─────────────────────────────────────────────
  async function handleCreate() {
    if (!activeInvoice || !createType) return;
    setSaving(true);

    const body = createType === "transport" ? {
      reference: `TR-${Date.now().toString().slice(-4)}`,
      border_crossing: getField(activeInvoice, "destinationCountry") ?? "",
      transport_mode: getField(activeInvoice, "modeOfTransport") ?? "Road",
      carrier: getField(activeInvoice, "transportRef") ?? "",
    } : {
      reference: `SH-${Date.now().toString().slice(-4)}`,
      actor: getField(activeInvoice, "exp_name") ?? "",
      transport_id: linkTransportId || null,
    };

    const res = await fetch(`/api/${createType}s`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const record = await res.json();
      await fetch(`/api/invoices/${activeInvoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [`${createType}_id`]: record.id }),
      });
      setSaving(false);
      discardAndReturn();
      router.push("/digitoll");
    } else {
      setSaving(false);
    }
  }

  // ── Filtered invoices ─────────────────────────────────────────────────────
  const filtered = invoices.filter(inv => {
    if (search && !inv.file_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "review") return docStatus(inv).label === "Needs review";
    if (filter === "ready") return docStatus(inv).label === "Ready";
    if (filter === "processed") return docStatus(inv).label === "Processed";
    return true;
  });

  const reviewCount    = invoices.filter(i => docStatus(i).label === "Needs review").length;
  const readyCount     = invoices.filter(i => docStatus(i).label === "Ready").length;
  const processedCount = invoices.filter(i => docStatus(i).label === "Processed").length;

  // ── Styles ────────────────────────────────────────────────────────────────
  const btnPri: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, background: "#0B1F3A", color: "#fff", fontSize: 12.5, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit" };
  const btnSec: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, background: "#fff", color: "#344054", fontSize: 12.5, fontWeight: 500, border: "1px solid #D0D5DD", cursor: "pointer", fontFamily: "inherit" };
  const btnDanger: React.CSSProperties = { ...btnPri, background: "#D92D20" };
  const fBtn = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 13px", borderRadius: 20, border: `1px solid ${active ? "#0B1F3A" : "#D0D5DD"}`, background: active ? "#0B1F3A" : "#fff", color: active ? "#fff" : "#344054", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" });
  const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #D0D5DD", borderRadius: 8, fontSize: 13, color: "#101828", fontFamily: "inherit", outline: "none" };

  const fields = [
    ["Exporter", "exp_name"], ["Importer", "imp_name"],
    ["Total value", "totalValue"], ["Currency", "currency"],
    ["Incoterm", "incoterm"], ["Place", "incotermPlace"],
    ["Destination", "destinationCountry"], ["Customs value", "customsValue"],
    ["Net weight", "totalNetWeight"], ["Gross weight", "totalGrossWeight"],
    ["Transport mode", "modeOfTransport"], ["HS Code", "hsCode"],
  ];

  // ── TABLE VIEW ────────────────────────────────────────────────────────────
  const TableView = (
    <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: "#101828", margin: 0, marginBottom: 3 }}>Incoming Documents</h1>
          <p style={{ fontSize: 12, color: "#667085", margin: 0 }}>Uploaded invoices ready for Digitoll or CMS processing</p>
        </div>
        <button style={btnSec} onClick={() => fileInput.current?.click()}>
          ↑ Upload document
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Total documents", val: invoices.length, sub: "All time", color: "#101828" },
          { label: "Needs review",    val: reviewCount,    sub: "Action required",    color: "#B42318" },
          { label: "Ready to use",    val: readyCount,     sub: "Awaiting processing", color: "#B54708" },
          { label: "Processed",       val: processedCount, sub: "Linked to record",   color: "#027A48" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#667085", fontWeight: 500, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "#98A2B3", marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Upload zone */}
      <div
        onClick={() => fileInput.current?.click()}
        onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = "#84ADFF"; (e.currentTarget as HTMLElement).style.background = "#F5F8FF"; }}
        onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#D0D5DD"; (e.currentTarget as HTMLElement).style.background = "#FAFAFA"; }}
        onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = "#D0D5DD"; (e.currentTarget as HTMLElement).style.background = "#FAFAFA"; handleFiles(e.dataTransfer.files); }}
        style={{ border: "2px dashed #D0D5DD", borderRadius: 10, padding: "20px 24px", textAlign: "center", background: "#FAFAFA", marginBottom: 14, cursor: "pointer", transition: "all .15s" }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>📄</div>
        <div style={{ fontSize: 13, color: "#344054", fontWeight: 500 }}>Drop files here or <span style={{ color: "#175CD3" }}>click to upload</span></div>
        <div style={{ fontSize: 11, color: "#98A2B3", marginTop: 3 }}>PDF, PNG, JPG — extraction starts immediately</div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {([ ["all","All",invoices.length], ["review","Needs review",reviewCount], ["ready","Ready",readyCount], ["processed","Processed",processedCount] ] as [string,string,number][]).map(([key,label,count]) => (
          <button key={key} onClick={() => setFilter(key)} style={fBtn(filter === key)}>
            {label}
            <span style={{ background: filter === key ? "rgba(255,255,255,0.2)" : key === "review" && count > 0 ? "#FEE4E2" : "#F2F4F7", color: filter === key ? "#fff" : key === "review" && count > 0 ? "#B42318" : "#667085", borderRadius: 10, padding: "0 6px", fontSize: 10, fontWeight: 600 }}>{count}</span>
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", border: "1px solid #D0D5DD", borderRadius: 8, background: "#fff", width: 220 }}>
          <span style={{ fontSize: 16, color: "#98A2B3" }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." style={{ border: "none", outline: "none", fontSize: 12, color: "#344054", fontFamily: "inherit", width: "100%", background: "transparent" }} />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" as const }}>
          <colgroup>
            <col style={{ width: "30%" }} /><col style={{ width: "6%" }} /><col style={{ width: "7%" }} />
            <col style={{ width: "11%" }} /><col style={{ width: "12%" }} /><col style={{ width: "13%" }} />
            <col style={{ width: "11%" }} /><col style={{ width: "8%" }} /><col style={{ width: 36 }} />
          </colgroup>
          <thead style={{ background: "#F9FAFB", borderBottom: "1px solid #E4E7EC" }}>
            <tr>{["Document","Type","Size","Uploaded","Extracted by","Status","Completion","Action",""].map((h,i) => (
              <th key={i} style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#667085", letterSpacing: ".04em", textTransform: "uppercase" as const }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map(inv => {
              const st = docStatus(inv);
              return (
                <tr key={inv.id} onClick={() => openExisting(inv)}
                  style={{ borderBottom: "1px solid #F2F4F7", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F9FAFB")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "10px 12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#344054", fontSize: 12.5 }}>
                      <span style={{ color: inv.file_name.endsWith(".pdf") ? "#D92D20" : "#667085", fontSize: 17 }}>📄</span>
                      {inv.file_name}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#667085", fontSize: 12.5 }}>{inv.file_name.endsWith(".pdf") ? "PDF" : "IMG"}</td>
                  <td style={{ padding: "10px 12px", color: "#98A2B3", fontSize: 12 }}>{fmtSize(inv.file_size)}</td>
                  <td style={{ padding: "10px 12px", color: "#667085", fontSize: 11.5 }}>{fmtDate(inv.created_at)}</td>
                  <td style={{ padding: "10px 12px", color: "#667085", fontSize: 12 }}>AI (Claude)</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span title={st.tip} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, fontSize: 11.5, fontWeight: 500, background: st.bg, color: st.color }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.color, flexShrink: 0 }} />
                      {st.label}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 5, background: "#F2F4F7", borderRadius: 3, overflow: "hidden", maxWidth: 80 }}>
                        <div style={{ height: "100%", background: barColor(inv.completion_pct), width: `${inv.completion_pct}%`, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, color: "#667085", minWidth: 28 }}>{inv.completion_pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span onClick={e => { e.stopPropagation(); openExisting(inv); }} style={{ color: "#175CD3", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                      {docStatus(inv).label === "Processed" ? "View" : "Use data"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 4px" }}>
                    <button onClick={e => { e.stopPropagation(); openExisting(inv); }} style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", color: "#98A2B3", fontSize: 18 }} aria-label="More">⋯</button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "#98A2B3", fontSize: 13 }}>No documents found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── SPLIT VIEW ─────────────────────────────────────────────────────────────
  const SplitView = (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Left: document preview */}
      <div style={{ width: "48%", borderRight: "1px solid #E4E7EC", display: "flex", flexDirection: "column", background: "#F9FAFB" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #E4E7EC", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#344054" }}>Source Document</span>
          <button onClick={discardAndReturn} style={{ ...btnSec, padding: "4px 10px", fontSize: 11.5, color: "#667085" }}>
            ✕ Discard
          </button>
        </div>
        <div style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {processing ? (
            <div style={{ textAlign: "center", color: "#667085" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Extracting data with AI…</div>
              <div style={{ fontSize: 11, color: "#98A2B3", marginTop: 6 }}>This usually takes 8–15 seconds</div>
            </div>
          ) : fileUrl ? (
            fileType === "application/pdf" ? (
              <iframe src={fileUrl} style={{ width: "100%", height: "100%", border: "none" }} title="Invoice preview" />
            ) : (
              <img src={fileUrl} alt="Invoice preview" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            )
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
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #E4E7EC", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#101828" }}>{activeInvoice?.file_name ?? "New document"}</span>
            {activeInvoice && (
              <span style={{ marginLeft: 10, fontSize: 11.5, color: "#667085" }}>{activeInvoice.completion_pct}% complete</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {activeInvoice && (
              <div style={{ width: 120, height: 4, background: "#F2F4F7", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${activeInvoice.completion_pct}%`, background: barColor(activeInvoice.completion_pct), transition: "width .3s" }} />
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {processing ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#667085", padding: "24px 0" }}>
              <span style={{ fontSize: 18 }}>⏳</span>
              <span style={{ fontSize: 13 }}>AI is extracting data…</span>
            </div>
          ) : (
            <>
              {/* Extracted fields */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 10 }}>Extracted fields</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {fields.map(([label, key]) => {
                    const val = activeInvoice ? getField(activeInvoice, key) : null;
                    const conf = activeInvoice?.invoice_fields?.find(f => f.field_key === key)?.confidence;
                    return (
                      <div key={key} style={{ background: val ? "#fff" : "#FEF3F2", border: `1px solid ${val ? "#E4E7EC" : "#FECDCA"}`, borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 10.5, color: "#667085", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                          <span>{label}</span>
                          {conf && <span style={{ color: conf === "high" ? "#027A48" : conf === "med" ? "#B54708" : "#98A2B3", fontSize: 10 }}>{conf}</span>}
                        </div>
                        <div style={{ fontSize: 12.5, color: val ? "#101828" : "#98A2B3", fontWeight: val ? 500 : 400, fontStyle: val ? "normal" : "italic" }}>
                          {val ?? "Not extracted"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Destination choice */}
              {!destination && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 12 }}>Where do you want to send this data?</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {[
                      { key: "digitoll" as Destination, icon: "🚛", label: "Digitoll", sub: "Create Transport or Shipment for Norwegian Customs" },
                      { key: "sad" as Destination, icon: "📋", label: "Full Declaration", sub: "Create a full SAD customs declaration" },
                      { key: "cms" as Destination, icon: "⬡", label: "CMS", sub: "Send extracted data to CMS system" },
                    ].map(opt => (
                      <div key={opt.key} onClick={() => setDestination(opt.key)}
                        style={{ border: "1px solid #E4E7EC", borderRadius: 10, padding: 14, cursor: "pointer", textAlign: "center" as const, transition: "all .15s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#84ADFF"; (e.currentTarget as HTMLElement).style.background = "#F5F8FF"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E4E7EC"; (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                        <div style={{ fontSize: 26, marginBottom: 8 }}>{opt.icon}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#101828", marginBottom: 4 }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: "#667085", lineHeight: 1.4 }}>{opt.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Digitoll: choose transport or shipment */}
              {destination === "digitoll" && !createType && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <button onClick={() => setDestination(null)} style={{ ...btnSec, padding: "4px 10px", fontSize: 11.5 }}>← Back</button>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>Create in Digitoll</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      { type: "transport" as CreateType, icon: "🚛", label: "New Transport", sub: "Create a transport declaration — can link multiple shipments" },
                      { type: "shipment" as CreateType, icon: "📦", label: "New Shipment", sub: "Create a shipment record — link to an existing transport" },
                    ].map(opt => (
                      <div key={opt.type} onClick={() => setCreateType(opt.type)}
                        style={{ border: "1px solid #E4E7EC", borderRadius: 10, padding: 16, cursor: "pointer", transition: "all .15s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#84ADFF"; (e.currentTarget as HTMLElement).style.background = "#F5F8FF"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E4E7EC"; (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                        <div style={{ fontSize: 26, marginBottom: 8 }}>{opt.icon}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#101828", marginBottom: 4 }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: "#667085", lineHeight: 1.4 }}>{opt.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shipment: link to transport */}
              {destination === "digitoll" && createType === "shipment" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <button onClick={() => setCreateType(null)} style={{ ...btnSec, padding: "4px 10px", fontSize: 11.5 }}>← Back</button>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>Link to transport (optional)</span>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "#344054", marginBottom: 5 }}>Select transport</label>
                    <select value={linkTransportId} onChange={e => setLinkTransportId(e.target.value)} style={inp}>
                      <option value="">— Send as own transport —</option>
                      {transports.map(t => <option key={t.id} value={t.id}>{t.reference}</option>)}
                    </select>
                  </div>
                  <button onClick={handleCreate} disabled={saving} style={btnPri}>
                    {saving ? "Creating…" : "Confirm & create shipment"}
                  </button>
                </div>
              )}

              {/* Transport: confirm */}
              {destination === "digitoll" && createType === "transport" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <button onClick={() => setCreateType(null)} style={{ ...btnSec, padding: "4px 10px", fontSize: 11.5 }}>← Back</button>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>Confirm transport creation</span>
                  </div>
                  <div style={{ background: "#EFF8FF", border: "1px solid #B2CCFF", borderRadius: 8, padding: "12px 14px", marginBottom: 14, fontSize: 12.5, color: "#175CD3" }}>
                    A new transport will be created with the extracted data. You can link shipments to it from the Digitoll Start page.
                  </div>
                  <button onClick={handleCreate} disabled={saving} style={btnPri}>
                    {saving ? "Creating…" : "Confirm & create transport"}
                  </button>
                </div>
              )}

              {/* SAD */}
              {destination === "sad" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <button onClick={() => setDestination(null)} style={{ ...btnSec, padding: "4px 10px", fontSize: 11.5 }}>← Back</button>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>Full SAD Declaration</span>
                  </div>
                  <div style={{ background: "#FFFAEB", border: "1px solid #FEDF89", borderRadius: 8, padding: "12px 14px", marginBottom: 14, fontSize: 12.5, color: "#B54708" }}>
                    Open the invoice reader to review all SAD fields before submitting.
                  </div>
                  <button onClick={() => router.push("/")} style={btnPri}>Open invoice reader →</button>
                </div>
              )}

              {/* CMS */}
              {destination === "cms" && !showCmsAnim && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <button onClick={() => setDestination(null)} style={{ ...btnSec, padding: "4px 10px", fontSize: 11.5 }}>← Back</button>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>Send to CMS</span>
                  </div>
                  <div style={{ background: "#ECFDF3", border: "1px solid #A9EFC5", borderRadius: 8, padding: "12px 14px", marginBottom: 14, fontSize: 12.5, color: "#027A48" }}>
                    The extracted data will be sent as JSON to your CMS system.
                  </div>
                  <button onClick={triggerCms} style={btnPri}>Confirm & send to CMS</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  // ── CMS animation overlay ─────────────────────────────────────────────────
  const CmsOverlay = showCmsAnim && (
    <div style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.6)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px 48px", textAlign: "center", maxWidth: 360, width: "100%" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>
          {cmsStep === 1 ? "📤" : cmsStep === 2 ? "🔄" : "✅"}
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#101828", marginBottom: 8 }}>
          {cmsStep === 1 ? "Preparing data…" : cmsStep === 2 ? "Sending to CMS…" : "Data received by CMS!"}
        </div>
        <div style={{ fontSize: 13, color: "#667085" }}>
          {cmsStep === 1 ? "Serializing extracted fields to JSON" : cmsStep === 2 ? "Transmitting to your CMS endpoint" : "Successfully processed — returning to overview"}
        </div>
        <div style={{ marginTop: 20, height: 4, background: "#F2F4F7", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", background: "#12B76A", width: cmsStep === 1 ? "33%" : cmsStep === 2 ? "66%" : "100%", transition: "width 1.1s ease-in-out", borderRadius: 3 }} />
        </div>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      {view === "table" ? TableView : SplitView}
      {CmsOverlay}
      <input ref={fileInput} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
    </div>
  );
}