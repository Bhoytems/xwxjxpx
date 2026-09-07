import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase";
import { sendErc20, sendNativePol } from "@/lib/polygon";

// POST body: { tokenType: "WJP" | "COLLAB", tokenId?: string, confirm?: boolean }
// Without confirm=true this only returns a PREVIEW (who would get paid, how much) —
// nothing is sent on-chain and no balances change. This is deliberate: a
// mis-click here would otherwise move real funds.
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { tokenType, tokenId, confirm } = await req.json();
  const db = supabaseAdmin();

  if (tokenType === "WJP") {
    const [{ data: pricingRow }, { data: distRow }] = await Promise.all([
      db.from("settings").select("value").eq("key", "pricing").maybeSingle(),
      db.from("settings").select("value").eq("key", "distribution").maybeSingle(),
    ]);
    const wjpUsdPrice = Number(pricingRow?.value?.wjp_usd_price) || 0;
    const polUsdPrice = Number(pricingRow?.value?.pol_usd_price) || 0;
    const minWjp = Number(distRow?.value?.min_wjp_distribution) || 0;

    if (wjpUsdPrice <= 0 || polUsdPrice <= 0) {
      return NextResponse.json(
        { ok: false, error: "Set both the WJP price and the POL price in Overview before distributing WJP." },
        { status: 400 }
      );
    }

    const { data: allMembers, error } = await db
      .from("members")
      .select("id, username, wallet_address, wjp_points")
      .gt("wjp_points", 0)
      .not("wallet_address", "is", null);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const eligible = allMembers.filter((m) => Number(m.wjp_points) >= minWjp);
    const belowThreshold = allMembers.length - eligible.length;

    const recipients = eligible.map((m) => ({
      id: m.id,
      username: m.username,
      wallet: m.wallet_address,
      wjpAmount: Number(m.wjp_points),
      polAmount: (Number(m.wjp_points) * wjpUsdPrice) / polUsdPrice,
    }));

    if (!confirm) {
      return NextResponse.json({
        ok: true,
        preview: true,
        onchain: true,
        minWjp,
        belowThreshold,
        recipients: recipients.map((r) => ({ username: r.username, wallet: r.wallet, amount: r.polAmount, wjpAmount: r.wjpAmount })),
      });
    }

    const { data: run } = await db
      .from("distribution_runs")
      .insert({ token_type: "WJP", total_recipients: recipients.length, status: "running" })
      .select("*")
      .single();

    const details: any[] = [];
    for (const r of recipients) {
      try {
        const tx = await sendNativePol(r.wallet, r.polAmount);
        details.push({ username: r.username, amount: r.polAmount.toFixed(6), tx: tx.hash });
        await db.from("members").update({ wjp_points: 0 }).eq("id", r.id);
      } catch (e: any) {
        details.push({ username: r.username, amount: r.polAmount.toFixed(6), error: e.message });
      }
    }

    await db
      .from("distribution_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        total_amount: recipients.reduce((s, r) => s + r.polAmount, 0),
        details,
      })
      .eq("id", run.id);

    return NextResponse.json({ ok: true, run: run.id, details });
  }

  if (tokenType === "COLLAB") {
    if (!tokenId) return NextResponse.json({ ok: false, error: "tokenId required." }, { status: 400 });

    const { data: token } = await db.from("collab_tokens").select("*").eq("id", tokenId).single();
    if (!token) return NextResponse.json({ ok: false, error: "Token not found." }, { status: 404 });

    const { data: balances, error } = await db
      .from("member_token_balances")
      .select("member_id, balance, members(username, wallet_address)")
      .eq("token_id", tokenId)
      .gt("balance", 0);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const payable = (balances as any[]).filter((b) => b.members?.wallet_address);

    if (!confirm) {
      return NextResponse.json({
        ok: true,
        preview: true,
        onchain: true,
        recipients: payable.map((b) => ({ username: b.members.username, wallet: b.members.wallet_address, amount: b.balance })),
      });
    }

    const { data: run } = await db
      .from("distribution_runs")
      .insert({ token_type: token.symbol, token_id: token.id, total_recipients: payable.length, status: "running" })
      .select("*")
      .single();

    const details: any[] = [];
    for (const b of payable) {
      try {
        const tx = await sendErc20(token.contract_address, b.members.wallet_address, Number(b.balance), token.decimals);
        details.push({ username: b.members.username, amount: b.balance, tx: tx.hash });
        await db.from("member_token_balances").update({ balance: 0 }).eq("member_id", b.member_id).eq("token_id", tokenId);
      } catch (e: any) {
        details.push({ username: b.members.username, amount: b.balance, error: e.message });
      }
    }

    await db
      .from("distribution_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        total_amount: payable.reduce((s, b) => s + Number(b.balance), 0),
        details,
      })
      .eq("id", run.id);

    return NextResponse.json({ ok: true, run: run.id, details });
  }

  return NextResponse.json({ ok: false, error: "Invalid tokenType." }, { status: 400 });
}
