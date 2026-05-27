import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { FIELDS, calcCompletion } from "@/lib/fields";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = "You are a customs data extraction specialist. Extract specific fields from invoice documents for Digitoll customs declarations. Extract ONLY what is explicitly stated. If a field is not found, return null. Confidence: high=clearly stated, med=inferred, low=uncertain. Return ONLY valid JSON: {\"fields\":{\"exp_name\":{\"value\":\"...\",\"confidence\":\"high\"},\"exp_address\":{\"value\":\"...\",\"confidence\":\"high\"},\"imp_name\":{\"value\":\"...\",\"confidence\":\"high\"},\"imp_address\":{\"value\":\"...\",\"confidence\":\"high\"},\"imp_id\":{\"value\":null,\"confidence\":\"low\"},\"totalValue\":{\"value\":\"...\",\"confidence\":\"high\"},\"currency\":{\"value\":\"...\",\"confidence\":\"high\"},\"totalNetWeight\":{\"value\":\"...\",\"confidence\":\"high\"},\"totalGrossWeight\":{\"value\":\"...\",\"confidence\":\"high\"},\"hsCode\":{\"value\":null,\"confidence\":\"low\"},\"originCountry\":{\"value\":\"...\",\"confidence\":\"high\"},\"destinationCountry\":{\"value\":\"...\",\"confidence\":\"high\"},\"customsValue\":{\"value\":\"...\",\"confidence\":\"high\"},\"procedureCode\":{\"value\":null,\"confidence\":\"low\"},\"modeOfTransport\":{\"value\":\"...\",\"confidence\":\"high\"},\"incoterm\":{\"value\":\"...\",\"confidence\":\"high\"},\"incotermPlace\":{\"value\":\"...\",\"confidence\":\"high\"},\"transportRef\":{\"value\":null,\"confidence\":\"low\"}}}";

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
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            isPdf
              ? { type: "document", source: { type: "base64", media_type: mediaType, data: base64 } }
              : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: "Extract all Digitoll customs fields from this invoice document." },
          ] as Anthropic.MessageParam["content"],
        },
      ],
    });

    const rawText = message.content.filter((b) => b.type === "text").map((b) => (b as Anthropic.TextBlock).text).join("");
    const clean = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    const extractedFields: Record<string, { value: string | null; confidence: string }> = parsed.fields;

    const db = supabaseAdmin();
    const upsertRows = Object.entries(extractedFields).map(([key, data]) => ({
      invoice_id: invoiceId,
      field_key: key,
      field_value: data.value,
      confidence: data.confidence,
      source: "ai",
    }));

    await db.from("invoice_fields").upsert(upsertRows, { onConflict: "invoice_id,field_key" });

    const valueMap: Record<string, string | null> = {};
    Object.entries(extractedFields).forEach(([k, v]) => { valueMap[k] = v.value; });
    const { pct } = calcCompletion(valueMap);

    await db.from("invoices").update({ status: "extracted", completion_pct: pct }).eq("id", invoiceId);

    return NextResponse.json({ success: true, fields: extractedFields, completionPct: pct });
  } catch (err) {
    console.error("Extract error:", err);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
