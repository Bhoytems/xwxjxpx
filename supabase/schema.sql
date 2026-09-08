-- WJ Bot - Supabase schema
-- Run this in the Supabase SQL editor once, on a fresh project.

create extension if not exists "pgcrypto";

-- Members of the Web3 Junkies community
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  username text unique, -- without @, lowercase
  wallet_address text,
  wjp_points bigint not null default 0,
  tasks_completed int not null default 0,
  verified boolean not null default false,
  pending_captcha_emoji text,
  pending_captcha_chat_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_members_username on members (lower(username));
create index if not exists idx_members_wjp on members (wjp_points desc);

-- Collab tokens the admin has added (any ERC-20 on Polygon)
create table if not exists collab_tokens (
  id uuid primary key default gen_random_uuid(),
  symbol text unique not null,       -- e.g. "PEPE"
  name text not null,
  contract_address text not null,    -- Polygon ERC-20 address
  decimals int not null default 18,
  usd_price numeric,                 -- optional, set by admin for reporting
  created_at timestamptz not null default now()
);

-- Per-member balances of a collab token (separate from wjp_points)
create table if not exists member_token_balances (
  member_id uuid references members(id) on delete cascade,
  token_id uuid references collab_tokens(id) on delete cascade,
  balance numeric not null default 0,
  primary key (member_id, token_id)
);

-- Tasks configured by the admin
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  link text not null,               -- final destination link
  reward_type text not null default 'WJP', -- 'WJP' or 'COLLAB'
  collab_token_id uuid references collab_tokens(id),
  reward_amount numeric not null default 0, -- WJP or collab-token amount
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One personal tracked link per (member, task)
create table if not exists task_links (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  code text unique not null,         -- short code used in /r/{code}
  clicks int not null default 0,     -- verified/rewarded clicks
  created_at timestamptz not null default now(),
  unique (task_id, member_id)
);

-- Every click attempt, used for fraud detection & auditing
create table if not exists click_events (
  id uuid primary key default gen_random_uuid(),
  task_link_id uuid references task_links(id) on delete cascade,
  fingerprint text not null,         -- hash of ip + user agent (+ tg id if present)
  telegram_id bigint,                -- set if opened from inside Telegram webview
  rewarded boolean not null default false,
  reject_reason text,                -- null if rewarded, else why it was blocked
  created_at timestamptz not null default now()
);

create index if not exists idx_click_events_link on click_events (task_link_id);
create index if not exists idx_click_events_fingerprint on click_events (fingerprint, created_at desc);

-- Distribution runs (audit trail for on-chain payouts)
create table if not exists distribution_runs (
  id uuid primary key default gen_random_uuid(),
  token_type text not null,          -- 'WJP' (off-chain only) or a collab_token symbol
  token_id uuid references collab_tokens(id),
  total_recipients int not null default 0,
  total_amount numeric not null default 0,
  status text not null default 'pending', -- pending | running | completed | failed
  details jsonb,                      -- per-recipient tx hashes / errors
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Simple key/value settings table (ads config, etc.)
create table if not exists settings (
  key text primary key,
  value jsonb not null
);

insert into settings (key, value)
values ('ads', '{"mode": "none", "adsterra_code": "", "direct_link": ""}'::jsonb)
on conflict (key) do nothing;

insert into settings (key, value)
values ('pricing', '{"wjp_usd_price": 0, "pol_usd_price": 0}'::jsonb)
on conflict (key) do nothing;

insert into settings (key, value)
values ('distribution', '{"min_wjp_distribution": 0}'::jsonb)
on conflict (key) do nothing;
