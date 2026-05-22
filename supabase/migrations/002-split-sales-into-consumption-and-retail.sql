-- =====================================================================
-- Migration 002 — split daily sales into Consumption Sales + Retail Sales
--
-- Why: the original `sales` column lumped two very different things
-- together — money from drinks consumed in the club (paired with the
-- `consumptions` count, ~$9-$10/drink) and money from retail products
-- like closed-container shake mix, tea kits, or full programs. Coaches
-- need to see those separately so they can tell whether an owner is
-- driving club traffic vs. moving product.
--
-- Run this in Supabase SQL Editor (Database → SQL Editor → New query).
-- Safe to re-run: each step is idempotent.
-- =====================================================================

-- 1) Rename daily_logs.sales → daily_logs.consumption_sales
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'daily_logs' and column_name = 'sales'
  ) and not exists (
    select 1 from information_schema.columns
    where table_name = 'daily_logs' and column_name = 'consumption_sales'
  ) then
    alter table daily_logs rename column sales to consumption_sales;
  end if;
end $$;

-- 2) Add daily_logs.retail_sales (whole dollars)
alter table daily_logs
  add column if not exists retail_sales int default 0;

-- 3) Rename weekly_wrapups.sales_goal → weekly_wrapups.consumption_sales_goal
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'weekly_wrapups' and column_name = 'sales_goal'
  ) and not exists (
    select 1 from information_schema.columns
    where table_name = 'weekly_wrapups' and column_name = 'consumption_sales_goal'
  ) then
    alter table weekly_wrapups rename column sales_goal to consumption_sales_goal;
  end if;
end $$;

-- 4) Add weekly_wrapups.retail_sales_goal
alter table weekly_wrapups
  add column if not exists retail_sales_goal int;
