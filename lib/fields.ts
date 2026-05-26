export type Confidence = "high" | "med" | "low";
export type Source = "ai" | "manual";

export interface FieldDef {
  key: string;
  label: string;
  section: string;
  required: boolean;
  stronglyRecommended?: boolean;
  placeholder?: string;
  half?: "left" | "right";
}

export const FIELDS: FieldDef[] = [
  // Exporter
  { section: "Exportör", key: "exp_name", label: "Namn", required: true, placeholder: "Företagsnamn" },
  { section: "Exportör", key: "exp_address", label: "Adress", required: true, placeholder: "Gatuadress, stad, land" },
  // Importer
  { section: "Importör", key: "imp_name", label: "Namn", required: true, placeholder: "Företagsnamn" },
  { section: "Importör", key: "imp_address", label: "Adress", required: true, placeholder: "Gatuadress, stad, land" },
  { section: "Importör", key: "imp_id", label: "EORI / VAT-nummer", required: false, stronglyRecommended: true, placeholder: "t.ex. SE556123456701" },
  // Goods
  { section: "Gods", key: "totalValue", label: "Totalt värde", required: true, placeholder: "t.ex. 12500.00", half: "left" },
  { section: "Gods", key: "currency", label: "Valuta", required: true, placeholder: "t.ex. EUR", half: "right" },
  { section: "Gods", key: "totalNetWeight", label: "Nettovikt (kg)", required: true, placeholder: "t.ex. 145.5", half: "left" },
  { section: "Gods", key: "totalGrossWeight", label: "Bruttovikt (kg)", required: true, placeholder: "t.ex. 158.0", half: "right" },
  { section: "Gods – valfri gruppering", key: "hsCode", label: "HS-kod", required: false, placeholder: "t.ex. 8471.30", half: "left" },
  { section: "Gods – valfri gruppering", key: "originCountry", label: "Ursprungsland", required: false, placeholder: "t.ex. SE", half: "right" },
  // Customs
  { section: "Tull", key: "destinationCountry", label: "Destinationsland", required: true, placeholder: "t.ex. FI", half: "left" },
  { section: "Tull", key: "customsValue", label: "Tullvärde", required: true, placeholder: "t.ex. 12500.00", half: "right" },
  { section: "Tull", key: "procedureCode", label: "Procedurkod", required: false, placeholder: "t.ex. 4000" },
  // Transport
  { section: "Transport", key: "modeOfTransport", label: "Transportsätt", required: true, placeholder: "t.ex. Road, Sea, Air" },
  { section: "Transport", key: "incoterm", label: "Incoterm", required: true, placeholder: "t.ex. DAP", half: "left" },
  { section: "Transport", key: "incotermPlace", label: "Plats", required: true, placeholder: "t.ex. Helsinki", half: "right" },
  { section: "Transport", key: "transportRef", label: "Transportreferens", required: false, placeholder: "t.ex. fraktsedelsnummer" },
];

export const REQUIRED_FIELDS = FIELDS.filter((f) => f.required).map((f) => f.key);

export function calcCompletion(values: Record<string, string | null | undefined>): {
  filled: number;
  total: number;
  pct: number;
} {
  const total = REQUIRED_FIELDS.length;
  const filled = REQUIRED_FIELDS.filter((k) => values[k]?.trim()).length;
  return { filled, total, pct: Math.round((filled / total) * 100) };
}

export function progressColor(pct: number): string {
  if (pct >= 100) return "#1D9E75";
  if (pct >= 60) return "#EF9F27";
  return "#E24B4A";
}

export function buildDigitollJSON(
  fileName: string,
  values: Record<string, string | null | undefined>,
  exportedAt: string
) {
  const v = (k: string) => values[k] || null;
  return {
    exporter: { name: v("exp_name"), address: v("exp_address") },
    importer: { name: v("imp_name"), address: v("imp_address"), id_eori_vat: v("imp_id") },
    goods: {
      totalValue: v("totalValue") ? parseFloat(v("totalValue")!) : null,
      currency: v("currency"),
      totalNetWeight: v("totalNetWeight") ? parseFloat(v("totalNetWeight")!) : null,
      totalGrossWeight: v("totalGrossWeight") ? parseFloat(v("totalGrossWeight")!) : null,
      hsCode: v("hsCode"),
      originCountry: v("originCountry"),
    },
    customs: {
      destinationCountry: v("destinationCountry"),
      customsValue: v("customsValue") ? parseFloat(v("customsValue")!) : null,
      procedureCode: v("procedureCode"),
    },
    transport: {
      modeOfTransport: v("modeOfTransport"),
      incoterm: v("incoterm"),
      incotermPlace: v("incotermPlace"),
      transportReference: v("transportRef"),
    },
    meta: { sourceFile: fileName, exportedAt },
  };
}
