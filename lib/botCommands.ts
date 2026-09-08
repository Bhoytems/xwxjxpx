import { supabaseAdmin } from "./supabase";
import { isValidPolygonAddress } from "./polygon";
import { nanoid } from "nanoid";
import { generateCaptcha } from "./captcha";

function isAdmin(telegramId: number) {
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  return !!adminId && String(telegramId) === adminId;
}

function notVerifiedReply(botUsername?: string) {
  const suffix = botUsername ? ` Tap the verification button ${botUsername} sent when you joined, or ask an admin to resend it.` : "";
  return `You're not verified yet.${suffix}`;
}

async function upsertMember(telegramId: number, username?: string) {
  const db = supabaseAdmin();
  const cleanUsername = username?.toLowerCase() || null;
  const { data: existing } = await db
    .from("members")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (existing) {
    if (cleanUsername && existing.username !== cleanUsername) {
      await db.from("members").update({ username: cleanUsername, updated_at: new Date().toISOString() }).eq("id", existing.id);
    }
    return { ...existing, username: cleanUsername || existing.username };
  }

  const { data: created, error } = await db
    .from("members")
    .insert({ telegram_id: telegramId, username: cleanUsername })
    .select("*")
    .single();
  if (error) throw error;
  return created;
}

async function findMemberByUsername(username: string) {
  const db = supabaseAdmin();
  const { data } = await db.from("members").select("*").eq("username", username.toLowerCase()).maybeSingle();
  return data;
}

export async function handleAllStats(): Promise<string> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("members")
    .select("username, wjp_points")
    .order("wjp_points", { ascending: false })
    .limit(50);
  if (error || !data || data.length === 0) {
    return "No members on the leaderboard yet.";
  }
  const lines = data.map((m, i) => {
    const handle = m.username ? `@${m.username}` : "anonymous";
    return `${i + 1}. ${handle} — ${Number(m.wjp_points).toLocaleString("en-US")} WJP`;
  });
  return `<b>Top ${data.length} Web3 Junkies</b>\n\n${lines.join("\n")}`;
}

export async function handleStat(
  targetUsername: string,
  requester: { telegramId: number; username?: string; verified: boolean }
): Promise<string> {
  const isSelf = requester.username?.toLowerCase() === targetUsername.toLowerCase();
  if (!isSelf && !isAdmin(requester.telegramId)) {
    return "You can only check your own stats. Use your own username, e.g. /yourusernamestat";
  }
  if (!requester.verified && !isAdmin(requester.telegramId)) {
    return notVerifiedReply();
  }

  const member = await findMemberByUsername(targetUsername);
  if (!member) return `No member found for @${targetUsername}.`;

  const db = supabaseAdmin();
  const { data: balances } = await db
    .from("member_token_balances")
    .select("balance, collab_tokens(symbol)")
    .eq("member_id", member.id)
    .gt("balance", 0);

  let out = `User: @${member.username}\nPoints: ${Number(member.wjp_points).toLocaleString("en-US")} WJP\n`;
  if (balances && balances.length > 0) {
    for (const b of balances as any[]) {
      out += `CT: ${Number(b.balance).toLocaleString("en-US")} ${b.collab_tokens.symbol}\n`;
    }
  }
  out += `Task Comp: ${member.tasks_completed}`;
  return out;
}

export async function handleWallet(targetUsername: string, requester: { telegramId: number; username?: string; verified: boolean }): Promise<string> {
  const member = await findMemberByUsername(targetUsername);
  if (!member) return `No member found for @${targetUsername}.`;

  const isSelf = requester.username?.toLowerCase() === targetUsername.toLowerCase();
  if (!isSelf && !isAdmin(requester.telegramId)) {
    return "You can only check your own wallet. Use your own username, e.g. /yourusernamewallet";
  }
  if (!requester.verified && !isAdmin(requester.telegramId)) {
    return notVerifiedReply();
  }

  const db = supabaseAdmin();
  const { data: balances } = await db
    .from("member_token_balances")
    .select("balance, collab_tokens(symbol)")
    .eq("member_id", member.id)
    .gt("balance", 0);

  let out = `Name: @${member.username}\nPoint: ${Number(member.wjp_points).toLocaleString("en-US")} WJP\n`;
  if (balances && balances.length > 0) {
    for (const b of balances as any[]) {
      out += `CT: ${Number(b.balance).toLocaleString("en-US")} ${b.collab_tokens.symbol}\n`;
    }
  }
  out += `Wallet: ${member.wallet_address || "not set"}`;
  return out;
}

export async function handleSetWallet(
  targetUsername: string,
  requester: { telegramId: number; username?: string; verified: boolean },
  newAddress: string | undefined
): Promise<string> {
  const isSelf = requester.username?.toLowerCase() === targetUsername.toLowerCase();
  if (!isSelf && !isAdmin(requester.telegramId)) {
    return "You can only set your own wallet. Use your own username, e.g. /yourusernamesetwallet 0xYourAddress";
  }
  if (!requester.verified && !isAdmin(requester.telegramId)) {
    return notVerifiedReply();
  }
  if (!newAddress) {
    return "Send your Polygon (POL) wallet address after the command, e.g.\n/yourusernamesetwallet 0xAbc123...";
  }
  if (!isValidPolygonAddress(newAddress)) {
    return "That doesn't look like a valid Polygon wallet address. Double check and try again.";
  }

  const member = await upsertMember(requester.telegramId, requester.username);
  const db = supabaseAdmin();
  await db.from("members").update({ wallet_address: newAddress, updated_at: new Date().toISOString() }).eq("id", member.id);
  return `Wallet saved for @${member.username || requester.username}:\n${newAddress}`;
}

export async function handleTasks(
  targetUsername: string,
  requester: { telegramId: number; username?: string; verified: boolean },
  baseUrl: string
): Promise<string> {
  const isSelf = requester.username?.toLowerCase() === targetUsername.toLowerCase();
  if (!isSelf && !isAdmin(requester.telegramId)) {
    return "You can only generate links for your own username, e.g. /yourusernametasks";
  }
  if (!requester.verified && !isAdmin(requester.telegramId)) {
    return notVerifiedReply();
  }

  const member = await upsertMember(requester.telegramId, requester.username);
  const db = supabaseAdmin();
  const { data: tasks } = await db.from("tasks").select("*, collab_tokens(symbol)").eq("active", true).order("created_at", { ascending: false });

  if (!tasks || tasks.length === 0) {
    return `Task for @${member.username}\n\nNo active tasks right now. Check back soon.`;
  }

  let out = `Task for @${member.username}\n`;
  for (const task of tasks as any[]) {
    const { data: existingLink } = await db
      .from("task_links")
      .select("code")
      .eq("task_id", task.id)
      .eq("member_id", member.id)
      .maybeSingle();

    let code = existingLink?.code;
    if (!code) {
      code = nanoid(10);
      await db.from("task_links").insert({ task_id: task.id, member_id: member.id, code });
    }

    const rewardLabel =
      task.reward_type === "COLLAB" && task.collab_tokens
        ? `${Number(task.reward_amount).toLocaleString("en-US")} ${task.collab_tokens.symbol}`
        : `${Number(task.reward_amount).toLocaleString("en-US")} WJP`;

    out += `\n${task.name} - ${task.description || ""} - ${rewardLabel}\n${baseUrl}/r/${code}\n`;
  }
  return out.trim();
}

export { upsertMember, isAdmin };

// --- Verification (captcha) flow ---

export async function handleNewChatMember(
  telegramId: number,
  username: string | undefined,
  firstName: string | undefined,
  chatId: number
): Promise<{ text: string; keyboard: any }> {
  const member = await upsertMember(telegramId, username);
  const { target, options } = generateCaptcha();

  const db = supabaseAdmin();
  await db
    .from("members")
    .update({ pending_captcha_emoji: target, pending_captcha_chat_id: chatId, verified: member.verified })
    .eq("id", member.id);

  const displayName = username ? `@${username}` : firstName || "there";
  const text = `Hello ${displayName}, welcome to the Web3 Junkies Community!\n\nTake this one step to become a verified member — tap the ${target} below to prove you're human.`;

  const keyboard = {
    inline_keyboard: [options.map((emoji) => ({ text: emoji, callback_data: `captcha:${telegramId}:${emoji}` }))],
  };

  return { text, keyboard };
}

export async function handleCaptchaCallback(
  clickerId: number,
  callbackData: string,
  botUsername?: string
): Promise<{
  resultText: string;
  success: boolean;
  forOwner: boolean;
  newMessageText?: string;
  newKeyboard?: any;
  clearKeyboard?: boolean;
}> {
  const parts = callbackData.split(":");
  const targetTelegramId = Number(parts[1]);
  const chosenEmoji = parts.slice(2).join(":");

  if (clickerId !== targetTelegramId) {
    return { resultText: "This verification isn't yours.", success: false, forOwner: false };
  }

  const db = supabaseAdmin();
  const { data: member } = await db.from("members").select("*").eq("telegram_id", targetTelegramId).maybeSingle();
  if (!member) {
    return { resultText: "Something went wrong finding your profile. Try /start again.", success: false, forOwner: true };
  }

  if (member.verified) {
    return { resultText: "You're already verified.", success: true, forOwner: true };
  }

  if (chosenEmoji === member.pending_captcha_emoji) {
    await db.from("members").update({ verified: true, pending_captcha_emoji: null }).eq("id", member.id);
    const handle = member.username ? `@${member.username}` : "there";
    const botTag = botUsername ? ` ${botUsername}` : " the bot";
    return {
      resultText: "Correct! You're verified.",
      success: true,
      forOwner: true,
      clearKeyboard: true,
      newMessageText: `Well done ${handle}, you are now a verified member of Web3 Junkies Community. Stay tuned for tasks — you can check commands from${botTag}.`,
    };
  }

  // Wrong answer: re-randomize so the pattern can't just be memorized
  const { target, options } = generateCaptcha();
  await db.from("members").update({ pending_captcha_emoji: target }).eq("id", member.id);
  const newKeyboard = {
    inline_keyboard: [options.map((emoji) => ({ text: emoji, callback_data: `captcha:${targetTelegramId}:${emoji}` }))],
  };
  const displayName = member.username ? `@${member.username}` : "there";

  return {
    resultText: `Not quite — try again.`,
    success: false,
    forOwner: true,
    newMessageText: `Hello ${displayName}, that wasn't it. Take this one step to become a verified member — tap the ${target} below to prove you're human.`,
    newKeyboard,
  };
}
