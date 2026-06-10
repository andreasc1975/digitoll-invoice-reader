import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: invoice } = await db
    .from("invoices")
    .select("file_path")
    .eq("id", id)
    .single();

  if (!invoice?.file_path) {
    return NextResponse.json({ error: "No file path" }, { status: 404 });
  }

  const { data, error } = await db.storage
    .from("invoices")
    .createSignedUrl(invoice.file_path, 3600); // 1 timme

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
