# WJ Bot — Web3 Junkies task &amp; rewards console

A Telegram bot + admin webapp for running community tasks, points (WJP), collab
tokens, and Polygon token distribution.

## What's included

- **Admin webapp** (`/admin`) — passcode-gated dashboard: Overview, Tasks,
  Collab tokens, Members, Distribute, Ads settings.
- **Overview tab** — set the USD price per WJP and per POL, and see total
  WJP/collab tokens outstanding across all members converted to USD and POL,
  plus the distributor wallet's live on-chain balance (POL + each collab
  token) converted the same way.
- **Member lookup & manual adjustment** — search any member by username in
  the Members tab to see their WJP and collab token balances, and add to or
  set an exact balance for corrections, manual rewards, or refunds.
- **Minimum distribution threshold** — set a minimum WJP balance in the
  Distribute tab; members below it are skipped entirely (no payout, no
  deduction) when you hit Distribute. Members at or above it get their full
  WJP balance converted to POL and sent.
- **Telegram bot** (webhook-based, no polling) — handles `/allstats`,
  `/{username}stat`, `/{username}tasks`, `/{username}wallet`,
  `/{username}setwallet`, each locked to the matching Telegram username.
- **Join verification** — when someone joins the group, the bot posts a
  welcome message with a random emoji captcha (4 buttons, one correct). A
  wrong tap re-randomizes the target and lets them try again. Only verified
  members can run commands or earn rewards.
- **Public redirect page** (`/r/{code}`) — the "Link will be ready soon" →
  5-second countdown → "Click" flow shown to anyone who opens a member's
  personal task link, with a configurable ad slot underneath.
- **Fraud-aware click tracking** — every click is fingerprinted and logged;
  self-clicks and duplicate clicks aren't rewarded, and abnormal click
  patterns are flagged. This is a solid heuristic layer, not a guarantee —
  no system catches 100% of abuse.
- **Polygon distribution** — WJP converts to POL at send time using your set
  prices; collab tokens send as themselves. One button in the admin console
  runs it, always showing a preview before anything moves on-chain.

---

## 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Go to the SQL editor and run the contents of `supabase/schema.sql` once
   (fresh project), **or**, if you already set this project up before this
   update, run `supabase/migration_v2.sql` instead to add the new columns
   and settings without touching your existing data.
3. Go to **Project Settings → API** and copy:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key (NOT the `anon` key) → `SUPABASE_SERVICE_ROLE_KEY`

The service role key bypasses row-level security, which is intentional here —
all database access goes through your own API routes, which are the ones
gated by the admin passcode and Telegram webhook secret.

## 2. Telegram bot setup

1. Message [@BotFather](https://t.me/BotFather) on Telegram, run `/newbot`,
   and follow the prompts to get your bot username and **bot token**.
2. Get your own numeric Telegram ID (message
   [@userinfobot](https://t.me/userinfobot)) — this becomes `ADMIN_TELEGRAM_ID`
   so you can run commands for other members if needed.
3. Add the bot to your Web3 Junkies group and give it **admin rights** in the
   group (needed to see join events reliably and manage the welcome message).
   Also disable "Group Privacy" via BotFather's `/setprivacy` so it can read
   commands members type without @mentioning it directly.
4. Set `TELEGRAM_BOT_USERNAME` (e.g. `@WebThreeJunkiesBot`) — it's shown in
   the "you're verified" message so new members know where to check commands.

You'll register the webhook URL after your first deploy (step 4 below).

## 3. Environment variables

Copy `.env.example` to `.env.local` for local development, and add the same
variables in Vercel under **Project Settings → Environment Variables** for
production. Generate random secrets with:

```bash
openssl rand -hex 32
```

Use that for `ADMIN_SESSION_SECRET`, `TELEGRAM_WEBHOOK_SECRET`, and
`FINGERPRINT_SALT`.

## 4. Deploy

1. Push this repo to GitHub.
2. Import it into [Vercel](https://vercel.com/new).
3. Add all the environment variables from `.env.example`.
4. Deploy. Copy your production URL into `PUBLIC_BASE_URL` (redeploy after
   adding it, or set it before the first deploy if you already know your
   Vercel domain).

## 5. Point Telegram at your deployment

Once deployed with `PUBLIC_BASE_URL`, `TELEGRAM_BOT_TOKEN`, and
`TELEGRAM_WEBHOOK_SECRET` all set:

```bash
npm install
node scripts/set-webhook.js
```

You should see `"ok": true` in the response. Your bot is now live.

## 6. Polygon distribution wallet

1. Create a fresh wallet (e.g. in MetaMask) that will hold the tokens you
   distribute. **Don't reuse a wallet with other funds** — the private key
   lives in a Vercel environment variable, and being able to move funds is
   exactly what a "Distribute" button needs to do.
2. Fund it with a small amount of MATIC/POL for gas, plus whatever WJP/collab
   token supply you want to pay out.
3. Set `DISTRIBUTOR_PRIVATE_KEY` (the wallet's private key) and
   `POLYGON_RPC_URL` (a public RPC like `https://polygon-rpc.com`, or your own
   Alchemy/Infura endpoint for reliability) in Vercel's environment variables.

The distribution API always shows a **preview** (who gets paid, how much)
before anything is sent — nothing moves until you explicitly confirm in the
admin UI.

## 7. Using the admin console

Go to `https://your-app.vercel.app/admin`, enter the passcode (`022005` by
default — change it via `ADMIN_PASSCODE` any time), and you can:

- **Overview** — set the USD price per 1 WJP and per 1 POL, then see total
  WJP and collab tokens outstanding (converted to USD/POL), plus your
  distributor wallet's live balance. Set both prices before your first WJP
  distribution — the distribute button blocks until they're set.
- **Tasks** — add a task (name, description, destination link, reward type
  and amount). Set reward type to `WJP` or pick a collab token you've added.
- **Collab tokens** — register any Polygon ERC-20 by contract address; it
  then becomes selectable as a task's reward type.
- **Members** — look up any member by username to see and manually adjust
  their WJP or collab token balance (add to it or set an exact value), plus
  browse the full member list with verification status, WJP, and wallet.
- **Distribute** — pick WJP or a collab token, set the minimum WJP balance
  required to qualify (members below it are skipped, untouched), preview who
  gets paid, then confirm to send on-chain. WJP sends as POL, converted using
  your Overview prices.
- **Ads settings** — choose no ad slot, a direct sponsor link, or paste an
  Adsterra (or similar) embed script; it renders under the countdown button
  on every member's `/r/{code}` page.

## 8. Bot commands (work in DM and in the group)

```
/allstats                    top 50 members by WJP (public leaderboard)
/{username}stat              e.g. /dayostat
/{username}tasks             e.g. /dayotasks
/{username}wallet            e.g. /dayowallet
/{username}setwallet 0x...   set/change your Polygon wallet address
```

Every `/{username}...` command only works if `{username}` matches the sender's
own Telegram username — `@dayo` can run `/dayostat`, `/dayotasks`,
`/dayowallet`, `/dayosetwallet`, but nobody else can, including other
members. The only exception is you (`ADMIN_TELEGRAM_ID`), who can run any of
these for any username — useful for support when a member asks you to check
something on their behalf. If you'd rather even you not have that override,
say so and I'll remove it.

## 9. Join verification

When someone joins the group, the bot posts:

> Hello @newmember, welcome to the Web3 Junkies Community! Take this one step
> to become a verified member — tap the 🍌 below to prove you're human.

...with four emoji buttons, one of which matches. Only the joining member's
own tap counts (the bot checks the Telegram ID behind the button against who
joined). A wrong tap re-randomizes the target emoji and the options, so it
can't be memorized or brute-forced by trying every button in sequence.
Getting it right replaces the message with a congratulations note and flips
`verified` to true in Supabase.

**Unverified members can't run any `/{username}...` command or earn task
rewards** — they get a short "you're not verified yet" reply until they
complete the captcha. If you're migrating an existing community into this
bot, see the commented-out line in `supabase/migration_v2.sql` to grandfather
in everyone who's already interacted with the bot as verified, so they're not
suddenly locked out.

## Notes on the fraud model

Clicks are deduplicated per link per visitor fingerprint (hashed IP + user
agent, never stored raw), and a visitor hitting an unusual number of
different links in a short window is flagged and not rewarded. If the
redirect page is opened from inside Telegram (via its WebApp bridge) and the
visitor's Telegram ID matches the link owner's, that click is never rewarded
either. This meaningfully raises the bar against casual self-clicking and
copy-paste abuse, but a determined person using multiple devices/networks
can still get around fingerprint-based detection — treat it as a deterrent,
not a guarantee, and keep an eye on `click_events` in Supabase if a member's
numbers look off.
