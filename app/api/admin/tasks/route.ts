import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("tasks")
    .select("*, collab_tokens(symbol, name)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, tasks: data });
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const body = await req.json();
  const { name, description, link, reward_type, collab_token_id, reward_amount, active } = body;

  if (!name || !link || !reward_type || reward_amount == null) {
    return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 });
  }
  if (reward_type === "COLLAB" && !collab_token_id) {
    return NextResponse.json({ ok: false, error: "Select a collab token for this reward type." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("tasks")
    .insert({
      name,
      description: description || null,
      link,
      reward_type,
      collab_token_id: reward_type === "COLLAB" ? collab_token_id : null,
      reward_amount,
      active: active ?? true,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, task: data });
}
