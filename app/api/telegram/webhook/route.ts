import { NextRequest, NextResponse } from "next/server";
import { parseCommand, sendMessage, answerCallbackQuery, editMessageText, TelegramUpdate } from "@/lib/telegram";
import {
  handleAllStats,
  handleStat,
  handleWallet,
  handleSetWallet,
  handleTasks,
  handleNewChatMember,
  handleCaptchaCallback,
  upsertMember,
} from "@/lib/botCommands";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
  if (secretHeader !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update: TelegramUpdate = await req.json();

  // --- Captcha button presses ---
  if (update.callback_query) {
    const cq = update.callback_query;
    try {
      if (cq.data?.startsWith("captcha:")) {
        const botUsername = process.env.TELEGRAM_BOT_USERNAME;
        const result = await handleCaptchaCallback(cq.from.id, cq.data, botUsername);
        await answerCallbackQuery(cq.id, result.resultText, !result.success && result.forOwner);

        if (cq.message && result.newMessageText) {
          await editMessageText(
            cq.message.chat.id,
            cq.message.message_id,
            result.newMessageText,
            result.clearKeyboard ? undefined : result.newKeyboard
          );
        }
      } else {
        await answerCallbackQuery(cq.id);
      }
    } catch (err) {
      console.error("Callback query error:", err);
      await answerCallbackQuery(cq.id, "Something went wrong. Try again.");
    }
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  if (!message) return NextResponse.json({ ok: true });

  // --- New members joining the group ---
  if (message.new_chat_members && message.new_chat_members.length > 0) {
    for (const newMember of message.new_chat_members) {
      if (newMember.is_bot) continue;
      try {
        const { text, keyboard } = await handleNewChatMember(
          newMember.id,
          newMember.username?.toLowerCase(),
          newMember.first_name,
          message.chat.id
        );
        await sendMessage(message.chat.id, text, { reply_markup: keyboard });
      } catch (err) {
        console.error("New member welcome error:", err);
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (!message.text || !message.from) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const fromId = message.from.id;
  const fromUsername = message.from.username?.toLowerCase();

  try {
    const selfMember = await upsertMember(fromId, fromUsername);

    const parsed = parseCommand(message.text);
    if (!parsed) return NextResponse.json({ ok: true });

    const baseUrl = process.env.PUBLIC_BASE_URL || `https://${req.headers.get("host")}`;
    const requester = { telegramId: fromId, username: fromUsername, verified: !!selfMember.verified };

    let reply: string | null = null;

    switch (parsed.command) {
      case "start":
      case "help":
        reply =
          "Welcome to Web3 Junkies.\n\nCommands:\n/allstats\n/{username}stat\n/{username}tasks\n/{username}wallet\n/{username}setwallet {address}\n\nNew members must complete the verification button posted when they join before these work.";
        break;
      case "allstats":
        reply = await handleAllStats();
        break;
      case "stat":
        if (parsed.username) reply = await handleStat(parsed.username, requester);
        break;
      case "wallet":
        if (parsed.username) reply = await handleWallet(parsed.username, requester);
        break;
      case "setwallet":
        if (parsed.username) reply = await handleSetWallet(parsed.username, requester, parsed.args[0]);
        break;
      case "tasks":
        if (parsed.username) reply = await handleTasks(parsed.username, requester, baseUrl);
        break;
    }

    if (reply) {
      await sendMessage(chatId, reply);
    }
  } catch (err) {
    console.error("Webhook error:", err);
    await sendMessage(chatId, "Something went wrong handling that command. Try again in a moment.");
  }

  return NextResponse.json({ ok: true });
}
