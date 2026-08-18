-- =====================================================================
-- The Champions — Accountability Tracker schema
-- v1 baseline: leader codes, owners, daily logs, weekly wrap-ups
-- Run this in Supabase SQL Editor (Database → SQL Editor → New query)
-- =====================================================================

-- 1) Leader codes — each leader gets a code like RONNIE2026 to share
create table if not exists leader_codes (
  code         text primary key,
  leader_name  text not null,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

-- 2) Owners — every club operator signing up with a leader code
create table if not exists owners (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique,        -- links to Supabase auth.users.id
  name          text not null,
  phone         text,
  email         text,
  leader_code   text references leader_codes(code),
  timezone      text default 'America/Chicago',
  is_admin      boolean default false,
  is_leader     boolean default false,
  created_at    timestamptz default now()
);
create index if not exists owners_leader_code_idx on owners(leader_code);
create index if not exists owners_auth_user_idx   on owners(auth_user_id);

-- 3) Daily logs — one row per owner per day
create table if not exists daily_logs (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid references owners(id) on delete cascade,
  log_date           date not null,
  consumptions       int  default 0,
  consumption_sales  int  default 0,   -- $ from drinks consumed in-club
  retail_sales       int  default 0,   -- $ from closed containers / programs
  new_customers      int  default 0,
  deliveries         int  default 0,
  social_posts       int  default 0,
  daily_volume       numeric(10,2) default 0,  -- Herbalife Volume Points (migration 004)
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),
  unique (owner_id, log_date)
);
create index if not exists daily_logs_owner_date_idx on daily_logs(owner_id, log_date desc);

-- 4) Weekly wrap-ups — one row per owner per week (week_start = Monday)
create table if not exists weekly_wrapups (
  id                          uuid primary key default gen_random_uuid(),
  owner_id                    uuid references owners(id) on delete cascade,
  week_start                  date not null,
  popups                      int default 0,
  events                      int default 0,
  customer_appreciation_day   boolean default false,
  biggest_win                 text,
  biggest_lesson              text,
  consumptions_goal           int,
  consumption_sales_goal      int,
  retail_sales_goal           int,
  new_customers_goal          int,
  submitted_at                timestamptz default now(),
  unique (owner_id, week_start)
);

-- =====================================================================
-- Seed: the two real admin/leader codes. Every other leader is added
-- one-at-a-time via SQL as they onboard (NOT seeded here) so the table
-- only ever contains codes that map to a real person.
-- =====================================================================
insert into leader_codes (code, leader_name) values
  ('RONNIE2026',  'Ronnie Craig'),
  ('ENRIQUE2026', 'Enrique Carrillo')
on conflict (code) do nothing;

-- =====================================================================
-- Row Level Security — added in a follow-up migration once auth flow
-- is wired. Leaving RLS OFF during scaffolding so we can iterate quickly.
-- =====================================================================
