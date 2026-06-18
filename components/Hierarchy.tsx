"use client";
import React from "react";

export type HNode = {
  type: "transport" | "master" | "house";
  id: string;
  label: string;
  status: string;
  active: boolean;
  identifier?: string | null;
  parties?: string | null;
  digitoll?: string | null;
  mode?: string | null;
};

const TYPE_COLOR: Record<string, string> = {
  transport: "#175CD3", master: "#446BF9", house: "#6941C6",
};
const TYPE_LABEL: Record<string, string> = {
  transport: "Transport", master: "Master", house: "House",
};
const STATUS_LABEL: Record<string, string> = {
  ready: "Ready", incomplete: "Incomplete", sent: "Sent", received: "Received",
  accepted: "Accepted", rejected: "Rejected", arrived: "Arrived",
  pending: "Pending", cleared: "Cleared", held: "Held",
};
const DIGITOLL: Record<string, { label: string; dot: string; color: string }> = {
  not_sent: { label: "Not sent", dot: "#D0D5DD", color: "#98A2B3" },
  sent:     { label: "Sent",     dot: "#2E90FA", color: "#175CD3" },
  accepted: { label: "Accepted", dot: "#12B76A", color: "#027A48" },
  rejected: { label: "Rejected", dot: "#F04438", color: "#B42318" },
};

export function statusDot(status: string): string {
  if (["ready", "cleared", "accepted", "sent", "received"].includes(status)) return "#12B76A";
  if (["held", "rejected"].includes(status)) return "#F04438";
  return "#F79009";
}

function depthForType(t: string): number {
  return t === "transport" ? 0 : t === "master" ? 1 : 2;
}
function partyLine(a?: unknown, b?: unknown): string | null {
  const x = (a as string) || null;
  const y = (b as string) || null;
  if (x && y) return `${x} → ${y}`;
  return x || y || null;
}

function nodeStatus(type: string, d: Record<string, unknown>): string {
  if (type === "transport") {
    const s = d.status as string;
    if (["sent", "received", "accepted"].includes(s)) return s;
    if (d.ata) return "arrived";
    return (d.border_crossing && d.transport_mode && d.identification_number &&
            d.type_of_identification && d.operator_name && d.customs_office &&
            (d.scheduled_arrival || d.eta)) ? "ready" : "incomplete";
  }
  if (type === "master") {
    return (d.document_number && d.document_type &&
            d.gross_weight && d.transport_equipment && d.loading_location && d.unloading_location)
      ? "ready" : "incomplete";
  }
  return (d.goods_description && d.hs_code && d.gross_weight && d.exporter && d.importer &&
          d.tracking_number && d.customs_procedure && d.transport_equipment &&
          d.loading_location && d.unloading_location) ? "ready" : "incomplete";
}

function nodeFrom(type: "transport" | "master" | "house", d: Record<string, unknown>, active: boolean): HNode {
  const label = (d.state_id as string) ?? (d.reference as string) ?? TYPE_LABEL[type];
  const base = { type, id: d.id as string, label, status: nodeStatus(type, d), active, digitoll: (d.digitoll_status as string) ?? "not_sent" };
  if (type === "transport") return { ...base, identifier: (d.identification_number as string) ?? null, parties: (d.operator_name as string) ?? null, mode: (d.transport_mode as string) ?? null };
  if (type === "master")    return { ...base, identifier: (d.document_number as string) ?? null, parties: partyLine(d.consignor, d.consignee) };
  return { ...base, identifier: (d.tracking_number as string) ?? null, parties: partyLine(d.exporter, d.importer) };
}

export function canSubmitNode(n: HNode): boolean {
  return n.status === "ready" || n.digitoll === "sent" || n.digitoll === "accepted";
}

// Build the full hierarchy — always show the complete chain including siblings.
export function nodesFromDetail(type: string, d: Record<string, unknown>): HNode[] {
  const ns: HNode[] = [];

  if (type === "transport") {
    ns.push(nodeFrom("transport", d, true));
    // Masters and their houses
    ((d.masters as Record<string, unknown>[]) ?? []).forEach(m => {
      ns.push(nodeFrom("master", m, false));
      ((m.houses as Record<string, unknown>[]) ?? []).forEach(h => ns.push(nodeFrom("house", h, false)));
    });
    // Houses directly linked to this transport (no master)
    ((d.houses as Record<string, unknown>[]) ?? []).forEach(h => ns.push(nodeFrom("house", h, false)));
  } else if (type === "master") {
    const tr = d.transports as Record<string, unknown> | null;
    if (tr) ns.push(nodeFrom("transport", tr, false));
    ns.push(nodeFrom("master", d, true));
    ((d.houses as Record<string, unknown>[]) ?? []).forEach(h => ns.push(nodeFrom("house", h, false)));
  } else {
    // House — build full chain and show all sibling houses
    const master = d.masters as Record<string, unknown> | null;
    const directTransport = d.transports as Record<string, unknown> | null;

    if (master) {
      // House → Master → Transport chain
      const tr = master.transports as Record<string, unknown> | null;
      if (tr) ns.push(nodeFrom("transport", tr, false));
      ns.push(nodeFrom("master", master, false));
      // All sibling houses under this master
      const siblings = (master.houses as Record<string, unknown>[]) ?? [];
      siblings.forEach(h => ns.push(nodeFrom("house", h, h.id === d.id)));
    } else if (directTransport) {
      // House → Transport (no master)
      ns.push(nodeFrom("transport", directTransport, false));
      // All sibling houses under this transport
      const siblings = (directTransport.houses as Record<string, unknown>[]) ?? [];
      siblings.forEach(h => ns.push(nodeFrom("house", h, h.id === d.id)));
    } else {
      // Standalone house
      ns.push(nodeFrom("house", d, true));
    }
  }

  return ns;
}

export function HierarchyTable({
  nodes,
  onNavigate,
  onSubmit,
}: {
  nodes: HNode[];
  onNavigate: (n: HNode) => void;
  onSubmit?: (nodes: HNode[]) => void;
}) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  // Reset selection when nodes change
  React.useEffect(() => { setSelected(new Set()); }, [nodes.map(n => n.id).join(",")]);

  const submittable = nodes.filter(canSubmitNode);
  const selectedNodes = nodes.filter(n => selected.has(n.id));

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    if (onSubmit && selectedNodes.length > 0) onSubmit(selectedNodes);
  }

  const showCheckboxes = !!onSubmit;

  return (
    <div style={{ background: "#F8FAFC", borderBottom: "1px solid #E4E7EC" }}>
      <div style={{ padding: "10px 20px 0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
          <thead>
            <tr>
              {showCheckboxes && (
                <th style={{ width: 28, padding: "0 6px 6px 0" }}>
                  {submittable.length > 0 && (() => {
                    const allSelected = submittable.every(n => selected.has(n.id));
                    const someSelected = submittable.some(n => selected.has(n.id));
                    return (
                      <div
                        onClick={() => {
                          if (allSelected) {
                            setSelected(new Set());
                          } else {
                            setSelected(new Set(submittable.map(n => n.id)));
                          }
                        }}
                        style={{
                          width: 16, height: 16, borderRadius: 3,
                          border: `1.5px solid ${allSelected || someSelected ? "#446BF9" : "#D0D5DD"}`,
                          background: allSelected ? "#446BF9" : "#fff",
                          cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                        {allSelected && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1, fontFamily: "Material Icons" }}>check</span>}
                        {!allSelected && someSelected && <span style={{ width: 8, height: 2, background: "#446BF9", borderRadius: 1, display: "block" }} />}
                      </div>
                    );
                  })()}
                </th>
              )}
              {["Level", "No.", "Identifier", "Mode", "Parties", "Status", "Digitoll"].map((h, i) => (
                <th key={i} style={{ textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "#003160", letterSpacing: ".04em", textTransform: "uppercase" as const, padding: "0 10px 6px 10px", whiteSpace: "nowrap" as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nodes.map(n => {
              const color = TYPE_COLOR[n.type];
              const depth = depthForType(n.type);
              const dot   = statusDot(n.status);
              const dg    = DIGITOLL[n.digitoll ?? "not_sent"] ?? DIGITOLL.not_sent;
              const canSend = canSubmitNode(n);
              const isSelected = selected.has(n.id);

              return (
                <tr key={n.id}
                  onClick={() => onNavigate(n)}
                  style={{ cursor: "pointer", background: n.active ? "#EDF0F3" : "transparent" }}
                  onMouseEnter={e => { if (!n.active) e.currentTarget.style.background = "#EEF2F6"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = n.active ? "#EDF0F3" : "transparent"; }}>

                  {showCheckboxes && (
                    <td style={{ padding: "5px 6px 5px 0", width: 28 }} onClick={e => { e.stopPropagation(); if (canSend) toggle(n.id); }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: 3, border: `1.5px solid ${!canSend ? "#E4E7EC" : isSelected ? "#446BF9" : "#D0D5DD"}`,
                        background: isSelected ? "#446BF9" : "#fff",
                        cursor: canSend ? "pointer" : "default",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        {isSelected && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1, fontFamily: "Material Icons" }}>check</span>}
                      </div>
                    </td>
                  )}

                  <td style={{ padding: "5px 10px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, paddingLeft: depth * 16 }}>
                      {depth > 0 && <span style={{ color: "#D0D5DD", fontSize: 12, lineHeight: 1 }}>└</span>}
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, color }}>{TYPE_LABEL[n.type]}</span>
                    </span>
                  </td>
                  <td style={{ padding: "5px 10px", fontWeight: n.active ? 700 : 500, color: "#101828", whiteSpace: "nowrap" as const }}>{n.label}</td>
                  <td style={{ padding: "5px 10px", color: "#667085", whiteSpace: "nowrap" as const }}>{n.identifier || "—"}</td>
                  <td style={{ padding: "5px 10px", color: "#667085", whiteSpace: "nowrap" as const }}>{n.mode || "—"}</td>
                  <td style={{ padding: "5px 10px", color: "#344054" }}>{n.parties || "—"}</td>
                  <td style={{ padding: "5px 10px", whiteSpace: "nowrap" as const }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                      <span style={{ color: "#667085" }}>{STATUS_LABEL[n.status] ?? n.status}</span>
                    </span>
                  </td>
                  <td style={{ padding: "5px 10px", whiteSpace: "nowrap" as const }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dg.dot, flexShrink: 0 }} />
                      <span style={{ color: dg.color }}>{dg.label}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Submit bar — only shown when onSubmit is provided */}
      {showCheckboxes && (
        <div style={{ padding: "8px 20px 10px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "#98A2B3" }}>
            {submittable.length === 0
              ? "No rows ready to submit"
              : selected.size === 0
              ? `Select rows to submit (${submittable.length} available)`
              : `${selected.size} selected`}
          </span>
          <button
            disabled={selectedNodes.length === 0}
            onClick={handleSubmit}
            style={{
              marginLeft: "auto",
              padding: "6px 14px", borderRadius: 2, border: "none",
              background: selectedNodes.length === 0 ? "#F2F4F7" : "#446BF9",
              color: selectedNodes.length === 0 ? "#D0D5DD" : "#fff",
              fontSize: 12, fontWeight: 700, cursor: selectedNodes.length === 0 ? "default" : "pointer",
              fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6,
              transition: "background 0.12s",
            }}>
            <span style={{ fontFamily: "Material Icons", fontSize: 14, lineHeight: 1 }}>send</span>
            Submit{selectedNodes.length > 0 ? ` (${selectedNodes.length})` : ""}
          </button>
        </div>
      )}
    </div>
  );
}
