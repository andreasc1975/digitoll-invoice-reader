import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: invoice } = await db.from("invoices").select("file_path, file_name").eq("id", id).single();
  if (!invoice?.file_path) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await db.storage.from("invoices").download(invoice.file_path);
  if (error || !data) return NextResponse.json({ error: "File not found" }, { status: 404 });

  const ext = invoice.file_name.split(".").pop()?.toLowerCase();
  const contentType = ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : "image/jpeg";

  return new NextResponse(data, {
    headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=3600" },
  });
}