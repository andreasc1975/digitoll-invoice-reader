"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";

interface SOLine {
  id: string; item_no: string | null; item_name: string | null;
  recipient: string | null; notes: string | null;
  units: string | null; pieces_per_unit: number;
  quantity_requested: number; amount_requested: number;
  prereserved_units: string | null; prereserved_quantity: number; prereserved_amount: number;
  allocated_units: string | null; allocated_quantity: number; allocated_total_pieces: number;
  allocated_quantity2: number; allocated_from_po: string | null;
  diff_units: string | null; diff_total_pieces: number; diff_quantity: number;
  price: number; price_unit: string | null; price_quantity: number;
  discount_value: number; discount_type: string; net_amount: number;
}
interface SOCost {
  id: string; cost: string | null; included: boolean; description: string | null;
  calculation_method: string | null; distribution_method: string | null;
  no_of_units: number; gross_weight: number; net_weight: number;
  price: number; total_amount: number;
}
interface SO {
  id: string; order_no: string; status: string; sales_status: string;
  responsible: string | null; customer_name: string | null; customer_no: string | null;
  shipment_date: string | null; eta: string | null; ship_from: string | null;
  delivery_terms: string | null; delivery_place: string | null;
  amount: number | null; currency: string; exchange_rate: number | null;
  quantity_measure: string; person_responsible: string | null;
  tags: string | null; ref_order_no: string | null;
  sales_order_lines: SOLine[];
  sales_order_costs: SOCost[];
}

const TABS = ["REQUEST", "GENERAL", "FINANCE", "SHIPMENT", "INTERNAL COSTS", "DOC TEXTS", "DOCUMENTS"];

function fmt(n: number | null | undefined, dec = 2) {
  if (n == null) return "";
  if (n === 0) return "0." + "0".repeat(dec);
  return n.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function fmtD(d: string | null) {
  if (!d) return "—";
  const p = d.slice(0, 10).split("-");
  return `${p[1]}/${p[2]}/${p[0].slice(2)}`;
}

const thG: React.CSSProperties = {
  fontSize: 8.5, fontWeight: 700, color: "#003160", textTransform: "uppercase",
  letterSpacing: ".07em", padding: "5px 8px 0", textAlign: "left", borderBottom: "none",
  whiteSpace: "nowrap", background: "#fff",
};
const thC: React.CSSProperties = {
  fontSize: 8.5, fontWeight: 700, color: "#667085", textTransform: "uppercase",
  letterSpacing: ".04em", padding: "2px 8px 6px", borderBottom: "2px solid #E4E7EC",
  textAlign: "right", whiteSpace: "nowrap", background: "#fff",
};
const thCL: React.CSSProperties = { ...thC, textAlign: "left" };
const cell: React.CSSProperties = {
  padding: "5px 8px", fontSize: 11.5, color: "#344054",
  borderBottom: "1px solid #F2F4F7", whiteSpace: "nowrap",
};
const cellR: React.CSSProperties = { ...cell, textAlign: "right", fontVariantNumeric: "tabular-nums" };
const cellB: React.CSSProperties = { ...cellR, color: "#446BF9" };
const cellRed: React.CSSProperties = { ...cellR, color: "#B42318" };

// Inline editable text cell — saves onBlur
function EditCell({ value, onSave, right }: { value: string; onSave: (v: string) => void; right?: boolean }) {
  const [v, setV] = useState(value);
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  return editing ? (
    <input ref={ref}
      style={{ width: "100%", border: "none", borderBottom: "1.5px solid #446BF9", outline: "none", fontSize: 11.5, fontFamily: "inherit", padding: "2px 4px", textAlign: right ? "right" : "left", background: "#EEF4FF" }}
      value={v}
      onChange={e => setV(e.target.value)}
      onBlur={() => { setEditing(false); if (v !== value) onSave(v); }}
      onKeyDown={e => { if (e.key === "Enter") { setEditing(false); if (v !== value) onSave(v); } if (e.key === "Escape") { setV(value); setEditing(false); } }}
    />
  ) : (
    <div onClick={() => setEditing(true)} style={{ minWidth: 60, borderBottom: "1px solid #E4E7EC", cursor: "text", minHeight: 16, fontSize: 11.5, textAlign: right ? "right" : "left", color: v ? "#344054" : "#D0D5DD" }}>
      {v || ""}
    </div>
  );
}

// Inline editable select
function EditSelect({ value, options, onSave }: { value: string; options: string[]; onSave: (v: string) => void }) {
  return (
    <select
      style={{ border: "1px solid #E4E7EC", borderRadius: 2, padding: "1px 4px", fontSize: 10.5, fontFamily: "inherit", color: "#667085", background: "#fff", cursor: "pointer" }}
      value={value}
      onChange={e => onSave(e.target.value)}>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  );
}

export default function SalesOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<SO | null>(null);
  const [lines, setLines] = useState<SOLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("REQUEST");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/sales-orders/${id}`);
    if (res.ok) {
      const d = await res.json();
      setOrder(d);
      setLines((d.sales_order_lines ?? []).sort((a: SOLine, b: SOLine) => Number(a.item_no) - Number(b.item_no)));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function saveLine(lineId: string, patch: Partial<SOLine>) {
    await fetch(`/api/sales-order-lines/${lineId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setLines(prev => prev.map(l => l.id === lineId ? { ...l, ...patch } : l));
  }

  if (loading) return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#98A2B3", fontSize: 13 }}>Loading…</div>;
  if (!order) return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#B42318", fontSize: 13 }}>Order not found</div>;

  const costs = order.sales_order_costs ?? [];
  const totalNet = lines.reduce((s, l) => s + (l.net_amount ?? 0), 0);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "Inter, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E4E7EC", padding: "6px 16px", display: "flex", alignItems: "center", gap: 0, flexWrap: "nowrap" as const, overflowX: "auto", flexShrink: 0 }}>
        <button onClick={() => history.back()} style={{ marginRight: 10, width: 26, height: 26, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: "Material Icons", fontSize: 15, color: "#667085" }}>arrow_back</span>
        </button>

        {/* Status badges */}
        <div style={{ display: "flex", gap: 3, marginRight: 14, flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 2, background: "#1D4ED8", color: "#fff" }}>U</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 2, background: "#1D4ED8", color: "#fff" }}>SA</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 2, background: "#F59E0B", color: "#fff" }}>NE</span>
        </div>

        <HF label="STATUS" value={<span style={{ fontSize: 11, fontWeight: 700, color: "#92400E" }}>Unconfirmed</span>} />
        <Div />
        <HF label="ORDER NO" value={order.order_no} />
        <Div />
        <HF label="ORDER DATE" value={fmtD(order.shipment_date)} />
        <Div />
        <HF label="SHIPMENT DATE" value={fmtD(order.eta)} />
        <Div />
        <HF label="SHIP FROM" value={order.ship_from} />
        <Div />
        <HF label="CUSTOMER" value={order.customer_name} blue />
        <Div />
        <HF label="PERSON RESPONSIBLE" value={order.person_responsible} blue />
        <Div />
        <HF label="CURRENCY" value={order.currency} />
        <Div />
        <HF label="QUANTITY MEASURE" value={order.quantity_measure} />

        <div style={{ marginLeft: "auto", display: "flex", gap: 4, flexShrink: 0, paddingLeft: 16 }}>
          <button style={{ padding: "5px 12px", borderRadius: 2, border: "none", background: "#446BF9", color: "#fff", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
            Order actions
            <span style={{ fontFamily: "Material Icons", fontSize: 14 }}>expand_more</span>
          </button>
          <button style={{ width: 28, height: 28, border: "1px solid #E4E7EC", borderRadius: 2, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "Material Icons", fontSize: 14, color: "#667085" }}>fullscreen</span>
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E4E7EC", display: "flex", padding: "0 16px", flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 14px", fontSize: 11.5, fontWeight: 600,
            color: tab === t ? "#fff" : "#667085",
            background: tab === t ? "#446BF9" : "transparent",
            border: "none", cursor: "pointer", fontFamily: "inherit",
            borderRadius: tab === t ? "2px 2px 0 0" : 0,
          }}>{t}</button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px", display: "flex", flexDirection: "column", gap: 10, background: "#F8FAFC" }}>

        {tab === "REQUEST" && <>

          {/* ── Lines table ── */}
          <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#fff" }}>
                    <th colSpan={2} style={thG}>ITEM</th>
                    <th colSpan={2} style={{ ...thG, borderLeft: "1px solid #F2F4F7" }}>
                      INFO <span style={{ fontFamily: "Material Icons", fontSize: 10, color: "#D0D5DD", verticalAlign: "middle" }}>keyboard_arrow_down</span>
                    </th>
                    <th colSpan={4} style={{ ...thG, borderLeft: "1px solid #F2F4F7" }}>
                      REQUEST <span style={{ fontFamily: "Material Icons", fontSize: 10, color: "#D0D5DD", verticalAlign: "middle" }}>keyboard_arrow_left</span>
                      <span style={{ fontSize: 7.5, color: "#98A2B3", marginLeft: 4 }}>({order.quantity_measure})</span>
                    </th>
                    <th colSpan={3} style={{ ...thG, borderLeft: "1px solid #F2F4F7" }}>PRE RESERVED</th>
                    <th colSpan={4} style={{ ...thG, borderLeft: "1px solid #F2F4F7" }}>
                      ALLOCATED <span style={{ fontSize: 7.5, color: "#98A2B3", marginLeft: 4 }}>({order.quantity_measure})</span>
                    </th>
                    <th colSpan={3} style={{ ...thG, borderLeft: "1px solid #F2F4F7" }}>
                      DIFFERENCE <span style={{ fontSize: 7.5, color: "#98A2B3", marginLeft: 4 }}>({order.quantity_measure})</span>
                    </th>
                    <th colSpan={3} style={{ ...thG, borderLeft: "1px solid #F2F4F7" }}>
                      PRICE <span style={{ fontSize: 7.5, color: "#98A2B3", marginLeft: 4 }}>({order.currency})</span>
                    </th>
                    <th colSpan={2} style={{ ...thG, borderLeft: "1px solid #F2F4F7" }}>DISCOUNT</th>
                    <th style={{ ...thG, textAlign: "right", borderLeft: "1px solid #F2F4F7" }}>NET AMOUNT</th>
                    <th style={thG}></th>
                  </tr>
                  <tr>
                    <th style={{ ...thCL, width: 24 }}></th>
                    <th style={thCL}>NO ↕</th>
                    <th style={{ ...thCL, borderLeft: "1px solid #F2F4F7" }}>NAME</th>
                    <th style={thCL}>RECIPIENT</th>
                    <th style={{ ...thCL, borderLeft: "1px solid #F2F4F7" }}>NOTES</th>
                    <th style={thC}>UNITS</th>
                    <th style={thC}>PIECES PR. UNIT</th>
                    <th style={thC}>QUANTITY</th>
                    <th style={thC}>AMOUNT</th>
                    <th style={{ ...thC, borderLeft: "1px solid #F2F4F7" }}>UNITS</th>
                    <th style={thC}>QUANTITY</th>
                    <th style={thC}>AMOUNT</th>
                    <th style={{ ...thC, borderLeft: "1px solid #F2F4F7" }}>UNITS</th>
                    <th style={thC}>TOTAL PIECES</th>
                    <th style={thC}>QUANTITY</th>
                    <th style={thC}>ALLOC. FROM PO</th>
                    <th style={{ ...thC, borderLeft: "1px solid #F2F4F7" }}>UNITS</th>
                    <th style={thC}>TOTAL PIECES</th>
                    <th style={thC}>QUANTITY</th>
                    <th style={{ ...thC, borderLeft: "1px solid #F2F4F7" }}>PRICE</th>
                    <th style={thC}>UNIT</th>
                    <th style={thC}>QUANTITY</th>
                    <th style={{ ...thC, borderLeft: "1px solid #F2F4F7" }}>VALUE</th>
                    <th style={thC}>TYPE</th>
                    <th style={{ ...thC, borderLeft: "1px solid #F2F4F7" }}>NET AMOUNT</th>
                    <th style={{ ...thC, width: 24 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {/* Action row */}
                  <tr style={{ background: "#F8FAFC" }}>
                    <td colSpan={26} style={{ padding: "3px 8px" }}>
                      <div style={{ display: "flex", gap: 5 }}>
                        {["add_circle_outline", "lock_outline", "delete_outline"].map((icon, i) => (
                          <button key={i} style={{ width: 20, height: 20, border: "1px solid #E4E7EC", borderRadius: "50%", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontFamily: "Material Icons", fontSize: 12, color: "#667085" }}>{icon}</span>
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>

                  {lines.map(l => (
                    <tr key={l.id}
                      onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <td style={{ ...cell, width: 24, color: "#D0D5DD", fontSize: 13 }}>
                        <span style={{ fontFamily: "Material Icons" }}>add_circle_outline</span>
                      </td>
                      <td style={{ ...cell, fontWeight: 600, color: "#101828" }}>{l.item_no}</td>
                      <td style={{ ...cell, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", borderLeft: "1px solid #F2F4F7" }}>{l.item_name}</td>
                      {/* Editable: RECIPIENT */}
                      <td style={cell}>
                        <EditCell value={l.recipient ?? ""} onSave={v => saveLine(l.id, { recipient: v })} />
                      </td>
                      {/* Editable: NOTES */}
                      <td style={{ ...cell, borderLeft: "1px solid #F2F4F7" }}>
                        <EditCell value={l.notes ?? ""} onSave={v => saveLine(l.id, { notes: v })} />
                      </td>
                      <td style={cellR}>{fmt(l.quantity_requested, 0)}</td>
                      <td style={cellR}>{fmt(l.pieces_per_unit, 0)}</td>
                      <td style={cellR}>{fmt(l.quantity_requested, 2)}</td>
                      <td style={cellR}>{fmt(l.amount_requested, 2)}</td>
                      <td style={{ ...cellB, borderLeft: "1px solid #F2F4F7" }}>{fmt(l.prereserved_quantity, 2)}</td>
                      <td style={cellB}>{fmt(l.prereserved_quantity, 2)}</td>
                      <td style={cellB}>{fmt(l.allocated_total_pieces, 0)}</td>
                      <td style={{ ...cell, borderLeft: "1px solid #F2F4F7" }}>{fmt(l.allocated_quantity, 0)}</td>
                      <td style={cellRed}>{l.allocated_total_pieces > 0 ? fmt(l.allocated_total_pieces * (l.price || 1), 2) : "0.00"}</td>
                      <td style={cellB}>{l.item_no}</td>
                      <td style={cell}>{l.allocated_from_po ?? ""}</td>
                      <td style={{ ...cell, borderLeft: "1px solid #F2F4F7" }}>{fmt(l.allocated_quantity, 0)}</td>
                      <td style={cellR}>{fmt(l.diff_total_pieces, 0)}</td>
                      <td style={cellR}>{fmt(l.diff_quantity, 2)}</td>
                      <td style={{ ...cellR, borderLeft: "1px solid #F2F4F7" }}>{fmt(l.price, 3)}</td>
                      <td style={cell}>
                        <EditSelect value={l.price_unit ?? "Quanti…"} options={["Quanti…", "Per kg", "Per unit"]} onSave={v => saveLine(l.id, { price_unit: v })} />
                      </td>
                      <td style={cellR}>{fmt(l.price_quantity, 0)}</td>
                      {/* Editable: DISCOUNT VALUE */}
                      <td style={{ ...cell, borderLeft: "1px solid #F2F4F7" }}>
                        <EditCell value={fmt(l.discount_value, 3)} onSave={v => saveLine(l.id, { discount_value: parseFloat(v) || 0 })} right />
                      </td>
                      {/* Editable: DISCOUNT TYPE */}
                      <td style={cell}>
                        <EditSelect value={l.discount_type} options={["Percent", "Value"]} onSave={v => saveLine(l.id, { discount_type: v })} />
                      </td>
                      <td style={{ ...cellR, fontWeight: 700, borderLeft: "1px solid #F2F4F7" }}>{fmt(l.net_amount, 3)}</td>
                      <td style={{ ...cell, color: "#D0D5DD" }}>
                        <span style={{ fontFamily: "Material Icons", fontSize: 14 }}>more_vert</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#F8FAFC", fontWeight: 700 }}>
                    <td colSpan={5} style={cell}></td>
                    <td style={cellR}>0</td>
                    <td colSpan={2} style={cellR}>0.00</td>
                    <td style={cellR}>0.00</td>
                    <td style={cellB}></td>
                    <td style={cellB}>{fmt(lines.reduce((s, l) => s + l.allocated_total_pieces, 0), 2)}</td>
                    <td style={cellB}>{fmt(lines.reduce((s, l) => s + l.allocated_total_pieces, 0), 2)}</td>
                    <td colSpan={8} style={cellR}></td>
                    <td style={cellR}>{fmt(lines.reduce((s, l) => s + l.price_quantity, 0), 2)}</td>
                    <td colSpan={3} style={cellR}></td>
                    <td style={{ ...cellR, fontSize: 12.5 }}>{fmt(totalNet, 3)}</td>
                    <td style={cell}></td>
                  </tr>
                  <tr>
                    <td colSpan={26} style={{ padding: "5px 8px" }}>
                      <button style={{ fontSize: 11, color: "#446BF9", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                        10 / {lines.length} Show More
                      </button>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── Cost table ── */}
          <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#fff" }}>
                    <th colSpan={5} style={thG}>COST</th>
                    <th colSpan={3} style={{ ...thG, borderLeft: "1px solid #F2F4F7" }}>QUANTITY</th>
                    <th colSpan={2} style={{ ...thG, borderLeft: "1px solid #F2F4F7" }}>AMOUNT</th>
                    <th style={thG}></th>
                  </tr>
                  <tr>
                    <th style={thCL}>COST</th>
                    <th style={thCL}>INCLUDED</th>
                    <th style={thCL}>DESCRIPTION</th>
                    <th style={thCL}>CALCULATION METHOD</th>
                    <th style={thCL}>DISTRIBUTION METHOD</th>
                    <th style={{ ...thC, borderLeft: "1px solid #F2F4F7" }}>NO OF UNITS</th>
                    <th style={thC}>GROSS WEIGHT</th>
                    <th style={thC}>NET WEIGHT</th>
                    <th style={{ ...thC, borderLeft: "1px solid #F2F4F7" }}>PRICE</th>
                    <th style={{ ...thC, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
                      TOTAL AMOUNT
                      <span style={{ fontFamily: "Material Icons", fontSize: 12, color: "#D0D5DD" }}>view_column</span>
                    </th>
                    <th style={{ ...thC, width: 28 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {costs.length === 0 ? (
                    <tr><td colSpan={11} style={{ ...cell, height: 36 }}></td></tr>
                  ) : costs.map(c => (
                    <tr key={c.id}>
                      <td style={cell}>{c.cost}</td>
                      <td style={cell}>{c.included ? "Yes" : ""}</td>
                      <td style={cell}>{c.description}</td>
                      <td style={cell}>{c.calculation_method}</td>
                      <td style={cell}>{c.distribution_method}</td>
                      <td style={cellR}>{fmt(c.no_of_units, 0)}</td>
                      <td style={cellR}>{fmt(c.gross_weight, 2)}</td>
                      <td style={cellR}>{fmt(c.net_weight, 2)}</td>
                      <td style={cellR}>{fmt(c.price, 2)}</td>
                      <td style={{ ...cellR, fontWeight: 700 }}>{fmt(c.total_amount, 2)}</td>
                      <td style={{ ...cell, color: "#D0D5DD" }}><span style={{ fontFamily: "Material Icons", fontSize: 14 }}>more_vert</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "5px 8px" }}>
              <button style={{ width: 22, height: 22, borderRadius: "50%", background: "#446BF9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "Material Icons", fontSize: 14, color: "#fff" }}>add</span>
              </button>
            </div>
          </div>

          {/* ── Discount ── */}
          <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 2, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thCL}>TYPE</th>
                  <th style={thC}>AMOUNT</th>
                  <th style={thC}>DISCOUNT</th>
                  <th style={thCL}>CALCULATION METHOD</th>
                  <th style={thC}>TOTAL AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={cell}>General Order Discount</td>
                  <td style={{ ...cellR, fontWeight: 700 }}>{fmt(totalNet, 3)}</td>
                  <td style={cell}>
                    <input style={{ width: 120, border: "1px solid #E4E7EC", borderRadius: 2, padding: "3px 6px", fontSize: 11.5, fontFamily: "inherit", textAlign: "right" }} defaultValue="" placeholder="0.000" />
                  </td>
                  <td style={cell}>
                    <select style={{ width: "100%", border: "1px solid #E4E7EC", borderRadius: 2, padding: "3px 6px", fontSize: 11.5, fontFamily: "inherit" }}>
                      <option>Value</option>
                      <option>Percent</option>
                    </select>
                  </td>
                  <td style={{ ...cellR, fontWeight: 700, fontSize: 12.5 }}>{fmt(totalNet, 3)}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ padding: "8px 12px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid #F2F4F7" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#101828" }}>{fmt(totalNet, 3)}</span>
            </div>
          </div>
        </>}

        {tab !== "REQUEST" && (
          <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 2, padding: "40px 20px", textAlign: "center", color: "#98A2B3", fontSize: 13 }}>
            {tab} — coming soon
          </div>
        )}
      </div>
    </div>
  );
}

function HF({ label, value, blue }: { label: string; value: React.ReactNode; blue?: boolean }) {
  return (
    <div style={{ flexShrink: 0, padding: "0 12px" }}>
      <div style={{ fontSize: 8, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase" as const, letterSpacing: ".07em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: blue ? "#446BF9" : "#101828" }}>{value ?? "—"}</div>
    </div>
  );
}
function Div() {
  return <div style={{ width: 1, height: 30, background: "#E4E7EC", flexShrink: 0 }} />;
}
