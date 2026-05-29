"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Invoice {
  id: string;
  file_name: string;
  file_size: number;
  status: string;
  completion_pct: number;
  created_at: string;
  transport_id: string | null;
  shipment_id: string | null;
  invoice_fields: { field_key: string; field_value: string | null }[];
}

interface Transport {
  id: string;
  reference: string;
}

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

function docStatus(inv: Invoice): { label: string; color: string; bg: string; tip: string } {
  if (inv.transport_id || inv.shipment_id) return { label: "Processed", color: "#027A48", bg: "#ECFDF3", tip: "Linked to a transport or shipment" };
  if (inv.completion_pct >= 60)            return { label: "Ready",     color: "#B54708", bg: "#FFFAEB", tip: "Data extracted — create a transport or shipment" };
  return                                          { label: "Needs review", color: "#B42318", bg: "#FEF3F2", tip: "Extraction incomplete — review required" };
}

export default function IncomingDocuments() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [modal, setModal] = useState<"detail" | "create" | null>(null);
  const [creating, setCreating] = useState<"transport" | "shipment" | null>(null);
  const [saving, setSaving] = useState(false);
  const [transportId, setTransportId] = useState("");

  const load = useCallback(async () => {
    const [inv, tr] = await Promise.all([
      fetch("/api/invoices").then(r => r.json()),
      fetch("/api/transports").then(r => r.json()),
    ]);
    if (Array.isArray(inv)) setInvoices(inv);
    if (Array.isArray(tr)) setTransports(tr);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = invoices.filter(inv => {
    if (search && !inv.file_name.toLowerCase().includes(search.toLowerCase())) return false;
    const s = docStatus(inv).label.toLowerCase();
    if (filter === "review")    return s === "needs review";
    if (filter === "ready")     return s === "ready";
    if (filter === "processed") return s === "processed";
    return true;
  });

  function getField(inv: Invoice, key: string) {
    return inv.invoice_fields?.find(f => f.field_key === key)?.field_value ?? null;
  }

  async function createFromDoc(type: "transport" | "shipment") {
    if (!selected) return;
    setSaving(true);

    const body = type === "transport" ? {
      reference:       `TR-${Date.now().toString().slice(-4)}`,
      border_crossing: getField(selected, "destinationCountry") ?? "",
      transport_mode:  getField(selected, "modeOfTransport") ?? "Road",
      carrier:         getField(selected, "transportRef") ?? "",
    } : {
      reference:    `SH-${Date.now().toString().slice(-4)}`,
      actor:        getField(selected, "exp_name") ?? "",
      transport_id: transportId || null,
    };

    const res = await fetch(`/api/${type}s`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    if (res.ok) {
      const record = await res.json();
      await fetch(`/api/invoices/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [`${type}_id`]: record.id }),
      });
      setSaving(false);
      setModal(null);
      load();
      router.push("/digitoll");
    } else {
      setSaving(false);
    }
  }

  const btnPri: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, background: "#0B1F3A", color: "#fff", fontSize: 12.5, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit" };
  const btnSec: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, background: "#fff", color: "#344054", fontSize: 12.5, fontWeight: 500, border: "1px solid #D0D5DD", cursor: "pointer", fontFamily: "inherit" };
  const fBtn = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 13px", borderRadius: 20, border: `1px solid ${active ? "#0B1F3A" : "#D0D5DD"}`, background: active ? "#0B1F3A" : "#fff", color: active ? "#fff" : "#344054", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" });

  const reviewCount    = invoices.filter(i => docStatus(i).label === "Needs review").length;
  const readyCount     = invoices.filter(i => docStatus(i).label === "Ready").length;
  const processedCount = invoices.filter(i => docStatus(i).label === "Processed").length;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 600, color: "#101828", margin: 0, marginBottom: 3 }}>Incoming Documents</h1>
            <p style={{ fontSize: 12, color: "#667085", margin: 0 }}>Uploaded invoices and documents ready for Digitoll processing</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btnSec} onClick={() => router.push("/")}>↑ Upload document</button>
            <button style={btnPri} onClick={() => { setSelected(null); setModal("create"); }}>＋ Create transport or shipment</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
          {[
            { label: "Total documents", val: invoices.length, sub: "All time", color: "#101828" },
            { label: "Needs review",    val: reviewCount,    sub: "Action required",             color: "#B42318" },
            { label: "Ready to use",    val: readyCount,     sub: "Awaiting transport/shipment",  color: "#B54708" },
            { label: "Processed",       val: processedCount, sub: "Linked to transport/shipment", color: "#027A48" },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "#667085", fontWeight: 500, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: s.color, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 11, color: "#98A2B3", marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {[["all","All",invoices.length],["review","Needs review",reviewCount],["ready","Ready",readyCount],["processed","Processed",processedCount]].map(([key,label,count]) => (
            <button key={key} onClick={() => setFilter(key as string)} style={fBtn(filter === key)}>
              {label}
              <span style={{ background: filter === key ? "rgba(255,255,255,0.2)" : key === "review" && (count as number) > 0 ? "#FEE4E2" : "#F2F4F7", color: filter === key ? "#fff" : key === "review" && (count as number) > 0 ? "#B42318" : "#667085", borderRadius: 10, padding: "0 6px", fontSize: 10, fontWeight: 600 }}>{count}</span>
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", border: "1px solid #D0D5DD", borderRadius: 8, background: "#fff", width: 220 }}>
            <span style={{ fontSize: 16, color: "#98A2B3" }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." style={{ border: "none", outline: "none", fontSize: 12, color: "#344054", fontFamily: "inherit", width: "100%", background: "transparent" }} />
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "28%" }} /><col style={{ width: "6%" }} /><col style={{ width: "7%" }} />
              <col style={{ width: "11%" }} /><col style={{ width: "11%" }} /><col style={{ width: "13%" }} />
              <col style={{ width: "12%" }} /><col style={{ width: "8%" }} /><col style={{ width: 36 }} />
            </colgroup>
            <thead style={{ background: "#F9FAFB", borderBottom: "1px solid #E4E7EC" }}>
              <tr>{["Document","Type","Size","Uploaded","Extracted by","Status","Completion","Action",""].map((h,i) => (
                <th key={i} style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#667085", letterSpacing: ".04em", textTransform: "uppercase" as const }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const st = docStatus(inv);
                const isProcessed = st.label === "Processed";
                return (
                  <tr key={inv.id} onClick={() => { setSelected(inv); setModal("detail"); }}
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
                      {isProcessed
                        ? <span onClick={e => { e.stopPropagation(); router.push("/digitoll"); }} style={{ color: "#175CD3", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>View</span>
                        : <span onClick={e => { e.stopPropagation(); setSelected(inv); setModal("create"); }} style={{ color: "#175CD3", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Use data</span>
                      }
                    </td>
                    <td style={{ padding: "10px 4px" }}>
                      <button onClick={e => { e.stopPropagation(); setSelected(inv); setModal("detail"); }} style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", color: "#98A2B3", fontSize: 18 }} aria-label="More">⋯</button>
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

      {/* Detail modal */}
      {modal === "detail" && selected && (() => {
        const st = docStatus(selected);
        const isProcessed = st.label === "Processed";
        const fields = [
          ["Exporter",    "exp_name"],    ["Importer",   "imp_name"],
          ["Total value", "totalValue"],  ["Currency",   "currency"],
          ["Incoterm",    "incoterm"],    ["Destination","destinationCountry"],
          ["Net weight",  "totalNetWeight"], ["Gross weight","totalGrossWeight"],
        ];
        return (
          <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: 560, maxHeight: "88vh", overflowY: "auto" }}>
              <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #E4E7EC", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: "#101828", margin: 0, marginBottom: 3 }}>{selected.file_name}</h3>
                  <p style={{ fontSize: 12, color: "#667085", margin: 0 }}>Uploaded {fmtDate(selected.created_at)} · {fmtSize(selected.file_size)}</p>
                </div>
                <button onClick={() => setModal(null)} style={{ width: 32, height: 32, border: "1px solid #E4E7EC", borderRadius: 8, background: "#fff", cursor: "pointer", color: "#667085", fontSize: 18 }}>✕</button>
              </div>
              <div style={{ padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: st.bg, border: `1px solid ${st.color}40`, borderRadius: 8, marginBottom: 18, fontSize: 12.5, color: st.color }}>
                  <strong>{st.label}</strong> — {st.tip}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 500, color: "#344054", marginBottom: 5 }}>Completion</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: "#F2F4F7", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", background: barColor(selected.completion_pct), width: `${selected.completion_pct}%` }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: barColor(selected.completion_pct) }}>{selected.completion_pct}%</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 500, color: "#344054", marginBottom: 5 }}>Linked record</div>
                    <div style={{ fontSize: 13, color: selected.transport_id || selected.shipment_id ? "#027A48" : "#98A2B3", fontStyle: selected.transport_id || selected.shipment_id ? "normal" : "italic" }}>
                      {selected.transport_id ? "Transport linked" : selected.shipment_id ? "Shipment linked" : "Not linked"}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 8, borderTop: "1px solid #F2F4F7", paddingTop: 14 }}>Extracted fields</div>
                {fields.map(([label, key]) => {
                  const val = getField(selected, key);
                  return (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F2F4F7" }}>
                      <span style={{ fontSize: 12, color: "#667085" }}>{label}</span>
                      <span style={{ fontSize: 12.5, color: val ? "#101828" : "#98A2B3", fontWeight: val ? 500 : 400, fontStyle: val ? "normal" : "italic" }}>{val ?? "Not extracted"}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: "14px 22px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button style={btnSec} onClick={() => setModal(null)}>Close</button>
                {!isProcessed && <button style={btnPri} onClick={() => setModal("create")}>Create transport / shipment</button>}
                {isProcessed && <button style={btnPri} onClick={() => { setModal(null); router.push("/digitoll"); }}>View in Digitoll</button>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Create modal */}
      {modal === "create" && (
        <div onClick={() => { setModal(null); setCreating(null); }} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: 480 }}>
            <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #E4E7EC", display: "flex", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "#101828", margin: 0, marginBottom: 3 }}>Create from document</h3>
                <p style={{ fontSize: 12, color: "#667085", margin: 0 }}>Extracted data will be pre-filled</p>
              </div>
              <button onClick={() => { setModal(null); setCreating(null); }} style={{ width: 32, height: 32, border: "1px solid #E4E7EC", borderRadius: 8, background: "#fff", cursor: "pointer", color: "#667085", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ padding: "20px 22px" }}>
              {!creating ? (
                <>
                  <p style={{ fontSize: 12.5, color: "#667085", marginBottom: 16 }}>What do you want to create?</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[{ type: "transport" as const, icon: "🚛", label: "New Transport", sub: "Create a transport declaration" },
                      { type: "shipment" as const, icon: "📦", label: "New Shipment", sub: "Create a shipment record" }].map(opt => (
                      <div key={opt.type} onClick={() => setCreating(opt.type)} style={{ border: "1px solid #E4E7EC", borderRadius: 8, padding: 14, cursor: "pointer", textAlign: "center" as const, transition: "border-color .15s" }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = "#84ADFF")}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "#E4E7EC")}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>{opt.icon}</div>
                        <strong style={{ display: "block", fontSize: 13, color: "#101828", marginBottom: 3 }}>{opt.label}</strong>
                        <span style={{ fontSize: 11, color: "#667085" }}>{opt.sub}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 12.5, color: "#667085", marginBottom: 16 }}>
                    Creating a <strong>{creating}</strong> with data from <strong>{selected?.file_name ?? "document"}</strong>.
                  </p>
                  {creating === "shipment" && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "#344054", marginBottom: 5 }}>Link to transport (optional)</label>
                      <select value={transportId} onChange={e => setTransportId(e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #D0D5DD", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }}>
                        <option value="">— Unlinked —</option>
                        {transports.map(t => <option key={t.id} value={t.id}>{t.reference}</option>)}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>
            <div style={{ padding: "14px 22px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button style={btnSec} onClick={() => { setModal(null); setCreating(null); }}>Cancel</button>
              {creating && <button style={btnPri} onClick={() => createFromDoc(creating)} disabled={saving}>{saving ? "Creating…" : `Create ${creating}`}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
