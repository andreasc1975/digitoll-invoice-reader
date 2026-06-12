"use client";
import React, { useState, useEffect, useCallback } from "react";

interface CustomsRecord {
  id: string;
  reference: string;
  consignor: string;
  consignee: string;
  border_crossing: string;
  status: "draft" | "submitted" | "cleared" | "rejected";
  digitoll_id: string | null;
  created_at: string;
}

const BORDER_CROSSINGS = ["Svinesund", "Ørje", "Magnor", "Riksåsen", "Bjørnefjell", "Storlien", "Treriksrøysa"];

const STATUS_CONFIG = {
  draft:     { label: "Draft",     bg: "#F2F4F7", color: "#667085", dot: "#98A2B3" },
  submitted: { label: "Submitted", bg: "#EFF8FF", color: "#175CD3", dot: "#2E90FA" },
  cleared:   { label: "Cleared",   bg: "#ECFDF3", color: "#027A48", dot: "#12B76A" },
  rejected:  { label: "Rejected",  bg: "#FEF3F2", color: "#B42318", dot: "#F04438" },
};



const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #D0D5DD", borderRadius: 2, fontSize: 13, color: "#101828", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const };
const fBtn = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 14px", height: 36, boxSizing: "border-box" as const, borderRadius: 2, border: "1px solid transparent", background: active ? "#003160" : "#D9DBE0", color: active ? "#fff" : "#003160", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const });

type FormState = { reference: string; consignor: string; consignee: string; border_crossing: string; status: CustomsRecord["status"] };
const emptyForm: FormState = { reference: "", consignor: "", consignee: "", border_crossing: "", status: "draft" };

export default function CustomsPage() {
  const [records, setRecords] = useState<CustomsRecord[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function handleCreate() { openNew(); }
    window.addEventListener("digitoll:open-create-menu", handleCreate);
    return () => window.removeEventListener("digitoll:open-create-menu", handleCreate);
  }, []);

  useEffect(() => {
    async function handleDelete() {
      if (selectedRows.size === 0) return;
      await Promise.all([...selectedRows].map(id =>
        fetch(`/api/customs/${id}`, { method: "DELETE" })
      ));
      setSelectedRows(new Set());
      load();
    }
    window.addEventListener("digitoll:delete-selected", handleDelete);
    return () => window.removeEventListener("digitoll:delete-selected", handleDelete);
  }, [selectedRows]);

  // Update topbar trash opacity
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
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"new" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

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

  function openNew() {
    setForm(emptyForm);
    setEditId(null);
    setModal("new");
  }

  function openEdit(record: CustomsRecord) {
    setForm({ reference: record.reference, consignor: record.consignor, consignee: record.consignee, border_crossing: record.border_crossing, status: record.status });
    setEditId(record.id);
    setModal("edit");
  }

  function toggleRow(id: string) {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function deleteSelected() {
    if (selectedRows.size === 0) return;
    await Promise.all([...selectedRows].map(id =>
      fetch(`/api/customs/${id}`, { method: "DELETE" })
    ));
    setSelectedRows(new Set());
    load();
  }

  async function save() {
    if (!form.reference || !form.consignor || !form.consignee || !form.border_crossing) return;
    if (modal === "new") {
      await fetch("/api/customs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else if (modal === "edit" && editId) {
      await fetch(`/api/customs/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setModal(null);
    load();
  }

  const formValid = !!(form.reference && form.consignor && form.consignee && form.border_crossing);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>

      {/* Modal */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 480, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#101828", textTransform: "uppercase", letterSpacing: ".05em" }}>
                {modal === "new" ? "New Customs Record" : "Edit Customs Record"}
              </div>
              <button onClick={() => setModal(null)} style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 16, color: "#667085", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            {/* Body */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#344054", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".04em" }}>Reference <span style={{ color: "#D92D20" }}>*</span></label>
                <input style={inp} value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="CUS-000" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#344054", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".04em" }}>Consignor <span style={{ color: "#D92D20" }}>*</span></label>
                  <input style={inp} value={form.consignor} onChange={e => setForm(f => ({ ...f, consignor: e.target.value }))} placeholder="Exporter AB" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#344054", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".04em" }}>Consignee <span style={{ color: "#D92D20" }}>*</span></label>
                  <input style={inp} value={form.consignee} onChange={e => setForm(f => ({ ...f, consignee: e.target.value }))} placeholder="Importer AS" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#344054", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".04em" }}>Border Crossing <span style={{ color: "#D92D20" }}>*</span></label>
                  <select style={inp} value={form.border_crossing} onChange={e => setForm(f => ({ ...f, border_crossing: e.target.value }))}>
                    <option value="">Select...</option>
                    {BORDER_CROSSINGS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#344054", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".04em" }}>Status</label>
                  <select style={inp} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as CustomsRecord["status"] }))}>
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="cleared">Cleared</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>
            {/* Footer */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setModal(null)} style={{ padding: "7px 16px", borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", color: "#344054" }}>Cancel</button>
              <button onClick={save} disabled={!formValid} style={{ padding: "7px 16px", borderRadius: 2, border: "none", background: formValid ? "#446BF9" : "#D0D5DD", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: formValid ? "pointer" : "default", fontFamily: "inherit" }}>
                {modal === "new" ? "Create" : "Save changes"}
              </button>
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
          {([
            ["all", "All", counts.all],
            ["draft", "Draft", counts.draft],
            ["submitted", "Submitted", counts.submitted],
            ["cleared", "Cleared", counts.cleared],
            ["rejected", "Rejected", counts.rejected],
            ["digitoll", "In Digitoll", counts.digitoll],
          ] as [string, string, number][]).map(([key, label, count]) => (
            <button key={key} onClick={() => setFilter(key)} style={fBtn(filter === key)}>
              {label}
              <span style={{ background: filter === key ? "rgba(255,255,255,0.25)" : "#003160", color: "#fff", borderRadius: 2, padding: "1px 7px", fontSize: 10, fontWeight: 700, minWidth: 20, textAlign: "center" as const, lineHeight: "16px" }}>{count}</span>
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 2 }}>
            <button onClick={deleteSelected} disabled={selectedRows.size === 0} style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: selectedRows.size > 0 ? "pointer" : "default", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", opacity: selectedRows.size > 0 ? 1 : 0.4 }}>
              <span style={{ fontFamily: "Material Icons", fontSize: 20, color: "#003160", lineHeight: 1 }}>delete_forever</span>
            </button>
            {[
              { icon: "≡", title: "Group" },
              { icon: "↺", title: "Refresh", onClick: load },
              { icon: "⊟", title: "Filter" },
            ].map(({ icon, title, onClick }) => (
              <button key={title} title={title} onClick={onClick} style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: "pointer", borderRadius: 2, color: "#003160", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>
                {icon}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 1, background: "#E4E7EC", margin: "0 -20px 10px" }} />
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff" }}>
            <span style={{ fontFamily: "Material Icons", fontSize: 18, color: "#98A2B3", lineHeight: 1, userSelect: "none" as const }}>search</span>
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
                <tr key={record.id}
                  style={{ borderBottom: "1px solid #E4E7EC", background: selectedRows.has(record.id) ? "#EDF0F3" : "transparent" }}
                  onMouseEnter={e => { if (!selectedRows.has(record.id)) e.currentTarget.style.background = "#F9FAFB"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = selectedRows.has(record.id) ? "#EDF0F3" : "transparent"; }}
                >
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
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: sc.dot }} />
                      {sc.label}
                    </span>
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    {record.digitoll_id
                      ? <span style={{ fontSize: 11.5, fontWeight: 600, color: "#027A48" }}>{record.digitoll_id}</span>
                      : <button style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 2, background: "transparent", color: "#446BF9", fontSize: 11.5, fontWeight: 600, border: "1px solid #446BF9", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>
                          → Digitoll
                        </button>
                    }
                  </td>
                  <td style={{ padding: "9px 12px", color: "#98A2B3", fontSize: 12 }}>{record.created_at}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <button onClick={() => openEdit(record)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 2, background: "#fff", color: "#344054", fontSize: 11.5, fontWeight: 500, border: "1px solid #D0D5DD", cursor: "pointer", fontFamily: "inherit" }}>
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
            {loading && <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#98A2B3" }}>Loading...</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 60, textAlign: "center", color: "#98A2B3" }}>
                <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500, color: "#667085" }}>No customs records</div>
                <button onClick={openNew} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 2, background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ fontFamily: "Material Icons", fontSize: 16, lineHeight: 1 }}>add</span>
                  New record
                </button>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
