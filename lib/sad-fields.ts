export interface SADFieldDef {
  box: string;
  label: string;
  description: string;
  required: boolean;
  placeholder?: string;
  width?: "full" | "half" | "third";
}

export const SAD_FIELDS: SADFieldDef[] = [
  // Box 1
  { box: "1", label: "Declaration Type", description: "Type of declaration (e.g. EX, IM, EU)", required: true, placeholder: "e.g. IM", width: "third" },
  // Box 2
  { box: "2", label: "Consignor / Exporter", description: "Name, address and country of the exporter", required: true, placeholder: "Name, address, country", width: "half" },
  // Box 3
  { box: "3", label: "Forms", description: "Number of this form / Total forms", required: false, placeholder: "1/1", width: "third" },
  // Box 4
  { box: "4", label: "Loading Lists", description: "Number of loading lists", required: false, placeholder: "e.g. 1", width: "third" },
  // Box 5
  { box: "5", label: "Items", description: "Total number of items", required: true, placeholder: "e.g. 3", width: "third" },
  // Box 6
  { box: "6", label: "Total Packages", description: "Total number of packages", required: true, placeholder: "e.g. 10", width: "third" },
  // Box 7
  { box: "7", label: "Reference Number", description: "Trader's own reference number", required: false, placeholder: "e.g. REF-2026-001", width: "half" },
  // Box 8
  { box: "8", label: "Consignee / Importer", description: "Name, address and country of the importer", required: true, placeholder: "Name, address, country", width: "half" },
  // Box 9
  { box: "9", label: "Person Responsible (Financial)", description: "Name and address of person financially responsible", required: false, placeholder: "Name, address", width: "half" },
  // Box 10
  { box: "10", label: "Last Country", description: "Last country before destination", required: false, placeholder: "e.g. DE", width: "third" },
  // Box 11
  { box: "11", label: "Trading Country", description: "Country of trading", required: false, placeholder: "e.g. SE", width: "third" },
  // Box 12
  { box: "12", label: "Value Details", description: "Details of value / currency", required: false, placeholder: "e.g. EUR", width: "third" },
  // Box 13
  { box: "13", label: "CAP", description: "Common Agricultural Policy reference", required: false, placeholder: "", width: "third" },
  // Box 14
  { box: "14", label: "Declarant / Representative", description: "Name and address of declarant or representative", required: true, placeholder: "Name, address, EORI", width: "full" },
  // Box 15
  { box: "15", label: "Country of Dispatch / Export", description: "Country from which goods are dispatched", required: true, placeholder: "e.g. SE", width: "third" },
  // Box 15a
  { box: "15a", label: "Country of Dispatch Code", description: "Country code of dispatch", required: false, placeholder: "e.g. SE", width: "third" },
  // Box 16
  { box: "16", label: "Country of Origin", description: "Country where goods were produced", required: true, placeholder: "e.g. SE", width: "third" },
  // Box 17
  { box: "17", label: "Country of Destination", description: "Country of final destination", required: true, placeholder: "e.g. FI", width: "third" },
  // Box 17a
  { box: "17a", label: "Destination Country Code", description: "Country code of destination", required: false, placeholder: "e.g. FI", width: "third" },
  // Box 18
  { box: "18", label: "Identity of Means of Transport at Departure", description: "Vehicle registration or vessel/flight number", required: true, placeholder: "e.g. ABC 123", width: "half" },
  // Box 19
  { box: "19", label: "Container", description: "Container indicator (1=yes, 0=no)", required: false, placeholder: "0 or 1", width: "third" },
  // Box 20
  { box: "20", label: "Delivery Terms", description: "Incoterm and place", required: true, placeholder: "e.g. DAP Helsinki", width: "half" },
  // Box 21
  { box: "21", label: "Identity of Active Means of Transport Crossing Border", description: "Vehicle/vessel crossing the border", required: false, placeholder: "e.g. vessel name", width: "half" },
  // Box 22
  { box: "22", label: "Currency and Total Invoice Amount", description: "Currency code and total invoice value", required: true, placeholder: "EUR 12500.00", width: "half" },
  // Box 23
  { box: "23", label: "Exchange Rate", description: "Currency exchange rate", required: false, placeholder: "e.g. 1.00", width: "third" },
  // Box 24
  { box: "24", label: "Nature of Transaction", description: "Nature of transaction code", required: true, placeholder: "e.g. 11", width: "third" },
  // Box 25
  { box: "25", label: "Mode of Transport at Border", description: "Mode of transport crossing border", required: true, placeholder: "1=Sea, 2=Rail, 3=Road, 4=Air", width: "third" },
  // Box 26
  { box: "26", label: "Inland Mode of Transport", description: "Mode of inland transport", required: false, placeholder: "e.g. 3", width: "third" },
  // Box 27
  { box: "27", label: "Place of Loading / Unloading", description: "Port, airport or place of loading/unloading", required: false, placeholder: "e.g. Port of Helsinki", width: "half" },
  // Box 28
  { box: "28", label: "Financial and Banking Data", description: "Financial and banking reference", required: false, placeholder: "e.g. bank ref", width: "half" },
  // Box 29
  { box: "29", label: "Office of Exit", description: "Customs office of exit", required: false, placeholder: "e.g. SE000100", width: "third" },
  // Box 30
  { box: "30", label: "Location of Goods", description: "Location where goods can be examined", required: true, placeholder: "e.g. warehouse address", width: "full" },
  // Box 31
  { box: "31", label: "Packages and Description of Goods", description: "Marks, numbers, quantity and description", required: true, placeholder: "e.g. 10 cartons - Industrial components", width: "full" },
  // Box 32
  { box: "32", label: "Item Number", description: "Item number in declaration", required: false, placeholder: "e.g. 1", width: "third" },
  // Box 33
  { box: "33", label: "Commodity Code", description: "Combined Nomenclature / HS code", required: true, placeholder: "e.g. 8471 30 00", width: "half" },
  // Box 34
  { box: "34", label: "Country Origin Code", description: "Country of origin code", required: true, placeholder: "e.g. SE", width: "third" },
  // Box 34a
  { box: "34a", label: "Country of Origin (Text)", description: "Country of origin full name", required: false, placeholder: "e.g. Sweden", width: "third" },
  // Box 35
  { box: "35", label: "Gross Mass (kg)", description: "Gross weight in kilograms", required: true, placeholder: "e.g. 158.0", width: "third" },
  // Box 36
  { box: "36", label: "Preference", description: "Tariff preference indicator", required: false, placeholder: "e.g. 100", width: "third" },
  // Box 37
  { box: "37", label: "Procedure", description: "Requested and previous procedure codes", required: true, placeholder: "e.g. 4000", width: "third" },
  // Box 38
  { box: "38", label: "Net Mass (kg)", description: "Net weight in kilograms", required: true, placeholder: "e.g. 145.5", width: "third" },
  // Box 39
  { box: "39", label: "Quota", description: "Quota order number", required: false, placeholder: "", width: "third" },
  // Box 40
  { box: "40", label: "Summary Declaration / Previous Document", description: "Reference to previous document", required: false, placeholder: "e.g. MRN number", width: "full" },
  // Box 41
  { box: "41", label: "Supplementary Units", description: "Quantity in supplementary units", required: false, placeholder: "e.g. 101 pieces", width: "half" },
  // Box 42
  { box: "42", label: "Item Price", description: "Price of item", required: true, placeholder: "e.g. 12500.00", width: "half" },
  // Box 43
  { box: "43", label: "Valuation Method", description: "Customs valuation method code", required: false, placeholder: "e.g. 1", width: "third" },
  // Box 44
  { box: "44", label: "Additional Information / Documents", description: "Licence numbers, certificates, additional info", required: false, placeholder: "e.g. licence no.", width: "full" },
  // Box 45
  { box: "45", label: "Adjustment", description: "Customs value adjustment", required: false, placeholder: "e.g. 0.00", width: "third" },
  // Box 46
  { box: "46", label: "Statistical Value", description: "Statistical value in national currency", required: true, placeholder: "e.g. 12500.00", width: "third" },
  // Box 47
  { box: "47", label: "Calculation of Taxes", description: "Type, tax base, rate, amount, method of payment", required: true, placeholder: "e.g. A50 / 12500 / 0% / 0.00 / E", width: "full" },
  // Box 48
  { box: "48", label: "Deferred Payment", description: "Deferred payment reference", required: false, placeholder: "", width: "half" },
  // Box 49
  { box: "49", label: "Identification of Warehouse", description: "Customs warehouse identification", required: false, placeholder: "e.g. SE warehouse ID", width: "half" },
  // Box 50
  { box: "50", label: "Principal / Authorized Signatory", description: "Name and signature of principal", required: true, placeholder: "Name, place, date", width: "full" },
  // Box 51
  { box: "51", label: "Offices of Transit and Country", description: "Offices and countries of transit", required: false, placeholder: "", width: "full" },
  // Box 52
  { box: "52", label: "Guarantee", description: "Guarantee type and reference", required: false, placeholder: "e.g. 1 / GRN123", width: "half" },
  // Box 53
  { box: "53", label: "Office of Destination and Country", description: "Destination customs office", required: false, placeholder: "e.g. FI000100", width: "half" },
  // Box 54
  { box: "54", label: "Place and Date, Signature and Name", description: "Declaration place, date and signature", required: true, placeholder: "e.g. Stockholm, 2026-05-27", width: "full" },
];

export const SAD_REQUIRED = SAD_FIELDS.filter(f => f.required).map(f => f.box);

export function calcSADCompletion(values: Record<string, string | null | undefined>) {
  const total = SAD_REQUIRED.length;
  const filled = SAD_REQUIRED.filter(k => values[`sad_${k}`]?.trim()).length;
  return { filled, total, pct: Math.round((filled / total) * 100) };
}
