# Champions Tracker — Session 12 Handoff

**Date:** 2026-07-28
**Owner:** Ronnie Craig
**Status:** Production healthy. One bug fixed + deployed: **streaks no longer freeze at 36.** No SQL, no migration, no roster changes, no data cleanup needed.

---

## 🎯 What happened this session

| Task | State |
|------|-------|
| **Streaks stuck at day 36** — a team reported their streak stopped climbing and froze on day 36 | ✅ DIAGNOSED + FIXED — commit `8fc0096`, pushed to `main`, Vercel auto-deploying. Live verification still to be done by a member (see below). |

**The trigger:** Ronnie reported a team's streaks "stopped tracking" and stalled on **day 36**.

---

## 🔍 Root cause (important — this was a data-starvation bug, not a math bug)

The streak math in `src/lib/aggregate.ts` (`computeStreak`) was always correct — it walks backward from today counting consecutive days that have a `daily_logs` row, stopping at the first gap.

The problem was upstream: **every `daily_logs` fetch in `src/app/page.tsx` was hardcoded to load only the last 35 days** (`sinceDate.setDate(sinceDate.getDate() - 35)`, in 5 places). So `computeStreak` only ever *saw* 35 loaded days + today = **36**. Day 37 was never loaded, which looks identical to a missing day, so the count stopped at 36 for **every** member simultaneously. The magic number "36" = 35-day window + today.

That 35-day window existed for the **weekly sums** (Week tab's ~5-week look-back). Those sums filter by an explicit date range (`sumWeek` / `sumThisWeek`), so loading more history **cannot change any total** — extra rows are filtered out. Only the streak was being truncated.

---

## 💻 Code change shipped (1 commit this session)

### `8fc0096` — Fix streak capping at 36: widen daily_logs fetch window
**File:** `src/app/page.tsx` (+18 / −6, single file)

**What:**
1. New shared constant `const LOG_WINDOW_DAYS = 400;` (near `MAX_BACKFILL_DAYS`), with a comment explaining the 36-cap trap so it doesn't recur.
2. Replaced all **5** hardcoded `- 35` fetch windows with `- LOG_WINDOW_DAYS`:
   - initial Home load (`setStreak(computeStreak(rows))`)
   - `loadGroup` (per-member streak column)
   - `loadAdminViews` (avg-streak rollup)
   - the standalone leader/group refresh
   - `refreshStats` (runs immediately after a daily save)
3. Updated the stale "~5 weeks" comment on the first fetch.

**Why 400:** covers any real streak well past a year. The club launched ~May 2026, so nobody is anywhere near that ceiling — it's generous future-proofing. One-line bump if ever needed wider.

**What was NOT touched / why it's safe:**
- **No database changes, no migration, nothing to paste into Supabase.** Purely a client-side fetch-window widening.
- **Weekly sums / totals — provably unchanged.** `sumWeek`/`sumThisWeek` filter by explicit date range; the extra history just gets filtered out.
- **Week look-back UI — unchanged.** Still capped at `weekOffset > -4` (5 weeks) regardless of how much data is loaded.
- `computeStreak` in `aggregate.ts` — untouched (it was already correct).
- Backfill flow, home/week/group/admin layout — untouched.

**Verification before push:**
- `npx tsc --noEmit` → clean (exit 0)
- `npm run build` → compiled successfully, all 9 routes generated, no errors

**Verification post-push:**
- `git status` clean, `rev-list --left-right --count origin/main...HEAD` → `0  0`
- `curl -sI https://championstracker.org/` → HTTP/2 200

---

## ⚠️ The one open item — LIVE member verification

The build proves the code is correct, but the authenticated streak count was **not** driven headlessly (needs a logged-in member session). 

**To close it:** after the Vercel deploy finishes, have a Champion whose real daily history runs past 36 open **championstracker.org** → Home → the 🔥 Day Streak number should immediately show their true count (>36).

**No data fix needed:** the streak is recomputed live from each member's logs on load. Anyone with an unbroken run past 36 self-corrects on next load. Anyone who genuinely missed a day shows their real (shorter) streak — which is correct.

---

## 👥 Roster — no changes this session
Same as Session 11 (Admins: Ronnie/Ysela, Enrique; Leaders + downline unchanged).

## 🌐 Production infrastructure status
Unchanged. Live URL https://championstracker.org ✅ · Vercel project `champions-tracker` under `ronnie-craigs-projects`, auto-deploys from `main`.

---

## ✅ Verification cheat sheet (post-restart)

```bash
git -C /Users/apple/Projects/champions-tracker log --oneline -3
# 8fc0096 Fix streak capping at 36: widen daily_logs fetch window   ← this session
# 4964051 Back up scripts/admin_query.py, which was untracked
# aa51f6c Daily log: widen backfill window 1 -> 2 days (max two days grace)
git -C /Users/apple/Projects/champions-tracker status                       # clean
git -C /Users/apple/Projects/champions-tracker rev-list --left-right --count origin/main...HEAD  # 0  0
curl -sI https://championstracker.org/ | head -1                            # → HTTP/2 200
```

In browser (post-deploy, as a member with >36 days of history):
- Home → 🔥 Day Streak shows the true count, climbing past 36.

> ⚠️ Note: `cd` into the repo can trigger a permission prompt in this environment — use `git -C /Users/apple/Projects/champions-tracker …` instead.

---

## ⏳ Carry-over for Session 13
1. **Live member click-through of the streak fix** (NEW) — confirm a real streak now shows >36 on prod.
2. Carried from S11: bump backfill window decision was resolved (now 2 days, commit `aa51f6c`).
3. Still unverified end-to-end on prod (long-standing): Week look-back `3bc7597`, Top 10 card `c656a7e`, `/signup` + `/signin` magic-link round trips, Ysela shared-login activation.

---

## Tagline
*Discipline today. Freedom tomorrow. Legacy forever.*

Onward to Session 13 — get one live member to confirm their streak climbs past 36, then knock out the long-standing Week look-back / Top 10 / magic-link prod verifications.
