"use client";
import { useState, useEffect, useCallback } from "react";

export interface InvoiceItem {
  id?: string;
  line_nr: number;
  article: string | null;
  description: string | null;
  hs_code: string | null;
  origin_country: string | null;
  procedure_code: string | null;
  no_of_parcels: number | null;
  net_weight: number | null;
  gross_weight: number | null;
  amount: number | null;
  currency: string | null;
  quantity: number | null;
  quantity_unit: string | null;
  marks_and_numbers: string | null;
}

const EMPTY_ITEM: InvoiceItem = {
  line_nr: 1, article: null, description: null, hs_code: null,
  origin_country: null, procedure_code: null, no_of_parcels: null,
  net_weight: null, gross_weight: null, amount: null, currency: null,
  quantity: null, quantity_unit: null, marks_and_numbers: null,
};

interface Props {
  invoiceId: string;
  onAggregated?: () => void;
}

export default function ItemsTable({ invoiceId, onAggregated }: Props) {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadItems = useCallback(async () => {
    const res = await fetch(`/api/invoices/${invoiceId}/items`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.length > 0 ? data : [{ ...EMPTY_ITEM }]);
    }
  }, [invoiceId]);

  useEffect(() => { loadItems(); }, [loadItems]);

  function updateItem(idx: number, key: keyof InvoiceItem, value: string) {
    setItems((prev) => {
      const next = [...prev];
      const numKeys = ["no_of_parcels", "net_weight", "gross_weight", "amount", "quantity"];
      next[idx] = {
        ...next[idx],
        [key]: numKeys.includes(key) ? (value === "" ? null : parseFloat(value)) : (value === "" ? null : value),
      };
      return next;
    });
    setSaved(false);
  }

  function addRow() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM, line_nr: prev.length + 1 }]);
    setSaved(false);
  }

  function removeRow(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx).map((item, i) => ({ ...item, line_nr: i + 1 })));
    setSaved(false);
  }

  async function saveItems() {
    setSaving(true);
    const res = await fetch(`/api/invoices/${invoiceId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      onAggregated?.();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  // Totals
  const totalNet = items.reduce((s, i) => s + (i.net_weight ?? 0), 0);
  const totalGross = items.reduce((s, i) => s + (i.gross_weight ?? 0), 0);
  const totalAmount = items.reduce((s, i) => s + (i.amount ?? 0), 0);
  const totalParcels = items.reduce((s, i) => s + (i.no_of_parcels ?? 0), 0);

  const col = (label: string, width: number) => (
    <th style={{ width, minWidth: width, padding: "6px 8px", fontWeight: 500, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", borderBottom: "0.5px solid var(--border)", textAlign: "left", whiteSpace: "nowrap", background: "var(--bg-secondary)" }}>{label}</th>
  );

  const cell = (idx: number, key: keyof InvoiceItem, width: number, placeholder = "", type = "text") => (
    <td style={{ padding: "3px 4px", minWidth: width }}>
      <input
        type={type}
        value={items[idx][key] ?? ""}
        placeholder={placeholder}
        onChange={(e) => updateItem(idx, key, e.target.value)}
        style={{
          width: "100%", padding: "5px 7px", border: "0.5px solid var(--border-md)",
          borderRadius: "var(--radius-sm)", fontSize: 12, fontFamily: "var(--font)",
          background: "var(--bg)", color: "var(--text-primary)", outline: "none",
        }}
        onFocus={(e) => e.target.style.borderColor = "var(--blue)"}
        onBlur={(e) => e.target.style.borderColor = "var(--border-md)"}
      />
    </td>
  );

  return (
    <div style={{ margin: "20px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <span style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
            Goods — Item Lines
          </span>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: 8 }}>
            Values aggregate automatically to declaration fields
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {saved && <span style={{ fontSize: 11, color: "var(--text-success)" }}>✓ Saved & aggregated</span>}
          <button
            onClick={addRow}
            style={{ padding: "5px 12px", fontSize: 12, border: "0.5px solid var(--border-md)", borderRadius: "var(--radius-md)", background: "var(--bg)", cursor: "pointer", fontFamily: "var(--font)" }}
          >+ Add row</button>
          <button
            onClick={saveItems}
            disabled={saving}
            style={{ padding: "5px 12px", fontSize: 12, border: "none", borderRadius: "var(--radius-md)", background: "var(--green)", color: "#e1f5ee", cursor: "pointer", fontFamily: "var(--font)", fontWeight: 500 }}
          >{saving ? "Saving..." : "Save & aggregate"}</button>
        </div>
      </div>

      <div style={{ overflowX: "auto", border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
          <thead>
            <tr>
              {col("#", 36)}
              {col("Article", 90)}
              {col("Description", 160)}
              {col("HS Code", 90)}
              {col("Origin", 60)}
              {col("Procedure", 80)}
              {col("Parcels", 65)}
              {col("Net kg", 70)}
              {col("Gross kg", 75)}
              {col("Amount", 90)}
              {col("Currency", 70)}
              {col("Qty", 60)}
              {col("Unit", 60)}
              {col("Marks & Nos", 110)}
              <th style={{ width: 32, background: "var(--bg-secondary)", borderBottom: "0.5px solid var(--border)" }} />
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? "var(--bg)" : "var(--bg-secondary)" }}>
                <td style={{ padding: "3px 8px", fontSize: 12, color: "var(--text-tertiary)", textAlign: "center" }}>{idx + 1}</td>
                {cell(idx, "article", 90, "e.g. REF-001")}
                {cell(idx, "description", 160, "e.g. Industrial parts")}
                {cell(idx, "hs_code", 90, "e.g. 8471.30")}
                {cell(idx, "origin_country", 60, "e.g. SE")}
                {cell(idx, "procedure_code", 80, "e.g. 4000")}
                {cell(idx, "no_of_parcels", 65, "0", "number")}
                {cell(idx, "net_weight", 70, "0.0", "number")}
                {cell(idx, "gross_weight", 75, "0.0", "number")}
                {cell(idx, "amount", 90, "0.00", "number")}
                {cell(idx, "currency", 70, "EUR")}
                {cell(idx, "quantity", 60, "0", "number")}
                {cell(idx, "quantity_unit", 60, "pcs")}
                {cell(idx, "marks_and_numbers", 110, "")}
                <td style={{ padding: "3px 4px", textAlign: "center" }}>
                  <button
                    onClick={() => removeRow(idx)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: 14, padding: "2px 4px" }}
                    title="Remove row"
                  >✕</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: "var(--bg-secondary)", borderTop: "0.5px solid var(--border)" }}>
              <td colSpan={6} style={{ padding: "6px 8px", fontSize: 11, fontWeight: 500, color: "var(--text-secondary)" }}>Totals</td>
              <td style={{ padding: "6px 8px", fontSize: 12, fontWeight: 500 }}>{totalParcels || "–"}</td>
              <td style={{ padding: "6px 8px", fontSize: 12, fontWeight: 500 }}>{totalNet ? totalNet.toFixed(2) : "–"}</td>
              <td style={{ padding: "6px 8px", fontSize: 12, fontWeight: 500 }}>{totalGross ? totalGross.toFixed(2) : "–"}</td>
              <td style={{ padding: "6px 8px", fontSize: 12, fontWeight: 500 }}>{totalAmount ? totalAmount.toFixed(2) : "–"}</td>
              <td colSpan={5} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}