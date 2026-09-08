import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase";
import { isValidPolygonAddress } from "@/lib/polygon";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const db = supabaseAdmin();
  const { data, error } = await db.from("collab_tokens").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, tokens: data });
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { symbol, name, contract_address, decimals, usd_price } = await req.json();
  if (!symbol || !name || !contract_address) {
    return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 });
  }
  if (!isValidPolygonAddress(contract_address)) {
    return NextResponse.json({ ok: false, error: "Invalid Polygon contract address." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("collab_tokens")
    .insert({
      symbol: symbol.toUpperCase(),
      name,
      contract_address,
      decimals: decimals ?? 18,
      usd_price: usd_price ?? null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, token: data });
}
