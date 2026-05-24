# Champions Tracker — Session 3 Handoff

**Date:** 2026-05-24
**Owner:** Ronnie Craig
**Status:** Demo deck shipped for 4pm Friday pitch. Original Session 3 priorities (domain + Resend, weekly-wrapup save, real group leaderboard, admin gating, real admin views) all deferred — none of them were touched this session.

---

## 🎯 What actually happened this session

Session opened with the Session 2 priority list (top: buy domain + wire Resend). Ronnie redirected — he had a 4pm pitch in <2 hours and needed a clickable demo deck that could walk a room through both the app AND the leader → owner onboarding flow.

We built that instead.

| # | What | State |
|---|------|-------|
| 1 | New route: `/demo` — 14-slide self-contained walkthrough | ✅ Live |
| 2 | `/signup?code=XXXX` deep-link pre-fill (so the real invite-link story works) | ✅ Live |
| 3 | Hid Ronnie's admin role in the deck (Enrique = the visible admin) | ✅ Live |
| 4 | Daily-log phone mock now shows all 6 tracked fields (was 3) | ✅ Live |
| 5 | Swapped `RONNIE2026` → `DEMO2026` in deck so screenshots can't be used to register under his real code | ✅ Live |

**Commits added this session (all pushed to `origin/main`):**
- `fdcd753` Add /demo slideshow + leader-code deep link on signup
- `9aae00c` Demo: hide Ronnie's admin role + show all 6 log fields
- `1faf1bf` Demo: swap RONNIE2026 → DEMO2026 in the deck

---

## 🎬 The demo deck — what it is

**Route:** `http://localhost:3000/demo` (zero Supabase calls, zero auth — safe to run alongside the real app)

**14 slides, in order:**
1. Cover — "THE CHAMPIONS TRACKER"
2. The problem — coaches don't know who's logging
3. Three roles — Enrique (admin) / You (leader) / Each club owner
4. Onboarding step 1 — your unique invite link (`?code=DEMO2026`)
5. Onboarding step 2 — they tap → signup pre-fills
6. Onboarding step 3 — magic link arrives in 10s
7. Onboarding step 4 — they land signed in, day 0
8. Onboarding step 5 — you see them appear in your group
9. Daily habit — 30 sec, six numbers (all 6 fields shown)
10. Streak — the motivation engine
11. Sunday wrap-up — reflection not data entry
12. Group leaderboard — friendly pressure
13. Admin view — "Enrique sees everything"
14. CTA — book / text Ronnie

**Navigation:** ← / → arrows, spacebar, click anywhere to advance, dot row + Back/Next at the bottom.

**Why no "Ronnie" in admin contexts:** Ronnie asked to hide that he has admin access — other leaders and club owners shouldn't see he can peek at everyone's data. The admin tier is presented as "Enrique" only. Leader contexts (his code, his group view, "text Ronnie direct" CTA) still show his name because those are publicly leader-facing.

**Why `DEMO2026` not `RONNIE2026`:** If someone screenshots slide 4 during a pitch and later visits the URL once the domain goes live, `DEMO2026` won't exist in the `leader_codes` table → signup fails validation. This is intentional. **Don't add `DEMO2026` as a real leader code.**

---

## ✅ What's working RIGHT NOW

Everything from Session 2 still works (auth, daily log save/load, streak, this-week sums, weekly auto-fill grid, RLS) — none of it was touched this session. See `HANDOFF-MAY22-SESSION-2.md` for that surface.

New this session:
- `/demo` deck loads, all 14 slides render, keyboard + click nav works
- `/signup?code=XXX` pre-fills the leader code field
- Production build clean (`npm run build` — all 4 routes prerendered as static content)

---

## ⚠️ Still mock / not done (carry-over from Session 2)

| # | Task | From | Est |
|---|------|------|-----|
| 1 | Buy `thechampions.club` + wire Resend SMTP into Supabase | Session 2 #1 | 30 min |
| 2 | Flip `is_admin=true` for Ronnie + Enrique in Supabase | Session 2 #2 | 2 min |
| 3 | Wire weekly wrap-up SAVE to `weekly_wrapups` table | Session 2 #3 | 30 min |
| 4 | Replace Group tab leaderboard with real query | Session 2 #4 | 45 min |
| 5 | Gate Admin tab visibility behind `is_admin` flag | Session 2 #5 | 15 min |
| 6 | Build real Admin views (Group Pulse / By Leader Code / Needs Attention) | Session 2 #6 | 90 min |
| 7 | Deploy to Vercel + custom domain | Session 2 #7 | 30 min |

**None of these got touched this session.** They remain the real-app work that blocks onboarding actual leaders.

---

## 🚨 Open items / Risks

1. **Supabase email rate limit still in place.** Built-in mailer is ~3-4/hr. Real onboarding will silently drop magic-link emails without Resend.

2. **Ronnie's `is_admin` flag still false in Supabase.** Until he runs:
   ```sql
   update owners set is_admin = true, is_leader = true
   where email = 'azteampossibility@gmail.com';
   ```
   ...the Admin tab UI shows but isn't enforced. Same for Enrique once he signs up.

3. **`DEMO2026` is a deliberate non-existent code.** If we ever add `DEMO2026` as a real leader code later, every old screenshot of the deck becomes a working registration link to whichever leader owns it. **Don't register that code.**

4. **Demo deck will drift from reality.** As real Admin/Group views get built and the actual UI changes, the phone mocks in `/demo` will become stale screenshots-of-a-prior-version. Either: (a) regenerate the mocks each time the UI changes, or (b) replace the mocks with real-screenshot images. Decide before the deck gets used in front of paying prospects.

5. **Sunday is Ronnie's self-imposed deadline.** He said Friday he wants the whole app done by Sunday. Today is Sunday. The 7 carry-over tasks above are what "done" means; none are blocked, just not built yet.

---

## 🎯 Next session — Priority order (unchanged from Session 2)

| # | Task | Est | Notes |
|---|------|-----|-------|
| 1 | Buy `thechampions.club` + wire Resend SMTP into Supabase | 30 min | Still the blocker for real onboarding. Needs Ronnie to do registrar + Resend signups; I can walk him through it click-by-click. |
| 2 | Flip `is_admin=true` for Ronnie + Enrique | 2 min | One SQL line each in Supabase dashboard. |
| 3 | Wire weekly wrap-up SAVE to `weekly_wrapups` table | 30 min | `submitWeek()` currently just fires confetti. Insert a row. |
| 4 | Replace Group tab leaderboard with real query (within-group, sorted by week sums) | 45 min | RLS already enforces group scoping; query is straightforward. |
| 5 | Gate Admin tab visibility behind `is_admin` flag | 15 min | Hide nav button + admin page contents when `owner.is_admin === false`. |
| 6 | Real Admin views — Group Pulse cross-group aggregates, By Leader Code rollups, Needs Attention | 90 min | Biggest single task. |
| 7 | Deploy to Vercel + custom domain (after Task 1) | 30 min | |

**Once Tasks 1-4 ship: real onboarding is unblocked and Ronnie can start signing up coaches.**

---

## 🛠️ Verification cheat sheet (post-restart)

```bash
cd /Users/apple/Projects/champions-tracker
git log --oneline -8                # should show 1faf1bf, 9aae00c, fdcd753 at top
git status                          # clean
git rev-list --left-right --count origin/main...HEAD  # 0  0
ls .env.local                       # exists
npm run dev                         # → http://localhost:3000
```

In browser:
- `/demo` — clickable slideshow, 14 slides, keyboard nav works
- `/signup?code=DEMO2026` — leader code field pre-fills with `DEMO2026` (will fail validation on submit because the code doesn't exist — by design)
- `/signup?code=RONNIE2026` — leader code field pre-fills with `RONNIE2026` (will succeed because it's a real code)
- `/` — auth-gated, redirects to `/signup` when signed out

---

## Tagline

*Discipline today. Freedom tomorrow. Legacy forever.*

Onward to Session 4 — back to the real-app work. Domain + Resend first, then everything unlocks.
