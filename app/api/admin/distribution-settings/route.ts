import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const db = supabaseAdmin();
  const { data } = await db.from("settings").select("value").eq("key", "distribution").maybeSingle();
  return NextResponse.json({ ok: true, distribution: data?.value ?? { min_wjp_distribution: 0 } });
}

export async function PUT(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { min_wjp_distribution } = await req.json();
  const value = { min_wjp_distribution: Number(min_wjp_distribution) || 0 };

  const db = supabaseAdmin();
  const { error } = await db.from("settings").upsert({ key: "distribution", value });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, distribution: value });
}
