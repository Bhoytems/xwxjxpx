const TELEGRAM_API = "https://api.telegram.org";

function botToken() {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("Missing TELEGRAM_BOT_TOKEN env var");
  return t;
}

export async function sendMessage(chatId: number | string, text: string, opts: Record<string, any> = {}) {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...opts,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("Telegram sendMessage failed:", res.status, body);
  }
  return res;
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string, showAlert = false) {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken()}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: showAlert }),
  });
  if (!res.ok) console.error("Telegram answerCallbackQuery failed:", res.status, await res.text());
  return res;
}

export async function editMessageText(chatId: number | string, messageId: number, text: string, replyMarkup?: any) {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken()}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, reply_markup: replyMarkup, parse_mode: "HTML" }),
  });
  if (!res.ok) console.error("Telegram editMessageText failed:", res.status, await res.text());
  return res;
}

export async function editMessageReplyMarkup(
  chatId: number | string,
  messageId: number,
  replyMarkup: any
) {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken()}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: replyMarkup }),
  });
  if (!res.ok) console.error("Telegram editMessageReplyMarkup failed:", res.status, await res.text());
  return res;
}

export type TelegramUpdate = {
  message?: {
    message_id: number;
    from: { id: number; username?: string; first_name?: string };
    chat: { id: number; type: string };
    text?: string;
    new_chat_members?: { id: number; username?: string; first_name?: string; is_bot: boolean }[];
  };
  callback_query?: {
    id: string;
    from: { id: number; username?: string; first_name?: string };
    message?: { message_id: number; chat: { id: number } };
    data?: string;
  };
};

// Parses commands like /dayostat, /dayotasks, /dayowallet, /dayosetwallet
// as well as the plain admin commands /allstats
export function parseCommand(text: string): { command: string; username: string | null; args: string[] } | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;
  const [firstToken, ...rest] = trimmed.split(/\s+/);
  const raw = firstToken.slice(1).split("@")[0]; // strip /command@BotName

  if (raw.toLowerCase() === "allstats") {
    return { command: "allstats", username: null, args: rest };
  }
  if (raw.toLowerCase() === "start" || raw.toLowerCase() === "help") {
    return { command: raw.toLowerCase(), username: null, args: rest };
  }

  const suffixes = ["setwallet", "wallet", "stat", "tasks"];
  for (const suffix of suffixes) {
    if (raw.toLowerCase().endsWith(suffix) && raw.length > suffix.length) {
      const username = raw.slice(0, raw.length - suffix.length);
      return { command: suffix, username: username.toLowerCase(), args: rest };
    }
  }
  return null;
}

export function formatWJP(n: number) {
  return `${n.toLocaleString("en-US")} WJP`;
}
