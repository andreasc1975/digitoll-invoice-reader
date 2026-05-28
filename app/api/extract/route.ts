import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { calcCompletion } from "@/lib/fields";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = "You are a customs data extraction specialist. Extract fields from invoice documents for Digitoll electronic declarations, full SAD customs declarations, and individual line items. Return ONLY valid JSON with three sections: digitoll, sad, and items. The items array contains individual goods/article lines found in the invoice. Example: {\"digitoll\":{\"exp_name\":{\"value\":\"Company AB\",\"confidence\":\"high\"},\"exp_address\":{\"value\":\"Street 1, City\",\"confidence\":\"high\"},\"imp_name\":{\"value\":null,\"confidence\":\"low\"},\"imp_address\":{\"value\":null,\"confidence\":\"low\"},\"imp_id\":{\"value\":null,\"confidence\":\"low\"},\"totalValue\":{\"value\":\"10500\",\"confidence\":\"high\"},\"currency\":{\"value\":\"EUR\",\"confidence\":\"high\"},\"totalNetWeight\":{\"value\":\"950\",\"confidence\":\"high\"},\"totalGrossWeight\":{\"value\":\"1050\",\"confidence\":\"high\"},\"hsCode\":{\"value\":null,\"confidence\":\"low\"},\"originCountry\":{\"value\":\"SE\",\"confidence\":\"high\"},\"destinationCountry\":{\"value\":\"NO\",\"confidence\":\"high\"},\"customsValue\":{\"value\":\"10500\",\"confidence\":\"high\"},\"procedureCode\":{\"value\":null,\"confidence\":\"low\"},\"modeOfTransport\":{\"value\":\"Road\",\"confidence\":\"high\"},\"incoterm\":{\"value\":\"DAP\",\"confidence\":\"high\"},\"incotermPlace\":{\"value\":\"Oslo\",\"confidence\":\"high\"},\"transportRef\":{\"value\":null,\"confidence\":\"low\"}},\"sad\":{\"1\":{\"value\":null,\"confidence\":\"low\"},\"2\":{\"value\":\"Company AB, Street 1\",\"confidence\":\"high\"},\"3\":{\"value\":null,\"confidence\":\"low\"},\"4\":{\"value\":null,\"confidence\":\"low\"},\"5\":{\"value\":\"1\",\"confidence\":\"high\"},\"6\":{\"value\":\"101\",\"confidence\":\"high\"},\"7\":{\"value\":null,\"confidence\":\"low\"},\"8\":{\"value\":null,\"confidence\":\"low\"},\"9\":{\"value\":null,\"confidence\":\"low\"},\"10\":{\"value\":null,\"confidence\":\"low\"},\"11\":{\"value\":null,\"confidence\":\"low\"},\"12\":{\"value\":\"EUR\",\"confidence\":\"high\"},\"13\":{\"value\":null,\"confidence\":\"low\"},\"14\":{\"value\":null,\"confidence\":\"low\"},\"15\":{\"value\":\"SE\",\"confidence\":\"high\"},\"15a\":{\"value\":\"SE\",\"confidence\":\"high\"},\"16\":{\"value\":\"SE\",\"confidence\":\"high\"},\"17\":{\"value\":\"NO\",\"confidence\":\"high\"},\"17a\":{\"value\":\"NO\",\"confidence\":\"high\"},\"18\":{\"value\":null,\"confidence\":\"low\"},\"19\":{\"value\":null,\"confidence\":\"low\"},\"20\":{\"value\":\"DAP Oslo\",\"confidence\":\"high\"},\"21\":{\"value\":null,\"confidence\":\"low\"},\"22\":{\"value\":\"EUR 10500\",\"confidence\":\"high\"},\"23\":{\"value\":null,\"confidence\":\"low\"},\"24\":{\"value\":null,\"confidence\":\"low\"},\"25\":{\"value\":\"3\",\"confidence\":\"high\"},\"26\":{\"value\":null,\"confidence\":\"low\"},\"27\":{\"value\":null,\"confidence\":\"low\"},\"28\":{\"value\":null,\"confidence\":\"low\"},\"29\":{\"value\":null,\"confidence\":\"low\"},\"30\":{\"value\":null,\"confidence\":\"low\"},\"31\":{\"value\":\"Industrial components\",\"confidence\":\"high\"},\"32\":{\"value\":null,\"confidence\":\"low\"},\"33\":{\"value\":null,\"confidence\":\"low\"},\"34\":{\"value\":\"SE\",\"confidence\":\"high\"},\"34a\":{\"value\":\"Sweden\",\"confidence\":\"high\"},\"35\":{\"value\":\"1050\",\"confidence\":\"high\"},\"36\":{\"value\":null,\"confidence\":\"low\"},\"37\":{\"value\":null,\"confidence\":\"low\"},\"38\":{\"value\":\"950\",\"confidence\":\"high\"},\"39\":{\"value\":null,\"confidence\":\"low\"},\"40\":{\"value\":null,\"confidence\":\"low\"},\"41\":{\"value\":\"101\",\"confidence\":\"high\"},\"42\":{\"value\":\"10500\",\"confidence\":\"high\"},\"43\":{\"value\":null,\"confidence\":\"low\"},\"44\":{\"value\":null,\"confidence\":\"low\"},\"45\":{\"value\":null,\"confidence\":\"low\"},\"46\":{\"value\":\"10500\",\"confidence\":\"high\"},\"47\":{\"value\":null,\"confidence\":\"low\"},\"48\":{\"value\":null,\"confidence\":\"low\"},\"49\":{\"value\":null,\"confidence\":\"low\"},\"50\":{\"value\":null,\"confidence\":\"low\"},\"51\":{\"value\":null,\"confidence\":\"low\"},\"52\":{\"value\":null,\"confidence\":\"low\"},\"53\":{\"value\":null,\"confidence\":\"low\"},\"54\":{\"value\":null,\"confidence\":\"low\"}},\"items\":[{\"article\":\"Industrial components\",\"description\":\"Industrial components for machinery\",\"hs_code\":null,\"origin_country\":\"SE\",\"procedure_code\":null,\"no_of_parcels\":101,\"net_weight\":950,\"gross_weight\":1050,\"amount\":10500,\"currency\":\"EUR\",\"quantity\":101,\"quantity_unit\":\"pieces\",\"marks_and_numbers\":null}]}";

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
      messages: [
        {
          role: "user",
          content: [
            isPdf
              ? { type: "document", source: { type: "base64", media_type: mediaType, data: base64 } }
              : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: "Extract all Digitoll fields, SAD box fields, and individual line items from this invoice." },
          ] as Anthropic.MessageParam["content"],
        },
      ],
    });

    const rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as Anthropic.TextBlock).text)
      .join("");
    const clean = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    const db = supabaseAdmin();
    const upsertRows: { invoice_id: string; field_key: string; field_value: string | null; confidence: string; source: string }[] = [];

    // Digitoll fields
    const digitollFields = parsed.digitoll || {};
    Object.entries(digitollFields).forEach(([key, data]: [string, unknown]) => {
      const d = data as { value: string | null; confidence: string };
      upsertRows.push({ invoice_id: invoiceId, field_key: key, field_value: d.value, confidence: d.confidence, source: "ai" });
    });

    // SAD fields
    const sadFields = parsed.sad || {};
    Object.entries(sadFields).forEach(([key, data]: [string, unknown]) => {
      const d = data as { value: string | null; confidence: string };
      upsertRows.push({ invoice_id: invoiceId, field_key: `sad_${key}`, field_value: d.value, confidence: d.confidence, source: "ai" });
    });

    await db.from("invoice_fields").upsert(upsertRows, { onConflict: "invoice_id,field_key" });

    // Save items
    const items = parsed.items || [];
    if (items.length > 0) {
      await db.from("invoice_items").delete().eq("invoice_id", invoiceId);
      const itemRows = items.map((item: Record<string, unknown>, idx: number) => ({
        ...item,
        invoice_id: invoiceId,
        line_nr: idx + 1,
      }));
      await db.from("invoice_items").insert(itemRows);
    }

    // Calculate completion
    const valueMap: Record<string, string | null> = {};
    Object.entries(digitollFields).forEach(([k, v]: [string, unknown]) => {
      valueMap[k] = (v as { value: string | null }).value;
    });
    const { pct } = calcCompletion(valueMap);
    await db.from("invoices").update({ status: "extracted", completion_pct: pct }).eq("id", invoiceId);

    return NextResponse.json({ success: true, completionPct: pct, itemCount: items.length });
  } catch (err) {
    console.error("Extract error:", err);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
