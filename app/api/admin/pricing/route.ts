import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const db = supabaseAdmin();
  const { data } = await db.from("settings").select("value").eq("key", "pricing").maybeSingle();
  return NextResponse.json({ ok: true, pricing: data?.value ?? { wjp_usd_price: 0, pol_usd_price: 0 } });
}

export async function PUT(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { wjp_usd_price, pol_usd_price } = await req.json();
  const value = {
    wjp_usd_price: Number(wjp_usd_price) || 0,
    pol_usd_price: Number(pol_usd_price) || 0,
  };

  const db = supabaseAdmin();
  const { error } = await db.from("settings").upsert({ key: "pricing", value });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, pricing: value });
}
