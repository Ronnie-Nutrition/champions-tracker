# Champions Tracker — Session 4 Handoff

**Date:** 2026-05-24 (same day as Session 3 — afternoon → evening continuation)
**Owner:** Ronnie Craig
**Status:** Production infrastructure done. App functionally complete. **One remaining task: Vercel deploy + DNS for championstracker.org.**

---

## 🎯 What happened this session

Picked up the Session 3 carry-over list and shipped 6 of 7 tasks. Only deploy (Task 7) remains.

| # | Task | State |
|---|------|-------|
| 1 | Buy `thechampions.club` + wire Resend SMTP into Supabase | ✅ DONE — domain changed to `championstracker.org` (see below) |
| 2 | Flip `is_admin=true` for Ronnie + Enrique | ✅ DONE for Ronnie. Enrique pending sign-up |
| 3 | Wire weekly wrap-up SAVE to `weekly_wrapups` table | ✅ DONE — upsert pattern, re-submits update same week |
| 4 | Replace Group tab leaderboard with real query | ✅ DONE — real group pulse + real leaderboard |
| 5 | Gate Admin tab visibility behind `is_admin` flag | ✅ DONE — nav button + panel both gated |
| 6 | Build real Admin views (Group Pulse / By Leader Code / Needs Attention) | ✅ DONE — all three real queries |
| 7 | Deploy to Vercel + custom domain | ⏳ NEXT SESSION |

Plus three out-of-band requests Ronnie added mid-session:
- ✅ Created `ENRIQUE2026` leader code in prod + master schema seed
- ✅ Removed placeholder leader codes (`MARIA2026`, `JOHN2026`, `SARA2026`, `MIKE2026`) from both prod DB and migration files
- ✅ Relabeled "Consumptions" / "Drinks" → "Customers" everywhere in UI (the metric counts customer visits, not drinks ordered)
- ✅ Header label "Owner" → "Enrique Carrillo" on non-Admin tabs

---

## 🌐 Domain & email infrastructure (NEW)

### Domain
- **Production domain: `championstracker.org`** (NOT `thechampions.club` — that was already registered when Ronnie went to buy it)
- Registered at **Cloudflare Registrar** under his `ronnie@easyaiflows.com` Cloudflare account
- Cost: $7.50 first year, $10.13/yr renewal — auto-renew ON, expires 2027-05-24
- Registrant: business address (8201 Broadway #113, Pearland TX 77581)
- WHOIS privacy enabled automatically

### Email (Resend SMTP)
- **Provider: Resend** — free tier (3000/mo, 100/day)
- Domain verified in Resend with full DKIM + SPF + DMARC chain
- DNS records added to Cloudflare via API (curl, not by hand — see commit history if you need to redo)
- 4 DNS records live in `championstracker.org` zone:
  - `resend._domainkey` TXT (DKIM)
  - `send` MX → feedback-smtp.us-east-1.amazonses.com (priority 10)
  - `send` TXT (SPF: v=spf1 include:amazonses.com ~all)
  - `_dmarc` TXT (v=DMARC1; p=none;)
- Resend API key (sending-scoped to `championstracker.org`) lives **only in Supabase Auth → SMTP Settings** — never committed to repo
- **Sender:** `Champions Tracker <hello@championstracker.org>`
- Supabase Auth → Emails → SMTP Settings: host `smtp.resend.com`, port 465, username `resend`, password = the Resend API key
- End-to-end verified: magic-link OTP → arrived at azteampossibility@gmail.com in <10s, inbox not spam, sign-in worked
- Rate limit: 3-4/hr (Supabase built-in) → 30/hr (Resend SMTP, adjustable in Supabase Auth → Rate Limits)

---

## 💻 Code changes shipped (3 commits)

### Commit 1 — Tasks 3, 4, 5, 6 + UI relabel
**Files:** `src/app/page.tsx`, `src/lib/owner.ts`, `src/app/demo/page.tsx`

- `Owner` type now includes `is_admin: boolean` and `is_leader: boolean`. Both Supabase selects in `getOrCreateOwner()` updated to pull those columns.
- **Admin gating (Task 5)**: Admin panel + Admin nav button now wrapped in `{owner.is_admin && (...)}`. Sign out button moved out of Admin panel into Home panel (so non-admins still have a way to sign out).
- **Weekly wrap-up SAVE (Task 3)**: `submitWeek` is now async, takes a form event, reads `FormData`, upserts to `weekly_wrapups` with `onConflict: 'owner_id,week_start'`. All form fields wrapped in `<form onSubmit={submitWeek}>` with `name=` attributes. Toggle buttons given `type="button"` to prevent accidental form submit.
- **Group leaderboard (Task 4)**: New `loadGroup(me)` function queries owners-by-leader_code + their last 35 days of daily_logs, aggregates client-side, sorts by week customers desc. Group Pulse now shows real totals + active-owners-this-week count. Leaderboard renders real rows with empty-state fallback.
- **Admin views (Task 6)**: New `loadAdminViews(me)` function gated to `is_admin`. Cross-group Pulse (consumptions, sales, new customers, avg streak, active today), By Leader Code rollups (sorted by drinks desc), Needs Attention (broke-streak owners + missing wrap-up count). All three replace mock data.
- **UI relabel**: "Consumptions" / "Drinks" → "Customers" across Home, Log, Week, Group, Admin, and the demo deck. "Owner" header label → "Enrique Carrillo" (Admin tab still shows "Admin"). DB columns unchanged — pure label work.

### Commit 2 — Schema/seed cleanup
**Files:** `supabase/schema.sql`, `supabase/migrations/003-enable-rls-and-policies.sql`

- Removed the four placeholder leader codes (`MARIA2026`, `JOHN2026`, `SARA2026`, `MIKE2026`) from migration 003 seed block. They were dev fixtures; if left in, anyone with that string could sign up under a fake leader.
- Added `ENRIQUE2026` to the `schema.sql` seed alongside `RONNIE2026`. Fresh databases now seed exactly the two real admin/leader codes.
- Prod DB cleanup also done via SQL (see "Manual SQL run in prod" below).

### Commit 3 — This handoff doc
- `HANDOFF-MAY24-SESSION-4.md`

---

## 🗄️ Manual SQL runs in prod this session

1. **Promote Ronnie to admin/leader:**
   ```sql
   update owners set is_admin = true, is_leader = true
   where email = 'azteampossibility@gmail.com'
   returning name, email, is_admin, is_leader, leader_code;
   ```
   → 1 row updated. Ronnie now has `is_admin=true, is_leader=true, leader_code=RONNIE2026`.

2. **Create Enrique's leader code:**
   ```sql
   insert into leader_codes (code, leader_name)
   values ('ENRIQUE2026', 'Enrique Carrillo')
   on conflict (code) do nothing;
   ```

3. **Delete placeholder leader codes:**
   ```sql
   delete from leader_codes
   where code in ('MARIA2026','JOHN2026','SARA2026','MIKE2026');
   ```
   → Either 0 or 4 rows deleted depending on whether migration 003's seed had been applied to prod. End state: leader_codes contains exactly `RONNIE2026` + `ENRIQUE2026`.

---

## ✅ What's working RIGHT NOW (verified)

End-to-end magic-link auth via Resend SMTP — Ronnie received "Your sign-in link" from `Champions Tracker <hello@championstracker.org>` in his Gmail inbox (not spam), clicked it, landed signed in. SPF/DKIM/DMARC chain healthy.

App at localhost:3000 (verified by Ronnie this session):
- Home shows real streak, this-week sums, daily entry. Sign out button at bottom.
- Log saves to `daily_logs`.
- Week wrap-up upserts to `weekly_wrapups` (confetti + toast on success).
- Group shows real pulse + real leaderboard (only Ronnie as logger right now — appears at rank 1).
- Admin tab visible (is_admin=true). Cross-group pulse, by-leader rollups, needs-attention list — all real data.
- Header reads "Enrique Carrillo • Ronnie Craig" on all non-Admin tabs, "Admin • Ronnie Craig" on Admin.

Production build clean: `npm run build` — all 4 routes prerendered as static content.

---

## ⏳ Pending — Task 7 (next session)

**Deploy to Vercel + wire `championstracker.org` to point at it.**

The path is straightforward:
1. Sign into Vercel (https://vercel.com) with the GitHub account that owns `Ronnie-Nutrition/champions-tracker` (or whatever repo this lives in — confirm).
2. Click **Import Project** → pick the `champions-tracker` repo.
3. Framework auto-detected as Next.js. Click **Deploy**.
4. After first deploy succeeds, go to **Project Settings → Environment Variables** and add both Supabase env vars from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Redeploy so the build picks up env vars.
6. Project Settings → **Domains** → add `championstracker.org` (and optionally `www.championstracker.org`). Vercel will give you DNS records to add.
7. In Cloudflare DNS for `championstracker.org`, add the Vercel records (likely an A record or a CNAME — Vercel will tell you exactly).
8. SSL auto-issues via Let's Encrypt within a few minutes.
9. In Supabase Auth → URL Configuration, add `https://championstracker.org` to the Site URL + Redirect URLs allowlist (otherwise magic-link redirects to localhost will break in prod).
10. Test: magic-link sign-in from the live URL.

Estimated time: 30 min. No further code changes needed — the app is deploy-ready.

---

## ⏳ Also pending — Enrique onboarding

Enrique's account doesn't exist in `owners` yet because he hasn't signed up. The full sequence (do post-deploy):

1. Text him: `https://championstracker.org/signup?code=ENRIQUE2026`
2. He signs up via magic link.
3. Once he's in, run this SQL in Supabase:
   ```sql
   update owners set is_admin = true, is_leader = true
   where email = '<enrique's email>'
   returning name, email, is_admin, is_leader, leader_code;
   ```

---

## 🚨 Open items / Risks

1. **The header hardcodes "Enrique Carrillo"** for every non-admin tab — meaning *every* user (not just Ronnie) sees `Enrique Carrillo • Their Name` at the top. This matches Ronnie's intent (Enrique as umbrella coach over everyone). If different framing is needed later — e.g., each owner sees their direct leader's name — it'd need a code change.

2. **Demo deck uses `DEMO2026` (intentional, deliberately non-existent code).** Never add `DEMO2026` to the leader_codes table — old screenshots from the deck would become working registration links.

3. **`Consumption Sales` label NOT renamed.** Ronnie only asked to rename "Consumptions" → "Customers" (the count). "Consumption Sales" still references the old term. Could be renamed to e.g., "In-Club Sales" in a future session if confusion comes up.

4. **Supabase Auth Site URL / Redirect URL is still localhost.** Must be updated to `https://championstracker.org` as part of Task 7 deploy, or magic links from prod will redirect to localhost and break.

5. **Resend API key lives only in Supabase Auth SMTP config.** If lost, generate a new one in Resend → paste back into Supabase Auth → Emails → SMTP Settings. Not stored anywhere else (intentional — never committed).

---

## 🛠️ Verification cheat sheet (post-restart)

```bash
cd /Users/apple/Projects/champions-tracker
git log --oneline -10                # latest 3 commits should be Session 4 work
git status                           # clean
git rev-list --left-right --count origin/main...HEAD  # 0  0
npm run dev                          # → http://localhost:3000
```

In browser at localhost:3000 (after magic-link sign in):
- Header reads "Enrique Carrillo • Ronnie Craig"
- All 5 tabs work, Customer labels everywhere
- Admin tab visible, all three real views render

In Supabase SQL editor:
```sql
select code, leader_name from leader_codes order by code;
-- ENRIQUE2026 | Enrique Carrillo
-- RONNIE2026  | Ronnie Craig
```

---

## Tagline

*Discipline today. Freedom tomorrow. Legacy forever.*

Onward to Session 5 — Vercel deploy is the only thing standing between this app and real coach onboarding.
