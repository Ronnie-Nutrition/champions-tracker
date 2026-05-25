# Champions Tracker — Session 5 Handoff

**Date:** 2026-05-24 (continuation of Session 4 — same evening)
**Owner:** Ronnie Craig
**Status:** 🚀 **LIVE IN PRODUCTION** at https://championstracker.org. End-to-end magic-link sign-in verified on mobile.

---

## 🎯 What happened this session

Picked up the one remaining Session 4 carry-over (Task 7: deploy + DNS) and shipped it end-to-end. Plus caught and fixed a stale-domain bug in the demo deck.

| Task | State |
|------|-------|
| Deploy `champions-tracker` to Vercel | ✅ DONE |
| Configure Supabase env vars in Vercel | ✅ DONE — `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` added before first deploy |
| Add `championstracker.org` custom domain in Vercel | ✅ DONE — apex as primary, no www redirect |
| Add Vercel CNAME at apex in Cloudflare | ✅ DONE — `championstracker.org` CNAME → `781adb0c9e9009f7.vercel-dns-017.com`, DNS-only (gray cloud) |
| SSL provisioning via Let's Encrypt | ✅ DONE — auto-issued by Vercel within ~30s of DNS resolving |
| Update Supabase Auth Site URL + Redirect URLs | ✅ DONE — Site URL = `https://championstracker.org`, Redirect URLs include `https://championstracker.org/**` and kept `http://localhost:3000/**` for dev |
| End-to-end magic-link sign-in test on prod | ✅ DONE — Ronnie signed in from cell phone, landed on Home tab with real data |
| Fix stale `thechampions.club` URL refs in demo deck | ✅ DONE — 4 occurrences updated to `championstracker.org` |

---

## 🌐 Production infrastructure (as of this session)

- **Live URL:** https://championstracker.org
- **Vercel project:** `champions-tracker` under `ronnie-craigs-projects` team (Hobby plan, free)
- **Default Vercel URL:** `champions-tracker-phi.vercel.app` (still works; useful as a backdoor if DNS ever breaks)
- **DNS provider:** Cloudflare (zone `championstracker.org`)
- **DNS record for Vercel:**
  - Type: CNAME
  - Name: `@` (apex)
  - Content: `781adb0c9e9009f7.vercel-dns-017.com`
  - Proxy: DNS only (gray cloud — required by Vercel)
  - TTL: Auto
- **SSL:** auto-issued by Vercel via Let's Encrypt, auto-renews
- **Email (still as configured in Session 4):** Resend SMTP, sender `Champions Tracker <hello@championstracker.org>`
- **Auth URLs in Supabase:**
  - Site URL: `https://championstracker.org`
  - Redirect URLs: `https://championstracker.org/**`, `http://localhost:3000/**`

---

## 💻 Code changes shipped (1 commit)

### Commit — Demo deck stale URL fixes (`cd942c6`)

**Files:** `src/app/demo/page.tsx`, `src/app/signup/page.tsx`

- [src/app/demo/page.tsx:107](src/app/demo/page.tsx#L107) — onboarding step 1 invite link: `thechampions.club` → `championstracker.org`
- [src/app/demo/page.tsx:595](src/app/demo/page.tsx#L595) — ShareCard component link: same fix
- [src/app/demo/page.tsx:648](src/app/demo/page.tsx#L648) — email mockup "from" line: `noreply@thechampions.club` → `hello@championstracker.org` (matches actual Resend sender)
- [src/app/signup/page.tsx:40](src/app/signup/page.tsx#L40) — comment-only fix in the leader-code pre-fill block

Production build clean. Vercel auto-deployed on push.

---

## ✅ What's verified working in prod RIGHT NOW

1. ✅ `https://championstracker.org` loads with valid SSL (no cert warnings)
2. ✅ `/signup` route renders the signup form with all 3 fields
3. ✅ Leader code pre-fills from `?code=XXXX2026` URL param
4. ✅ Magic-link email arrives via Resend (sender `hello@championstracker.org`) within ~10s
5. ✅ Magic link redirects to `championstracker.org` (NOT localhost) and completes sign-in
6. ✅ Signed-in user lands on Home tab with real streak/customer/sales data from `daily_logs`
7. ✅ Header reads "Enrique Carrillo • Ronnie Craig" on non-admin tabs
8. ✅ Admin tab is visible for Ronnie (`is_admin=true` flag respected in prod)
9. ✅ All 5 tabs render: Home / Log / Week / Group / Admin
10. ✅ Mobile (iOS Safari from cell phone) works end-to-end

---

## ⏳ Pending — Enrique onboarding

Enrique's account still doesn't exist in `owners` because he hasn't signed up. Now that the app is live, sequence is:

1. Text Enrique: `https://championstracker.org/signup?code=ENRIQUE2026`
2. He signs up via magic link.
3. In Supabase SQL Editor, flip his flags:
   ```sql
   update owners set is_admin = true, is_leader = true
   where email = '<enrique's email>'
   returning name, email, is_admin, is_leader, leader_code;
   ```
4. End state: 2 admins (Ronnie + Enrique), each with `is_admin=true, is_leader=true`.

---

## 📋 New-leader onboarding playbook (for adding future leaders below Ronnie + Enrique)

When Ronnie wants to add a new leader (e.g., "Maria Garcia"):

**Step 1 — Create her leader code in Supabase SQL Editor:**
```sql
insert into leader_codes (code, leader_name)
values ('MARIA2026', 'Maria Garcia');
```
Convention: `FIRSTNAME2026` (uppercase, no spaces, year suffix).

**Step 2 — Text her the signup link:**
```
https://championstracker.org/signup?code=MARIA2026
```

**Step 3 — After she signs up, flip her `is_leader` (NOT `is_admin`):**
```sql
update owners set is_leader = true
where email = '<her email>'
returning name, email, is_leader, leader_code;
```

**Step 4 — She shares the same link with her downline.** Anyone who signs up via that link inherits `leader_code=MARIA2026`, slots into her group, and appears in her Group tab leaderboard automatically.

### Hierarchy in plain English

- **Admin** (Ronnie, Enrique): Admin tab → cross-group pulse + every leader's rollup + needs-attention list
- **Leader** (Maria, future hires): Group tab → just her own team's leaderboard + pulse
- **Owner** (downline members): Home/Log/Week → personal data + a peek at their team's leaderboard

The model is **flat**, not nested. There's no structural rollup of one leader under another — the Admin tab provides the umbrella view that simulates hierarchy.

---

## 🎯 Carry-over for Session 6

### Gap 2 (NEW — surfaced this session) — Leader invite link UI

**Problem:** Leaders have no in-app way to grab their own invite link. Right now Ronnie has to text each leader their code/URL manually whenever they want to bring on a new downline member.

**Fix:** Add a "Your team invite link" card to the Group tab, visible only when `owner.is_leader === true`. Include:
- The full URL: `https://championstracker.org/signup?code={owner.leader_code}`
- A "Copy link" button
- Optional: a small "Share via SMS" mailto:/sms: deep link
- Brief one-liner: "Share this link with anyone you want on your team."

**Files likely to touch:**
- [src/app/page.tsx](src/app/page.tsx) — Group tab render block (search for the Group panel JSX)
- Possibly a new small component in `src/components/` if there isn't already a place

**Estimated:** 30-45 min.

### Other carry-overs from Session 4 still standing

- **10 leftover test users in Supabase Auth.** Cleanup candidate — query `auth.users` minus the 2 real admins, decide which to delete. Not urgent.
- **"Consumption Sales" label not renamed.** Only "Consumptions/Drinks → Customers" was done in Session 4. If "Consumption Sales" causes confusion with the "Customers" count, rename to "In-Club Sales".
- **Header hardcodes "Enrique Carrillo"** for every non-admin user — meaning every owner sees `Enrique Carrillo • Their Name`. Matches Ronnie's umbrella-coach intent; revisit if a different framing is wanted later.
- **Demo deck uses `DEMO2026`** as a deliberately non-existent code. Do NOT add `DEMO2026` to `leader_codes` — old screenshots would become working registration links.

---

## 🚨 Open items / Risks

1. **Resend API key lives only in Supabase Auth SMTP config** — if lost, generate a new sending-scoped key in Resend → paste back into Supabase Auth → Emails → SMTP Settings. Not stored anywhere else (intentional).

2. **Cloudflare proxy is OFF (DNS only) for the apex CNAME.** This is required by Vercel — don't toggle it to orange. Doing so would break the connection (Vercel issues the SSL cert against the origin and expects direct traffic).

3. **No `www.championstracker.org` redirect set up.** If someone types `www.championstracker.org` they'll get a "site can't be reached" error. Low risk (the canonical brand is the apex), but if Ronnie wants to add it later: add `www` as a domain in Vercel, set it to redirect to apex, then add a CNAME `www → cname.vercel-dns.com` in Cloudflare.

4. **Vercel project visibility / git author.** Commits are being authored as `Apple <apple@Apples-Air.hsd1.tx.comcast.net>` (default Mac shell hostname). Not breaking anything, but if Ronnie wants commits attributed to his real email, set `git config --global user.email azteampossibility@gmail.com` and `git config --global user.name "Ronnie Craig"`.

---

## 🛠️ Verification cheat sheet (post-restart)

```bash
cd /Users/apple/Projects/champions-tracker
git log --oneline -5                                  # latest 5 should show Session 4 + Session 5 commits
git status                                            # clean
git rev-list --left-right --count origin/main...HEAD  # 0  0
dig championstracker.org +short                       # → 216.198.79.65, 64.29.17.65 (Vercel)
curl -sI https://championstracker.org | head -3       # 200 OK, server: Vercel
```

In any browser:
- Open https://championstracker.org → signup form renders, no SSL warnings
- Open https://championstracker.org/signup?code=ENRIQUE2026 → leader code field shows ENRIQUE2026

In Supabase SQL editor:
```sql
select code, leader_name from leader_codes order by code;
-- ENRIQUE2026 | Enrique Carrillo
-- RONNIE2026  | Ronnie Craig

select name, email, is_admin, is_leader, leader_code
from owners
where is_admin = true;
-- Ronnie Craig | azteampossibility@gmail.com | true | true | RONNIE2026
-- (Enrique appears here once he signs up + you run his admin SQL)
```

---

## Tagline

*Discipline today. Freedom tomorrow. Legacy forever.*

🚀 **The app is live.** Onward to Session 6 — bring on the leaders, add the invite-link UI, watch the streaks roll in.
