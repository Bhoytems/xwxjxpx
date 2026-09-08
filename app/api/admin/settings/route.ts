import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const db = supabaseAdmin();
  const { data, error } = await db.from("settings").select("*").eq("key", "ads").maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ads: data?.value ?? { mode: "none", adsterra_code: "", direct_link: "" } });
}

export async function PUT(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const body = await req.json();
  const value = {
    mode: body.mode === "adsterra" ? "adsterra" : body.mode === "direct" ? "direct" : "none",
    adsterra_code: body.adsterra_code || "",
    direct_link: body.direct_link || "",
  };

  const db = supabaseAdmin();
  const { error } = await db.from("settings").upsert({ key: "ads", value });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ads: value });
}
