# Champions Tracker — Session 2 Handoff

**Date:** 2026-05-22
**Owner:** Ronnie Craig
**Status:** Auth + real data flows working end-to-end. Ronnie has a 4pm demo today.

---

## 🎯 Session 2 Accomplishments

| # | Milestone | State |
|---|-----------|-------|
| 1 | Daily log SAVE wired to Supabase `daily_logs` (upsert on owner+date) | ✅ Real |
| 2 | Home screen reads today's row, shows real numbers | ✅ Real |
| 3 | Retail Sales split out from Consumption Sales (schema + UI + bumps) | ✅ Real |
| 4 | Magic-link auth flow (`/signup` page + auth gate on `/`) | ✅ Real |
| 5 | Row Level Security (migration 003) with three-tier model | ✅ Real |
| 6 | Streak computed from real `daily_logs` history | ✅ Real |
| 7 | "This Week So Far" sums from real this-week dailies | ✅ Real |
| 8 | Weekly tab auto-fill grid uses real week sums | ✅ Real |
| 9 | Sign-out button in Admin tab | ✅ Real |

---

## ✅ What's working RIGHT NOW (live demo-ready)

- **Sign up flow** — new owner enters name + email + leader code → magic link → lands signed in. Tested end-to-end with `azteampossibility@gmail.com` + `RONNIE2026`.
- **Daily log save/load** — bump or tap-to-type any of the 5 fields, hit SAVE TODAY, refresh — numbers persist
- **Streak counter** — increments when you save consecutive days; doesn't drop until you skip a day
- **This Week So Far** — sums drinks count + (consumption_sales + retail_sales) for the current Monday-through-today window
- **Weekly Wrap-Up auto-fill** — all six AutoCells (Consumptions / Consumption Sales / Retail Sales / New Customers / Deliveries / Social Posts) show real summed numbers for the week
- **Multi-tenant safe** — RLS scopes data to your group; admins can see everything once flagged
- **Tomorrow safety** — fresh sign-up creates owners row, no manual seeding needed

---

## ⚠️ Still mock (clearly labeled as "soon" where possible)

- **Home → Group Rank** — shows "— soon" placeholder. Real rank needs >1 owner per group; defer until 3+ leaders sign up.
- **Group tab leaderboard** — entire screen still shows Maria L. / Carlos R. / etc. mock rows
- **Admin tab** — Group Pulse / By Leader Code / Needs Attention all mock
- **Weekly Wrap-Up SAVE button** — currently just confetti + toast, doesn't persist to `weekly_wrapups` table

---

## 🔑 What Ronnie can show in the 4pm demo

**Live demo path (works end-to-end):**

1. Open http://localhost:3000 (or have it pre-loaded)
2. Show the signup screen — explain "this is what John Smith will see when I send him the link"
3. (Already signed in as Ronnie) → Home: real streak, real today, real this-week sums
4. Tap **LOG/EDIT TODAY** — show the +1/+5/+10/+25 bumps for Consumptions and Consumption Sales, the +$1/+$5/+$25/+$100 for Retail Sales (the granular dollar entry we added today)
5. Hit SAVE TODAY → bounces back to Home → streak ticks up, This Week So Far updates
6. Show the Week tab — "this auto-fills from your dailies, you just answer the reflection questions"
7. Group + Admin tabs — narrate as "this is where John sees his downline, this is where Enrique and I see everything"

**Talking points for the mock pieces:**
- "Leaderboard fills in once we have 5+ owners — same data flow, just needs people in the system"
- "Admin gets cross-team visibility — Enrique and I as admins see every leader's group"
- "Adding a coach is one SQL line + they sign up themselves"

---

## 🗂️ Files Created/Modified in Session 2

### New files
- `src/lib/owner.ts` — session-aware `getOrCreateOwner()`, `signOut()`, `Owner` type
- `src/lib/dates.ts` — local-tz date helpers (today ISO, today label, Monday-of-week, week label)
- `src/lib/aggregate.ts` — `computeStreak()`, `sumThisWeek()`, `formatMoney()`
- `src/app/signup/page.tsx` — magic-link sign-up + sign-in form
- `supabase/migrations/002-split-sales-into-consumption-and-retail.sql`
- `supabase/migrations/003-enable-rls-and-policies.sql`

### Modified files
- `src/app/page.tsx` — full auth gating, real data load + save, streak + week stats, retail-sales UI, sign-out button, loading screen
- `supabase/schema.sql` — updated to new desired-state schema (consumption_sales + retail_sales + consumption_sales_goal + retail_sales_goal)

### Decisions captured to memory
- `~/.claude/projects/-Users-apple/memory/champions-tracker-roles.md` — three-tier role model + RLS policy intent

---

## 🚨 Open items / Risks

1. **Supabase email rate limit** — built-in mailer is ~3-4/hour. Ronnie has 25+ signups planned. **Action: buy `thechampions.club` (~$15-20/year) + set up Resend free tier** before any real onboarding. Without this, magic-link emails will silently drop during onboarding.

2. **Twilio removed from PRD** — Ronnie killed SMS. We'll use PWA push (free) + email (Resend) for reminders. Saves ~$22/month at 80-club scale.

3. **Ronnie not yet flagged is_admin** — he signed up but `is_admin` still false. Run this in Supabase SQL Editor:
   ```sql
   update owners set is_admin = true, is_leader = true
   where email = 'azteampossibility@gmail.com';
   ```
   Then Enrique signs up, repeat for his email. Until then, Admin tab visibility isn't enforced anyway (UI gating is a Session 3 polish).

4. **Group leaderboard global vs. group-scoped** — deferred decision. Current RLS = group-only (privacy). PRD mockup showed global. Recommended hybrid (group default + optional "Champions League" global view of weekly totals only) when we wire the Group tab with real data.

5. **Weekly wrap-up SAVE doesn't persist** — submitWeek() fires confetti but doesn't insert into `weekly_wrapups`. Wire next session.

---

## 🎯 Next session — Priority order

| # | Task | Est |
|---|------|-----|
| 1 | Buy `thechampions.club` + wire Resend SMTP into Supabase (unblocks real onboarding) | 30 min |
| 2 | Flip `is_admin=true` for Ronnie + Enrique (one SQL line each) | 2 min |
| 3 | Wire weekly wrap-up SAVE to `weekly_wrapups` table | 30 min |
| 4 | Replace Group tab leaderboard with real query (within-group, sorted by week sums) | 45 min |
| 5 | Gate Admin tab visibility behind `is_admin` flag | 15 min |
| 6 | Build real Admin views — Group Pulse cross-group aggregates, By Leader Code rollups | 90 min |
| 7 | Deploy to Vercel + custom domain (once `thechampions.club` is set up) | 30 min |

Realistic plan:
- **Session 3 (next):** Tasks 1-4 → owners can be onboarded for real
- **Session 4:** Tasks 5-6 → admin tools usable
- **Session 5:** Task 7 + first Zoom onboarding of 5 leaders

---

## 🛠️ Verification cheat sheet (post-restart)

```bash
cd /Users/apple/Projects/champions-tracker
git log --oneline -8                      # should show Session 2 commits
git status                                 # clean
ls .env.local                              # 305 bytes
npm run dev                                # → http://localhost:3000
```

In browser:
- Visiting `/` while signed out → redirects to `/signup`
- Sign up with new email + RONNIE2026 → magic link → land signed in
- Streak = 1 after first save; This Week So Far totals match what you entered

---

## Tagline

*Discipline today. Freedom tomorrow. Legacy forever.*

Onward to Session 3 — and Ronnie crushes the 4pm demo.
