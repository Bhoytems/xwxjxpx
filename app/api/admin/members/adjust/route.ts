import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase";

// body: { username, type: "WJP" | "COLLAB", tokenId?, mode: "add" | "set", amount }
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { username, type, tokenId, mode, amount } = await req.json();
  if (!username || !type || !mode || amount == null) {
    return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 });
  }
  if (type === "COLLAB" && !tokenId) {
    return NextResponse.json({ ok: false, error: "tokenId required for collab token adjustments." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: member, error: mErr } = await db
    .from("members")
    .select("*")
    .eq("username", username.toLowerCase().replace(/^@/, ""))
    .maybeSingle();
  if (mErr) return NextResponse.json({ ok: false, error: mErr.message }, { status: 500 });
  if (!member) return NextResponse.json({ ok: false, error: `No member found for @${username}.` }, { status: 404 });

  if (type === "WJP") {
    const newValue = mode === "set" ? Number(amount) : Number(member.wjp_points) + Number(amount);
    if (newValue < 0) return NextResponse.json({ ok: false, error: "WJP balance can't go negative." }, { status: 400 });
    const { data: updated, error } = await db
      .from("members")
      .update({ wjp_points: newValue, updated_at: new Date().toISOString() })
      .eq("id", member.id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, member: updated });
  }

  // COLLAB
  const { data: existing } = await db
    .from("member_token_balances")
    .select("balance")
    .eq("member_id", member.id)
    .eq("token_id", tokenId)
    .maybeSingle();

  const newValue = mode === "set" ? Number(amount) : Number(existing?.balance || 0) + Number(amount);
  if (newValue < 0) return NextResponse.json({ ok: false, error: "Token balance can't go negative." }, { status: 400 });

  if (existing) {
    await db.from("member_token_balances").update({ balance: newValue }).eq("member_id", member.id).eq("token_id", tokenId);
  } else {
    await db.from("member_token_balances").insert({ member_id: member.id, token_id: tokenId, balance: newValue });
  }

  return NextResponse.json({ ok: true, balance: newValue });
}
