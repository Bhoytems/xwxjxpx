import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase";
import { getNativeBalance, getErc20Balance, getDistributorAddress } from "@/lib/polygon";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const db = supabaseAdmin();

  const [{ data: pricingRow }, { data: members }, { data: tokens }, { data: balances }] = await Promise.all([
    db.from("settings").select("value").eq("key", "pricing").maybeSingle(),
    db.from("members").select("wjp_points"),
    db.from("collab_tokens").select("id, symbol, name, contract_address, decimals, usd_price"),
    db.from("member_token_balances").select("token_id, balance"),
  ]);

  const pricing = pricingRow?.value ?? { wjp_usd_price: 0, pol_usd_price: 0 };
  const wjpUsdPrice = Number(pricing.wjp_usd_price) || 0;
  const polUsdPrice = Number(pricing.pol_usd_price) || 0;

  const totalWjp = (members || []).reduce((s, m) => s + Number(m.wjp_points || 0), 0);
  const wjpUsdValue = totalWjp * wjpUsdPrice;
  const wjpPolValue = polUsdPrice > 0 ? wjpUsdValue / polUsdPrice : 0;

  const tokenTotals = (tokens || []).map((t) => {
    const total = (balances || [])
      .filter((b) => b.token_id === t.id)
      .reduce((s, b) => s + Number(b.balance || 0), 0);
    const usdPrice = Number(t.usd_price) || 0;
    const usdValue = total * usdPrice;
    const polValue = polUsdPrice > 0 ? usdValue / polUsdPrice : 0;
    return { id: t.id, symbol: t.symbol, name: t.name, total, usdValue, polValue };
  });

  // Live on-chain wallet balances. If the distributor wallet isn't configured
  // yet, don't fail the whole overview - just report it as unavailable.
  let wallet: any = { configured: false };
  try {
    const address = getDistributorAddress();
    const nativePol = await getNativeBalance(address);
    const tokenBalances = await Promise.all(
      (tokens || []).map(async (t) => {
        try {
          const bal = await getErc20Balance(t.contract_address, address, t.decimals);
          const usdValue = bal * (Number(t.usd_price) || 0);
          return { symbol: t.symbol, balance: bal, usdValue };
        } catch {
          return { symbol: t.symbol, balance: null, usdValue: 0, error: "Could not read balance" };
        }
      })
    );
    const nativeUsdValue = nativePol * polUsdPrice;
    const tokensUsdTotal = tokenBalances.reduce((s, t) => s + (t.usdValue || 0), 0);
    const totalUsd = nativeUsdValue + tokensUsdTotal;
    const totalPol = polUsdPrice > 0 ? totalUsd / polUsdPrice : nativePol;

    wallet = {
      configured: true,
      address,
      nativePol,
      nativeUsdValue,
      tokenBalances,
      totalUsd,
      totalPol,
    };
  } catch (e: any) {
    wallet = { configured: false, error: e.message };
  }

  return NextResponse.json({
    ok: true,
    pricing,
    wjp: { total: totalWjp, usdValue: wjpUsdValue, polValue: wjpPolValue },
    tokens: tokenTotals,
    wallet,
  });
}
