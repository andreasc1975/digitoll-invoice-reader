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
  { section: "Exporter", key: "exp_name", label: "Name", required: true, placeholder: "Company name" },
  { section: "Exporter", key: "exp_address", label: "Address", required: true, placeholder: "Street address, city, country" },
  // Importer
  { section: "Importer", key: "imp_name", label: "Name", required: true, placeholder: "Company name" },
  { section: "Importer", key: "imp_address", label: "Address", required: true, placeholder: "Street address, city, country" },
  { section: "Importer", key: "imp_id", label: "EORI / VAT Number", required: false, stronglyRecommended: true, placeholder: "e.g. SE556123456701" },
  // Goods
  { section: "Goods", key: "totalValue", label: "Total Value", required: true, placeholder: "e.g. 12500.00", half: "left" },
  { section: "Goods", key: "currency", label: "Currency", required: true, placeholder: "e.g. EUR", half: "right" },
  { section: "Goods", key: "totalNetWeight", label: "Net Weight (kg)", required: true, placeholder: "e.g. 145.5", half: "left" },
  { section: "Goods", key: "totalGrossWeight", label: "Gross Weight (kg)", required: true, placeholder: "e.g. 158.0", half: "right" },
  { section: "Goods — Optional Grouping", key: "hsCode", label: "HS Code", required: false, placeholder: "e.g. 8471.30", half: "left" },
  { section: "Goods — Optional Grouping", key: "originCountry", label: "Country of Origin", required: false, placeholder: "e.g. SE", half: "right" },
  // Customs
  { section: "Customs", key: "destinationCountry", label: "Destination Country", required: true, placeholder: "e.g. FI", half: "left" },
  { section: "Customs", key: "customsValue", label: "Customs Value", required: true, placeholder: "e.g. 12500.00", half: "right" },
  { section: "Customs", key: "procedureCode", label: "Procedure Code", required: false, placeholder: "e.g. 4000" },
  // Transport
  { section: "Transport", key: "modeOfTransport", label: "Mode of Transport", required: true, placeholder: "e.g. Road, Sea, Air" },
  { section: "Transport", key: "incoterm", label: "Incoterm", required: true, placeholder: "e.g. DAP", half: "left" },
  { section: "Transport", key: "incotermPlace", label: "Place", required: true, placeholder: "e.g. Helsinki", half: "right" },
  { section: "Transport", key: "transportRef", label: "Transport Reference", required: false, placeholder: "e.g. waybill number" },
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
