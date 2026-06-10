import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/invoices – list all invoices with their fields
export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("invoices")
    .select("*, invoice_fields(*), file_path")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/invoices – create invoice record, upload file, trigger extraction
export async function POST(req: NextRequest) {
  const db = supabaseAdmin();
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const sessionId = formData.get("session_id") as string | null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  // Create invoice row
  const { data: invoice, error: insertError } = await db
    .from("invoices")
    .insert({
      file_name: file.name,
      file_size: file.size,
      status: "processing",
      completion_pct: 0,
      session_id: sessionId ?? null,
    })
    .select()
    .single();

  if (insertError || !invoice) {
    return NextResponse.json({ error: insertError?.message ?? "Insert failed" }, { status: 500 });
  }

  // Upload to Supabase Storage
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const filePath = `${invoice.id}/${file.name}`;

  const { error: uploadError } = await db.storage.from("invoices").upload(filePath, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
  } else {
    await db.from("invoices").update({ file_path: filePath }).eq("id", invoice.id);
  }

  return NextResponse.json(invoice);
}
