-- WJ Bot — migration from v1 schema to v2
-- Run this once in the Supabase SQL editor if you already ran the original schema.sql.
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT everywhere).

alter table members add column if not exists verified boolean not null default false;
alter table members add column if not exists pending_captcha_emoji text;
alter table members add column if not exists pending_captcha_chat_id bigint;

insert into settings (key, value)
values ('pricing', '{"wjp_usd_price": 0, "pol_usd_price": 0}'::jsonb)
on conflict (key) do nothing;

insert into settings (key, value)
values ('distribution', '{"min_wjp_distribution": 0}'::jsonb)
on conflict (key) do nothing;

-- Optional: if you want everyone who has already interacted with the bot
-- to be grandfathered in as verified (so existing members aren't suddenly
-- locked out), uncomment the line below:
-- update members set verified = true;
