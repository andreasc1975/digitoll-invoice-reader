"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SalesOrder {
  id: string;
  order_no: string;
  status: string;
  order_date: string | null;
  shipment_date: string | null;
  customer: string | null;
  person_responsible: string | null;
  currency: string;
  ship_from: string | null;
}

const STATUS_COLOR: Record<string, { bg: string; color: string; label: string }> = {
  unconfirmed: { bg: "#FEF3C7", color: "#92400E", label: "Unconfirmed" },
  confirmed:   { bg: "#D1FAE5", color: "#065F46", label: "Confirmed" },
  invoiced:    { bg: "#DBEAFE", color: "#1E40AF", label: "Invoiced" },
  cancelled:   { bg: "#FEE2E2", color: "#991B1B", label: "Cancelled" },
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return d.slice(0, 10).split("-").reverse().join("/");
}

const th: React.CSSProperties = {
  fontSize: 9.5, fontWeight: 700, color: "#003160", letterSpacing: ".04em",
  textTransform: "uppercase", padding: "0 12px 8px 12px", textAlign: "left",
  whiteSpace: "nowrap", borderBottom: "2px solid #E4E7EC", background: "#fff",
};
const td: React.CSSProperties = {
  padding: "10px 12px", fontSize: 12.5, color: "#344054",
  borderBottom: "1px solid #F2F4F7", whiteSpace: "nowrap",
};

export default function SalesOrderList() {
  const router = useRouter();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/sales-orders");
    if (res.ok) setOrders(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = orders.filter(o =>
    o.order_no.toLowerCase().includes(search.toLowerCase()) ||
    (o.customer ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      {/* Toolbar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E4E7EC", padding: "10px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <span style={{ fontFamily: "Material Icons", fontSize: 16, color: "#98A2B3", position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>search</span>
          <input
            style={{ width: "100%", padding: "7px 10px 7px 34px", border: "1px solid #E4E7EC", borderRadius: 2, fontSize: 12.5, fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const }}
            placeholder="Search order no. or customer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#98A2B3" }}>{filtered.length} orders</div>
        <button style={{ padding: "7px 16px", borderRadius: 2, border: "none", background: "#446BF9", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "Material Icons", fontSize: 14 }}>add</span>
          New Order
        </button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto", background: "#fff" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#98A2B3" }}>Loading…</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Order No</th>
                <th style={th}>Status</th>
                <th style={th}>Order Date</th>
                <th style={th}>Shipment Date</th>
                <th style={th}>Customer</th>
                <th style={th}>Ship From</th>
                <th style={th}>Person Responsible</th>
                <th style={th}>Currency</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ ...td, textAlign: "center", color: "#D0D5DD", padding: 40 }}>No orders found</td></tr>
              ) : filtered.map(o => {
                const st = STATUS_COLOR[o.status] ?? STATUS_COLOR.unconfirmed;
                return (
                  <tr key={o.id} onClick={() => router.push(`/sales-order/${o.order_no}`)}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ ...td, fontWeight: 700, color: "#101828" }}>{o.order_no}</td>
                    <td style={td}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: st.bg, color: st.color }}>{st.label}</span>
                    </td>
                    <td style={td}>{fmtDate(o.order_date)}</td>
                    <td style={td}>{fmtDate(o.shipment_date)}</td>
                    <td style={{ ...td, color: "#446BF9", fontWeight: 600 }}>{o.customer ?? "—"}</td>
                    <td style={td}>{o.ship_from ?? "—"}</td>
                    <td style={{ ...td, color: "#446BF9" }}>{o.person_responsible ?? "—"}</td>
                    <td style={td}>{o.currency}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
