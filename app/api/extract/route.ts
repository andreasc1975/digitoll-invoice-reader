import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { FIELDS, calcCompletion } from "@/lib/fields";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a customs data extraction specialist. Your task is to extract specific fields from invoice documents for Digitoll customs declarations.

Extract ONLY what is explicitly stated in the document. If a field is not found, return null for that field.
For confidence levels:
- "high": clearly stated, unambiguous
- "med": inferred or partially stated  
- "low": uncertain or guessed

Return ONLY valid JSON, no markdown, no explanation. Use this exact structure:
{
  "fields": {
    "exp_name": { "value": "...", "confidence": "high|med|low" },
    "exp_address": { "value": "...", "confidence": "high|med|low" },
    "imp_name": { "value": "...", "confidence": "high|med|low" },
    "imp_address": { "value": "...", "confidence": "high|med|low" },
    "imp_id": { "value": "...", "confidence": "high|med|low" },
    "totalValue": { "value": "...", "confidence": "high|med|low" },
    "currency": { "value": "...", "confidence": "high|med|low" },
    "totalNetWeight": { "value": "...", "confidence": "high|med|low" },
    "totalGrossWeight": { "value": "...", "confidence": "high|med|low" },
    "hsCode": { "value": null, "confidence": "low" },
    "originCountry": { "value": "...", "confidence": "high|med|low" },
    "destinationCountry": { "value": "...", "confidence": "high|med|low" },
    "customsValue": { "value": "...", "confidence": "high|med|low" },
    "procedureCode": { "value": null, "confidence": "low" },
    "modeOfTransport": { "value": "...", "confidence": "high|med|low" },
    "incoterm": { "value": "...", "confidence": "high|med|low" },
    "incotermPlace": { "value": "...", "confidence": "high|med|low" },
    "transportRef": { "value": null, "confidence": "low" }
  }
}`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const invoiceId = formData.get("invoiceId") as string;

    if (!file || !invoiceId) {
      return NextResponse.json({ error: "Missing file or invoiceId" }, { status: 400 });
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const isPdf = file.type === "application/pdf";
    const mediaType = isPdf ? "application/pdf" : (file.type as "image/jpeg" | "image/png" | "image/webp");

    // Call Claude with the document
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
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

    // Save to Supabase
    const db = supabaseAdmin();
    const upsertRows = Object.entries(extractedFields).map(([key, data]) => ({
      invoice_id: invoiceId,
      field_key: key,
      field_value: data.value,
      confidence: data.confidence,
      source: "ai",
    }));

    await db.from("invoice_fields").upsert(upsertRows, { onConflict: "invoice_id,field_key" });

    // Calculate completion and update invoice status
    const valueMap: Record<string, string | null> = {};
    Object.entries(extractedFields).forEach(([k, v]) => { valueMap[k] = v.value; });
    const { pct } = calcCompletion(valueMap);

    await db.from("invoices").update({
      status: "extracted",
      completion_pct: pct,
    }).eq("id", invoiceId);

    return NextResponse.json({ success: true, fields: extractedFields, completionPct: pct });
  } catch (err) {
    console.error("Extract error:", err);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
