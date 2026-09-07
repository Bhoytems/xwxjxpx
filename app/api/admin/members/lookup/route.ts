import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const username = req.nextUrl.searchParams.get("username")?.toLowerCase().replace(/^@/, "");
  if (!username) return NextResponse.json({ ok: false, error: "username is required." }, { status: 400 });

  const db = supabaseAdmin();
  const { data: member, error } = await db.from("members").select("*").eq("username", username).maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!member) return NextResponse.json({ ok: false, error: `No member found for @${username}.` }, { status: 404 });

  const { data: balances } = await db
    .from("member_token_balances")
    .select("balance, token_id, collab_tokens(id, symbol, name)")
    .eq("member_id", member.id);

  return NextResponse.json({ ok: true, member, balances: balances || [] });
}
