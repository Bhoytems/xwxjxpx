// Run with: node scripts/set-webhook.js
// Reads env vars from your shell (or a .env file if you use dotenv-cli).
// Registers your Vercel deployment URL as the Telegram webhook for your bot,
// and sets the secret token Telegram will send on every request so your
// API route can verify it's really Telegram calling.

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const baseUrl = process.env.PUBLIC_BASE_URL;

if (!token || !secret || !baseUrl) {
  console.error("Missing TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, or PUBLIC_BASE_URL in your environment.");
  process.exit(1);
}

const webhookUrl = `${baseUrl}/api/telegram/webhook`;

fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
  }),
})
  .then((r) => r.json())
  .then((data) => {
    console.log(data);
    if (data.ok) {
      console.log(`\nWebhook set to ${webhookUrl}`);
    }
  })
  .catch((err) => {
    console.error("Failed to set webhook:", err);
    process.exit(1);
  });
