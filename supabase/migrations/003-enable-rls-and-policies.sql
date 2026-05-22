-- =====================================================================
-- Migration 003 — Enable Row Level Security + role-aware policies
--
-- Why: Champions Tracker has three role tiers — Admin (Ronnie +
-- Enrique only), Leader (top of a Herbalife downline, e.g. JOHN2026
-- with ~8 nutrition clubs under him), and Owner (one club operator
-- signed up under a leader's code). An owner under JOHN2026 must
-- never see the daily numbers of an owner under MARIA2026. Only
-- admins cross those boundaries.
--
-- Policy shape, in plain English:
--   - leader_codes: anyone (even unauthenticated) can READ — needed
--     so the signup form can validate the code before sending a
--     magic link.
--   - owners: you can see your own row, every owner sharing your
--     leader_code (for the group leaderboard's owner names), and
--     admins see all. Only you can update your own row.
--   - daily_logs and weekly_wrapups: you can READ rows owned by you,
--     by owners in your leader_code group, or by anyone if you're
--     admin. WRITES are restricted to your own rows.
--
-- Helper functions use SECURITY DEFINER so they can read the owners
-- table without triggering the RLS recursion that would otherwise
-- happen when an owners policy queries owners.
--
-- Run this in Supabase SQL Editor (Database → SQL Editor → New query).
-- Idempotent: re-running drops + recreates policies and functions.
-- =====================================================================

-- 1) Enable RLS on every table
alter table leader_codes    enable row level security;
alter table owners          enable row level security;
alter table daily_logs      enable row level security;
alter table weekly_wrapups  enable row level security;

-- 2) Helper functions — SECURITY DEFINER bypasses RLS so policies can
--    safely query the owners table to figure out who's calling.
create or replace function public.current_owner_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from owners where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.current_owner_leader_code()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select leader_code from owners where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from owners where auth_user_id = auth.uid() limit 1),
    false
  );
$$;

create or replace function public.owner_ids_in_my_group()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from owners
  where leader_code = public.current_owner_leader_code();
$$;

-- 3) Drop existing policies (so this migration is re-runnable)
drop policy if exists "leader_codes_public_read"    on leader_codes;

drop policy if exists "owners_own_read"             on owners;
drop policy if exists "owners_same_leader_read"     on owners;
drop policy if exists "owners_admin_read"           on owners;
drop policy if exists "owners_own_insert"           on owners;
drop policy if exists "owners_own_update"           on owners;

drop policy if exists "daily_logs_auth_read"        on daily_logs;
drop policy if exists "daily_logs_select_visible"   on daily_logs;
drop policy if exists "daily_logs_own_insert"       on daily_logs;
drop policy if exists "daily_logs_own_update"       on daily_logs;
drop policy if exists "daily_logs_own_delete"       on daily_logs;

drop policy if exists "weekly_wrapups_auth_read"     on weekly_wrapups;
drop policy if exists "weekly_wrapups_select_visible" on weekly_wrapups;
drop policy if exists "weekly_wrapups_own_insert"    on weekly_wrapups;
drop policy if exists "weekly_wrapups_own_update"    on weekly_wrapups;
drop policy if exists "weekly_wrapups_own_delete"    on weekly_wrapups;

-- 4) leader_codes — public read (needed for signup form validation)
create policy "leader_codes_public_read"
  on leader_codes for select
  using (true);

-- 5) owners — read your own row, your group's rows, or everything
--    if you're admin. Write only your own row.
create policy "owners_own_read"
  on owners for select
  using (auth.uid() = auth_user_id);

create policy "owners_same_leader_read"
  on owners for select
  using (leader_code = public.current_owner_leader_code());

create policy "owners_admin_read"
  on owners for select
  using (public.current_user_is_admin());

create policy "owners_own_insert"
  on owners for insert
  with check (auth.uid() = auth_user_id);

create policy "owners_own_update"
  on owners for update
  using (auth.uid() = auth_user_id);

-- 6) daily_logs — read if own OR same leader_code OR admin.
--    Write only your own rows.
create policy "daily_logs_select_visible"
  on daily_logs for select
  using (
    public.current_user_is_admin()
    or owner_id = public.current_owner_id()
    or owner_id in (select public.owner_ids_in_my_group())
  );

create policy "daily_logs_own_insert"
  on daily_logs for insert
  with check (owner_id = public.current_owner_id());

create policy "daily_logs_own_update"
  on daily_logs for update
  using (owner_id = public.current_owner_id());

create policy "daily_logs_own_delete"
  on daily_logs for delete
  using (owner_id = public.current_owner_id());

-- 7) weekly_wrapups — same shape as daily_logs
create policy "weekly_wrapups_select_visible"
  on weekly_wrapups for select
  using (
    public.current_user_is_admin()
    or owner_id = public.current_owner_id()
    or owner_id in (select public.owner_ids_in_my_group())
  );

create policy "weekly_wrapups_own_insert"
  on weekly_wrapups for insert
  with check (owner_id = public.current_owner_id());

create policy "weekly_wrapups_own_update"
  on weekly_wrapups for update
  using (owner_id = public.current_owner_id());

create policy "weekly_wrapups_own_delete"
  on weekly_wrapups for delete
  using (owner_id = public.current_owner_id());

-- 8) Seed a few more leader codes so we have something to test signup
--    against. Adjust names once the real five leaders are confirmed.
insert into leader_codes (code, leader_name) values
  ('MARIA2026', 'Maria Lopez'),
  ('JOHN2026',  'John Doe'),
  ('SARA2026',  'Sara Martinez'),
  ('MIKE2026',  'Mike Johnson')
on conflict (code) do nothing;

-- =====================================================================
-- Post-migration manual step (do once Ronnie + Enrique have each
-- signed up via the app):
--
--   update owners set is_admin = true
--   where email in ('azteampossibility@gmail.com', '<enrique's email>');
--
-- This flips them into the Admin tier so they see all leaders, all
-- clubs, all numbers. Until then, both behave as regular owners.
-- =====================================================================
