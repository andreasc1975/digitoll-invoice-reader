import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("companies")
    .select("*")
    .ilike("name", `%${q}%`)
    .order("name")
    .limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const db = supabaseAdmin();
  const body = await req.json();
  const { data, error } = await db
    .from("companies")
    .insert({
      name:         body.name,
      address:      body.address ?? null,
      city:         body.city ?? null,
      country_code: body.country_code ?? null,
      post_code:    body.post_code ?? null,
      phone_no:     body.phone_no ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
