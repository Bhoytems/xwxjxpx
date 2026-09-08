import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { makeFingerprint, evaluateClick } from "@/lib/fraud";

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const db = supabaseAdmin();

  const { data: link } = await db
    .from("task_links")
    .select("id, member_id, task_id, tasks(link, reward_type, reward_amount, collab_token_id), members(telegram_id)")
    .eq("code", params.code)
    .maybeSingle();

  if (!link) return NextResponse.json({ ok: false, error: "Link not found." }, { status: 404 });

  const task = (link as any).tasks;
  const ownerTelegramId = (link as any).members?.telegram_id as number | undefined;

  const body = await req.json().catch(() => ({}));
  const visitorTelegramId: number | undefined = body?.telegramId;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  const fingerprint = makeFingerprint(ip, userAgent, visitorTelegramId ?? null);

  const isOwnerClick = !!visitorTelegramId && visitorTelegramId === ownerTelegramId;

  const { data: existingReward } = await db
    .from("click_events")
    .select("id")
    .eq("task_link_id", link.id)
    .eq("fingerprint", fingerprint)
    .eq("rewarded", true)
    .maybeSingle();

  const since = new Date(Date.now() - 1000 * 60 * 10).toISOString();
  const { data: recentClicks } = await db
    .from("click_events")
    .select("task_link_id")
    .eq("fingerprint", fingerprint)
    .gte("created_at", since);
  const distinctRecentLinks = new Set((recentClicks || []).map((c) => c.task_link_id)).size;

  const verdict = evaluateClick({
    isOwnerClick,
    alreadyRewardedForThisLink: !!existingReward,
    recentDistinctLinksForFingerprint: distinctRecentLinks,
  });

  await db.from("click_events").insert({
    task_link_id: link.id,
    fingerprint,
    telegram_id: visitorTelegramId ?? null,
    rewarded: verdict.allow,
    reject_reason: verdict.reason ?? null,
  });

  if (verdict.allow) {
    const { data: currentLink } = await db.from("task_links").select("clicks").eq("id", link.id).single();
    await db.from("task_links").update({ clicks: Number(currentLink?.clicks || 0) + 1 }).eq("id", link.id);

    if (task.reward_type === "COLLAB" && task.collab_token_id) {
      const { data: bal } = await db
        .from("member_token_balances")
        .select("balance")
        .eq("member_id", link.member_id)
        .eq("token_id", task.collab_token_id)
        .maybeSingle();
      if (bal) {
        await db
          .from("member_token_balances")
          .update({ balance: Number(bal.balance) + Number(task.reward_amount) })
          .eq("member_id", link.member_id)
          .eq("token_id", task.collab_token_id);
      } else {
        await db
          .from("member_token_balances")
          .insert({ member_id: link.member_id, token_id: task.collab_token_id, balance: task.reward_amount });
      }
    } else {
      const { data: member } = await db.from("members").select("wjp_points").eq("id", link.member_id).single();
      await db
        .from("members")
        .update({ wjp_points: Number(member?.wjp_points || 0) + Number(task.reward_amount) })
        .eq("id", link.member_id);
    }

    const { data: memberRow } = await db.from("members").select("tasks_completed").eq("id", link.member_id).single();
    await db
      .from("members")
      .update({ tasks_completed: Number(memberRow?.tasks_completed || 0) + 1 })
      .eq("id", link.member_id);
  }

  return NextResponse.json({ ok: true, rewarded: verdict.allow, destination: task.link });
}
