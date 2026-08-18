-- 004: track Herbalife Volume Points per day.
--
-- The HLMyClub POS export carries an 'Original Volume' column on every receipt --
-- the actual VP the club earned. Nothing in daily_logs could hold it, so the number
-- was being thrown away. consumptions and sales were only ever a proxy for it.
--
-- numeric, not int: VP is fractional (a single receipt is e.g. 11.3812 VP, and a
-- day lands on something like 230.4). Rounding each day to a whole number would
-- drift by a few points a week against Herbalife's own reporting.
--
-- Backfilled for Ronnie's club 2026-06-23..2026-08-16 by
-- scripts/backfill_from_hlmyclub.py --volume-only --send
alter table daily_logs
  add column if not exists daily_volume numeric(10,2) default 0;

comment on column daily_logs.daily_volume is
  'Herbalife Volume Points for the day. Sum of Original Volume across that day''s POS receipts.';
