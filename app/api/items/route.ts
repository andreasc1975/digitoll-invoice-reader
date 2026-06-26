import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const db = supabaseAdmin();

  const { data, error } = await db
    .from("items")
    .select("id, item_no, item_name, species, quality, size, eu_customtariff")
    .or(`item_name.ilike.%${q}%,item_no.ilike.%${q}%,species.ilike.%${q}%`)
    .order("item_no")
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}