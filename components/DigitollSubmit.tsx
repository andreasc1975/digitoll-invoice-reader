"use client";
import React from "react";
import { HNode } from "./Hierarchy";

// Submit-to-Digitoll action bar, shown under the hierarchy table in each modal.
// "This <level>" submits the open object; "Submit all" submits the whole chain.

const ENDPOINT: Record<string, string> = {
  transport: "/api/transports",
  master: "/api/masters",
  house: "/api/houses",
};
const TYPE_LABEL: Record<string, string> = {
  transport: "Transport", master: "Master", house: "House",
};

function makeMrn(): string {
  return `22NO${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

const btn = (primary: boolean): React.CSSProperties => ({
  padding: "6px 14px", borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  border: primary ? "none" : "1px solid #D0D5DD",
  background: primary ? "#446BF9" : "#fff",
  color: primary ? "#fff" : "#344054",
  display: "inline-flex", alignItems: "center", gap: 6,
});

export function DigitollSubmitBar({ nodes, currentType, onDone }: { nodes: HNode[]; currentType: "transport" | "master" | "house"; onDone: () => void }) {
  const [scope, setScope] = React.useState<null | "self" | "all">(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState<{ label: string; mrn: string }[] | null>(null);

  const current = nodes.find(n => n.active) ?? null;
  const targets = scope === "all" ? nodes : current ? [current] : [];

  async function confirmSubmit() {
    setSubmitting(true);
    const results: { label: string; mrn: string }[] = [];
    for (const n of targets) {
      const mrn = makeMrn();
      await fetch(`${ENDPOINT[n.type]}/${n.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digitoll_status: "sent", mrn, submitted_at: new Date().toISOString() }),
      });
      results.push({ label: `${TYPE_LABEL[n.type]} ${n.label}`, mrn });
    }
    setSubmitting(false);
    setScope(null);
    setDone(results);
    onDone();
  }

  return (
    <>
      {/* Action row */}
      <div style={{ padding: "10px 20px", background: "#fff", borderBottom: "1px solid #E4E7EC", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>Submit to Digitoll</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button style={btn(false)} onClick={() => setScope("self")}>
            <span style={{ fontFamily: "Material Icons", fontSize: 15, lineHeight: 1 }}>send</span>
            This {TYPE_LABEL[currentType]}
          </button>
          <button style={btn(true)} onClick={() => setScope("all")}>
            <span style={{ fontFamily: "Material Icons", fontSize: 15, lineHeight: 1 }}>send</span>
            Submit all
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      {scope && (
        <div onClick={() => !submitting && setScope(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 480, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 22px 14px", borderBottom: "1px solid #E4E7EC", fontSize: 13, fontWeight: 700, color: "#101828", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>
              Submit to Digitoll — {scope === "all" ? "entire chain" : TYPE_LABEL[currentType]}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px" }}>
              <div style={{ fontSize: 12, color: "#667085", marginBottom: 12 }}>
                The following {targets.length === 1 ? "notification" : `${targets.length} notifications`} will be submitted:
              </div>
              {targets.map(n => {
                const sent = n.digitoll === "sent" || n.digitoll === "accepted";
                return (
                  <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #F2F4F7" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: "#003160", textTransform: "uppercase" as const, minWidth: 72 }}>{TYPE_LABEL[n.type]}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "#101828" }}>{n.label}</span>
                    {sent && <span style={{ fontSize: 11, color: "#98A2B3", marginLeft: "auto" }}>already submitted — will resend</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "12px 22px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setScope(null)} disabled={submitting} style={{ ...btn(false), opacity: submitting ? 0.5 : 1 }}>Cancel</button>
              <button onClick={confirmSubmit} disabled={submitting} style={{ ...btn(true), opacity: submitting ? 0.7 : 1 }}>
                {submitting ? "Submitting…" : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success / MRN receipt modal */}
      {done && (
        <div onClick={() => setDone(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 460, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "24px 24px 8px", display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 10, textAlign: "center" as const }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#ECFDF3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "Material Icons", fontSize: 24, color: "#027A48" }}>check_circle</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#101828" }}>Submitted to Digitoll</div>
              <div style={{ fontSize: 12.5, color: "#667085" }}>{done.length} notification{done.length > 1 ? "s" : ""} accepted</div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 24px 16px" }}>
              {done.map((r, i) => (
                <div key={i} style={{ background: "#F9FAFB", border: "1px solid #E4E7EC", borderRadius: 2, padding: "8px 12px", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: 12, color: "#344054", fontWeight: 600 }}>{r.label}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "#003160", letterSpacing: ".06em" }}>{r.mrn}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "12px 22px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "center" }}>
              <button onClick={() => setDone(null)} style={{ ...btn(true), padding: "7px 24px" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
