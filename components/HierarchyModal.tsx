"use client";
import React, { useState, useEffect } from "react";
import { HierarchyTable, nodesFromDetail, HNode } from "./Hierarchy";
import { useDigitollSubmit } from "./DigitollSubmit";

type RecordType = "transport" | "master" | "house";

interface Props {
  type: RecordType;
  id: string;
  onClose: () => void;
  onEdit: (id: string) => void;
}

const TYPE_LABEL: Record<RecordType, string> = {
  transport: "Transport", master: "Master", house: "House",
};
const TYPE_COLOR: Record<RecordType, string> = {
  transport: "#175CD3", master: "#446BF9", house: "#6941C6",
};
const API: Record<RecordType, string> = {
  transport: "/api/transports",
  master:    "/api/masters",
  house:     "/api/houses",
};

function NavBadge({ type, label, active, onClick }: { type: RecordType; label: string; active: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "4px 10px", borderRadius: 2, cursor: "pointer",
        border: active ? `2px solid ${TYPE_COLOR[type]}` : "1px solid #E4E7EC",
        background: active ? "#F8FAFC" : hov ? "#F8FAFC" : "#fff",
        fontFamily: "inherit",
      }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: TYPE_COLOR[type], flexShrink: 0 }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>{TYPE_LABEL[type]}</span>
      <span style={{ fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? "#101828" : "#344054" }}>{label}</span>
    </button>
  );
}

export function HierarchyModal({ type: initialType, id: initialId, onClose, onEdit }: Props) {
  const [type, setType]   = useState<RecordType>(initialType);
  const [id, setId]       = useState(initialId);
  const [data, setData]   = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<HNode[]>([]);

  useEffect(() => {
    setLoading(true);
    setData(null);
    fetch(`${API[type]}/${id}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setNodes(nodesFromDetail(type, d));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [type, id]);

  const { onSubmitNodes, modals: submitModals } = useDigitollSubmit(nodes, () => {
    fetch(`${API[type]}/${id}`).then(r => r.json()).then(d => {
      setData(d); setNodes(nodesFromDetail(type, d));
    });
  });

  const navBadges: { type: RecordType; id: string; label: string }[] = [];
  if (nodes.length > 0) {
    const seen = new Set<string>();
    nodes.forEach(n => {
      if (!seen.has(n.id)) {
        seen.add(n.id);
        navBadges.push({ type: n.type, id: n.id, label: n.label });
      }
    });
  }

  const transports = navBadges.filter(b => b.type === "transport");
  const masters    = navBadges.filter(b => b.type === "master");
  const houses     = navBadges.filter(b => b.type === "house");

  function navigate(n: HNode) {
    setType(n.type);
    setId(n.id);
  }

  const title = data
    ? (data.state_id as string) ?? (data.reference as string) ?? TYPE_LABEL[type]
    : TYPE_LABEL[type];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,0.4)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 2, width: 780, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "14px 22px 12px", borderBottom: "1px solid #E4E7EC" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: navBadges.length > 0 ? 10 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: TYPE_COLOR[type] }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>{TYPE_LABEL[type]}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#101828" }}>{title}</span>
              </div>
              <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", fontSize: 16, color: "#667085", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            {navBadges.length > 1 && (
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                {transports.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {transports.map(b => (
                      <NavBadge key={b.id} type="transport" label={b.label} active={type === "transport" && id === b.id} onClick={() => { setType("transport"); setId(b.id); }} />
                    ))}
                  </div>
                )}
                {transports.length > 0 && (masters.length > 0 || houses.length > 0) && (
                  <span style={{ color: "#D0D5DD", fontSize: 16, alignSelf: "center" }}>›</span>
                )}
                {masters.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {masters.map(b => (
                      <NavBadge key={b.id} type="master" label={b.label} active={type === "master" && id === b.id} onClick={() => { setType("master"); setId(b.id); }} />
                    ))}
                  </div>
                )}
                {masters.length > 0 && houses.length > 0 && (
                  <span style={{ color: "#D0D5DD", fontSize: 16, alignSelf: "center" }}>›</span>
                )}
                {houses.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap" as const, alignItems: "center", gap: 4 }}>
                    {houses.map(b => (
                      <NavBadge key={b.id} type="house" label={b.label} active={type === "house" && id === b.id} onClick={() => { setType("house"); setId(b.id); }} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {loading ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#98A2B3", fontSize: 13 }}>Loading…</div>
          ) : nodes.length > 0 ? (
            <HierarchyTable nodes={nodes} onNavigate={navigate} onSubmit={onSubmitNodes} />
          ) : null}
          {!loading && data && (
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px" }}>
              <DetailGrid type={type} data={data} />
            </div>
          )}
          <div style={{ padding: "12px 22px", borderTop: "1px solid #E4E7EC", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={onClose} style={{ padding: "7px 16px", borderRadius: 2, border: "1px solid #D0D5DD", background: "#fff", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", color: "#344054" }}>Close</button>
            <button onClick={() => { onClose(); onEdit(id); }} style={{ padding: "7px 16px", borderRadius: 2, border: "none", background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
          </div>
        </div>
      </div>
      {submitModals}
    </>
  );
}

function DetailGrid({ type, data }: { type: RecordType; data: Record<string, unknown> }) {
  const skip = new Set(["id", "created_at", "updated_at", "masters", "houses", "transports"]);
  const entries = Object.entries(data).filter(([k, v]) => !skip.has(k) && v !== null && v !== "" && typeof v !== "object");
  if (entries.length === 0) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
      {entries.map(([k, v]) => (
        <div key={k} style={{ borderBottom: "1px solid #F2F4F7", padding: "7px 0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".04em", marginBottom: 2 }}>
            {k.replace(/_/g, " ")}
          </div>
          <div style={{ fontSize: 12.5, color: "#344054" }}>{String(v)}</div>
        </div>
      ))}
    </div>
  );
}