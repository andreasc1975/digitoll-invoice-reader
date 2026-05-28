import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { calcCompletion } from "@/lib/fields";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a customs data extraction specialist. Extract fields from invoice documents and return ONLY raw JSON with no markdown, no backticks, no explanation.

Return exactly this structure:
{
  "digitoll": {
    "exp_name": {"value": "...", "confidence": "high|med|low"},
    "exp_address": {"value": "...", "confidence": "high|med|low"},
    "imp_name": {"value": "...", "confidence": "high|med|low"},
    "imp_address": {"value": "...", "confidence": "high|med|low"},
    "imp_id": {"value": null, "confidence": "low"},
    "totalValue": {"value": "...", "confidence": "high|med|low"},
    "currency": {"value": "...", "confidence": "high|med|low"},
    "totalNetWeight": {"value": "...", "confidence": "high|med|low"},
    "totalGrossWeight": {"value": "...", "confidence": "high|med|low"},
    "hsCode": {"value": null, "confidence": "low"},
    "originCountry": {"value": "...", "confidence": "high|med|low"},
    "destinationCountry": {"value": "...", "confidence": "high|med|low"},
    "customsValue": {"value": "...", "confidence": "high|med|low"},
    "procedureCode": {"value": null, "confidence": "low"},
    "modeOfTransport": {"value": "...", "confidence": "high|med|low"},
    "incoterm": {"value": "...", "confidence": "high|med|low"},
    "incotermPlace": {"value": "...", "confidence": "high|med|low"},
    "transportRef": {"value": null, "confidence": "low"}
  },
  "sad": {
    "2": {"value": "...", "confidence": "high|med|low"},
    "8": {"value": "...", "confidence": "high|med|low"}
  },
  "items": [
    {
      "article": "...",
      "description": "...",
      "hs_code": null,
      "origin_country": "SE",
      "procedure_code": null,
      "no_of_parcels": 10,
      "net_weight": 100.5,
      "gross_weight": 110.0,
      "amount": 5000.0,
      "currency": "EUR",
      "quantity": 10,
      "quantity_unit": "pieces",
      "marks_and_numbers": null
    }
  ]
}

Use null for unknown values. All numeric fields (no_of_parcels, net_weight, gross_weight, amount, quantity) must be numbers, never empty strings.`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const invoiceId = formData.get("invoiceId") as string;

    if (!file || !invoiceId) {
      return NextResponse.json({ error: "Missing file or invoiceId" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const isPdf = file.type === "application/pdf";
    const mediaType = isPdf ? "application/pdf" : (file.type as "image/jpeg" | "image/png" | "image/webp");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          isPdf
            ? { type: "document", source: { type: "base64", media_type: mediaType, data: base64 } }
            : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: 'Extract all Digitoll fields, SAD box fields, and individual line items. Return ONLY raw JSON: {"digitoll":{...},"sad":{...},"items":[...]}' },
        ] as Anthropic.MessageParam["content"],
      }],
    });

    const rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as Anthropic.TextBlock).text)
      .join("");

    const clean = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

    let parsed: { digitoll?: Record<string, unknown>; sad?: Record<string, unknown>; items?: Record<string, unknown>[] };
    try {
      parsed = JSON.parse(clean);
    } catch {
      console.error("JSON parse failed. Raw:", rawText.slice(0, 500));
      return NextResponse.json({ error: "AI returned invalid JSON", raw: rawText.slice(0, 300) }, { status: 422 });
    }

    console.log("Parsed digitoll keys:", Object.keys(parsed.digitoll ?? {}));

    const db = supabaseAdmin();
    const upsertRows: { invoice_id: string; field_key: string; field_value: string | null; confidence: string; source: string }[] = [];

    const digitollFields = parsed.digitoll ?? {};
    for (const [key, data] of Object.entries(digitollFields)) {
      if (!data || typeof data !== "object") continue;
      const d = data as { value: string | null; confidence: string };
      upsertRows.push({ invoice_id: invoiceId, field_key: key, field_value: d.value ?? null, confidence: d.confidence ?? "low", source: "ai" });
    }

    const sadFields = parsed.sad ?? {};
    for (const [key, data] of Object.entries(sadFields)) {
      if (!data || typeof data !== "object") continue;
      const d = data as { value: string | null; confidence: string };
      upsertRows.push({ invoice_id: invoiceId, field_key: `sad_${key}`, field_value: d.value ?? null, confidence: d.confidence ?? "low", source: "ai" });
    }

    console.log("Total upsertRows:", upsertRows.length);

    if (upsertRows.length > 0) {
      const { error: fieldsError } = await db
        .from("invoice_fields")
        .upsert(upsertRows, { onConflict: "invoice_id,field_key" });
      console.log("UPSERT error:", JSON.stringify(fieldsError));
      console.log("First row:", JSON.stringify(upsertRows[0]));
      if (fieldsError) {
        return NextResponse.json({ error: "DB error saving fields", detail: fieldsError.message }, { status: 500 });
      }
    }

    const items = parsed.items ?? [];
    if (items.length > 0) {
      await db.from("invoice_items").delete().eq("invoice_id", invoiceId);
      const itemRows = items.map((item: Record<string, unknown>, idx: number) => ({
        invoice_id: invoiceId,
        line_nr: idx + 1,
        article:           item.article ?? null,
        description:       item.description ?? null,
        hs_code:           item.hs_code ?? null,
        origin_country:    item.origin_country ?? null,
        procedure_code:    item.procedure_code ?? null,
        no_of_parcels:     item.no_of_parcels ?? null,
        net_weight:        item.net_weight ?? null,
        gross_weight:      item.gross_weight ?? null,
        amount:            item.amount ?? null,
        currency:          item.currency ?? null,
        quantity:          item.quantity ?? null,
        quantity_unit:     item.quantity_unit ?? null,
        marks_and_numbers: item.marks_and_numbers ?? null,
      }));
      const { error: insertError } = await db.from("invoice_items").insert(itemRows);
      if (insertError) console.error("invoice_items insert error:", insertError);
    }

    const valueMap: Record<string, string | null> = {};
    Object.entries(digitollFields).forEach(([k, v]) => {
      valueMap[k] = (v as { value: string | null }).value;
    });
    const { pct } = calcCompletion(valueMap);
    await db.from("invoices").update({ status: "extracted", completion_pct: pct }).eq("id", invoiceId);

    return NextResponse.json({ success: true, completionPct: pct, itemCount: items.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Extract error:", msg);
    return NextResponse.json({ error: "Extraction failed", detail: msg }, { status: 500 });
  }
}