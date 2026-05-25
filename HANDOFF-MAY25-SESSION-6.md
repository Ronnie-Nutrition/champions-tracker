# Champions Tracker — Session 6 Handoff

**Date:** 2026-05-25 (Day 2 of production — continuing the May 24 deploy momentum)
**Owner:** Ronnie Craig
**Status:** Production is healthy. App is live with 2 admins, 3 active leaders, 1 active owner, 2 leaders still pending signup. PWA-installable on iOS / Android with branded home-screen icon.

---

## 🎯 What happened this session

Shipped four UX/infra improvements + onboarded the first real wave of leaders + handled the first real "support ticket" (Michelle's broken sign-in loop).

| Task | State |
|------|-------|
| **Gap 2 — Leader Invite Link UI** (carry-over from Session 5) | ✅ DONE — card on Group tab, leader-gated, with copy-to-clipboard |
| **Gap 3 — Dedicated /signin route** (surfaced this session) | ✅ DONE — email-only sign-in for returning users; /signup stays for new users with `?code=XXXX` |
| **www.championstracker.org redirect** | ✅ DONE — 308 permanent redirect to apex, SSL provisioned via Vercel |
| Topbar UI cleanup ("Sign in" label removed from /signin + /signup) | ✅ DONE — was looking clickable but was just a plain div |
| **PWA polish** — proper Add-to-Home-Screen icon | ✅ DONE — lime flame on dark bg, 192/512/apple-180 PNGs + master SVG, reproducible build script |
| **Onboarded Enrique as admin** | ✅ DONE — signed up with thespotnutrition@gmail.com, `is_admin=true, is_leader=true, leader_code=ENRIQUE2026` |
| **Created leader codes for Jon, Bernadette, Martin, Yvette, Lisa** | ✅ DONE — JON2026, BERNADETTE2026, MARTIN2026, YVETTE2026, LISA2026 inserted |
| **Onboarded Martin Banda as leader** | ✅ DONE — martinbanda1994@gmail.com, `is_leader=true, leader_code=MARTIN2026` |
| **Onboarded Jon Hood as leader** | ✅ DONE — jonhoodfit@gmail.com, `is_leader=true, leader_code=JON2026` |
| **Onboarded Lisa Cassity as leader** | ✅ DONE — lisacassity@yahoo.com, `is_leader=true, leader_code=LISA2026` |
| **Fixed Michelle Fairman's broken sign-in loop** | ✅ DONE — see "Support tickets" section below |

---

## 👥 Current human roster

### Admins (see everything via Admin tab)
- **Ronnie Craig** — azteampossibility@gmail.com — `leader_code=RONNIE2026`
- **Enrique Carrillo** — thespotnutrition@gmail.com — `leader_code=ENRIQUE2026`

### Leaders (see their own team in Group tab)
- **Martin Banda** — martinbanda1994@gmail.com — `leader_code=MARTIN2026`
- **Jon Hood** — jonhoodfit@gmail.com — `leader_code=JON2026`
- **Lisa Cassity** — lisacassity@yahoo.com — `leader_code=LISA2026`

### Regular owners (signed up, logging activity under a leader)
- **Michelle Fairman** — standoutnutrition860@gmail.com — `leader_code=ENRIQUE2026` (under Enrique's group)

### Invited but not yet signed up (`leader_codes` row exists, no `owners` row)
- **Bernadette Carrillo** — leader code `BERNADETTE2026` — invite text not yet sent (or sent and pending)
- **Yvette Gomez** — leader code `YVETTE2026` — invite text not yet sent (or sent and pending)

### Reserved / non-issued codes
- `DEMO2026` — intentionally NOT in `leader_codes`. Used by the demo deck as a deliberately-broken example link. Never create it.

---

## 💻 Code changes shipped (6 commits this session)

### `0709787` — Add 'Your Team Invite Link' card to Group tab for leaders (Gap 2)
**Files:** `src/app/page.tsx`
- Added [src/app/page.tsx:103](src/app/page.tsx#L103) — new `inviteCopied` state for the copy-feedback toast.
- Added a `card` block at the top of the Group tab — only renders when `owner.is_leader && owner.leader_code`. Shows the leader's personal signup URL (`https://championstracker.org/signup?code={code}`) in a monospace selectable box plus a `COPY LINK` button that uses `navigator.clipboard.writeText`. Falls back to a toast prompting long-press copy if the Clipboard API throws.

### `5a7a636` — Add dedicated /signin route (Gap 3) for returning users
**Files:** `src/app/signin/page.tsx` (NEW), `src/app/page.tsx`, `src/app/signup/page.tsx`
- New `/signin` page: email-only form, no name, no leader code. Sends magic link via Supabase OTP. Auto-bounces to `/` if there's already a session.
- Routing changes in `page.tsx`:
  - `no-session` → `/signin` (was `/signup`)
  - `incomplete-signup` → `/signup` (unchanged — these are users who signed in via /signin but have no owners row, so they need to provide a leader code)
  - `SIGNED_OUT` → `/signin`
  - `handleSignOut()` → `/signin`
  - Error retry button → `/signin`
- Added cross-link on `/signup` ("Already have an account? Sign in") and on `/signin` ("First time here? Use the invite link from your leader.")

### `3ba86d1` — Remove ambiguous 'Sign in' label from /signin and /signup topbars
**Files:** `src/app/signin/page.tsx`, `src/app/signup/page.tsx`
- Dropped the topbar-meta "Sign in" `<div>` that looked clickable. The form headline already makes page purpose clear. Main app's topbar-meta (which carries "Enrique Carrillo • Ronnie Craig") is unchanged.

### `242d948` — PWA polish: real app icon for Add to Home Screen
**Files:** `src/app/icon.svg` (NEW), `src/app/apple-icon.png` (NEW), `public/icon-192.png` (NEW), `public/icon-512.png` (NEW), `scripts/gen-icons.mjs` (NEW), `public/manifest.json`, `src/app/layout.tsx`; deleted leftover create-next-app SVGs (`file/globe/next/vercel/window.svg`).
- Master SVG (`src/app/icon.svg`) is a lime flame (`#d4ff3f` outer, `#a4c92e` inner) on dark `#0f1410` background. Next.js auto-serves it as `/icon.svg` for the favicon.
- `src/app/apple-icon.png` (180x180) auto-served as `/apple-icon.png`, picked up by iOS as the home-screen icon.
- `public/icon-192.png` + `icon-512.png` referenced from the existing manifest.json (which previously 404'd those URLs since Session 1).
- `scripts/gen-icons.mjs` is a reproducible sharp-based SVG→PNG pipeline. Re-run with `node scripts/gen-icons.mjs` from project root if the design ever changes.
- Also fixed stale "consumptions" → "customers" in manifest.json + layout.tsx descriptions to match Session 4's terminology rename.

(Sessions 4 + 5 commits — environment + first deploy + handoff docs — remain on `main` from yesterday.)

---

## 🆘 Support tickets handled this session

### Michelle Fairman — infinite magic-link loop

**Symptom (per Ronnie):** "She can't log into it at all, keeps sending her email and loops."

**Root cause:** Michelle had signed in via `/signin` (email-only flow) which authenticated her in `auth.users` but didn't create an `owners` row (since `/signin` doesn't capture a `leader_code` in `user_metadata`). The home page then bounced her to `/signup`, where she likely kept clicking older magic-link emails instead of submitting the form fresh — keeping her in a stale-metadata state.

**Fix:** Manually inserted her `owners` row via SQL Editor, linking to her existing `auth.users` id, under Enrique's leader code:

```sql
insert into owners (auth_user_id, name, email, leader_code)
select id, 'Michelle Fairman', 'standoutnutrition860@gmail.com', 'ENRIQUE2026'
from auth.users
where email = 'standoutnutrition860@gmail.com'
returning name, email, leader_code, is_admin, is_leader;
```

Result confirmed: `Michelle Fairman | standoutnutrition860@gmail.com | ENRIQUE2026 | false | false`.

**Why this is the right fix going forward:** The `/signin` route is correct (returning users shouldn't need a leader_code). The bug is in how a *new* user who lands on `/signin` instead of an invite link gets recovered. The fallback already exists (`incomplete-signup` → `/signup`) but is brittle if they keep clicking stale magic links. **Session 7 candidate:** make `/signup` write the freshest leader_code into `user_metadata` AND re-run the `owners` upsert immediately, so a returning-incomplete user can self-recover by submitting `/signup` once. For now, manual SQL fix is the workaround.

---

## 🌐 Production infrastructure status

- **Live URL:** https://championstracker.org ✅
- **www redirect:** `www.championstracker.org` → 308 → `championstracker.org` ✅ (verified via terminal: `HTTP/2 308 location: https://championstracker.org/`)
- **Vercel project:** `champions-tracker` under `ronnie-craigs-projects` (Hobby plan)
- **DNS records in Cloudflare zone `championstracker.org`:**
  - `championstracker.org` (apex) CNAME → `781adb0c9e9009f7.vercel-dns-017.com` — DNS only
  - `www` CNAME → `781adb0c9e9009f7.vercel-dns-017.com` — DNS only (NEW this session)
  - `send` MX → feedback-smtp.us-east-1.amazonses.com (Resend)
  - `send` TXT (SPF: `v=spf1 include:amazonses.com ~all`)
  - `_dmarc` TXT (`v=DMARC1; p=none;`)
  - `resend._domainkey` TXT (DKIM)
- **SSL:** Auto-issued via Let's Encrypt for both apex AND www
- **Email:** Resend SMTP, sender `Champions Tracker <hello@championstracker.org>` (unchanged from Session 4)
- **Supabase Auth URLs:**
  - Site URL: `https://championstracker.org`
  - Redirect URLs: `https://championstracker.org/**`, `http://localhost:3000/**`

---

## ⏳ Carry-over for Session 7

### High priority
1. **Bernadette + Yvette signups.** Once they each tap their invite link and sign up:
   ```sql
   update owners set is_leader = true
   where email = '<their email>'
   returning name, email, is_leader, leader_code;
   ```
2. **End-to-end verification of /signin route on prod.** Ronnie tested the page rendering but not the full magic-link round trip. Need to confirm: open https://championstracker.org/signin in incognito → email → magic link → land on Home (NOT bounced back to /signup).
3. **Ysela shared-login activation.** Ronnie chose Option 1 (Ysela uses `azteampossibility@gmail.com`). Walk her through it on her phone:
   - Open https://championstracker.org → /signin → type the shared email → magic link → tap link in Gmail → signed in → Safari Share → Add to Home Screen.
4. **Self-heal /signup flow for users in Michelle's situation.** If a user signs in via /signin but has no owners row, the current fallback bounces them to /signup but doesn't always recover cleanly (Michelle hit a loop). Proposed fix: when `/signup` submits a magic link for an already-authenticated user with missing owners row, also pre-emptively insert the owners row using the newly-provided leader_code, so they self-heal on the next session load. Avoids future manual SQL support tickets.

### Medium priority — known UX gaps from earlier sessions still standing
4. **"Consumption Sales" label** wasn't renamed in Session 4's terminology cleanup ("Drinks → Customers"). Consider renaming to "In-Club Sales" if real users find it confusing.
5. **Header hardcodes "Enrique Carrillo"** on non-admin tabs. Matches Ronnie's umbrella-coach intent for now; revisit if a real leader other than Enrique becomes top-of-hierarchy.
6. **10 leftover test users in Supabase Auth.** Cleanup candidate, very low priority. Query:
   ```sql
   select id, email, created_at from auth.users
   where id not in (select auth_user_id from owners);
   ```

### Low priority / future considerations
7. **Co-owner / household support (Option 2 for Ysela).** If Ysela ever wants her own login that still rolls into "Nutrition Hub," that needs a schema change. 2-4 hours of work.
8. **PWA / Add-to-Home-Screen polish.** Currently works via browser bookmark; a `manifest.json` + proper app icons would make it feel native on iOS. ~30 min.
9. **Demo deck domain refs** are already fixed (Session 5). Just don't ever create `DEMO2026` in `leader_codes` or the deck becomes a live registration funnel.

---

## ✅ Verification cheat sheet (post-restart)

```bash
cd /Users/apple/Projects/champions-tracker
git log --oneline -8                                       # last 8 commits include all Session 6 work
git status                                                  # clean
git rev-list --left-right --count origin/main...HEAD        # 0  0
dig championstracker.org +short                             # → 216.198.79.65, 64.29.17.65 (Vercel)
dig www.championstracker.org +short                         # → same IPs via CNAME flattening
curl -sI https://www.championstracker.org | head -3         # → HTTP/2 308 → https://championstracker.org/
curl -sI https://championstracker.org/signin | head -3      # → HTTP/2 200
```

In browser:
- https://championstracker.org → redirects to `/signin` (if signed out) or shows Home (if signed in)
- https://championstracker.org/signin → email-only form
- https://championstracker.org/signup?code=ENRIQUE2026 → 3-field signup form with code prefilled
- https://www.championstracker.org → 308 → apex
- Group tab as a leader → "Your Team Invite Link" card with your personal URL + COPY LINK button

In Supabase SQL:
```sql
select code, leader_name from leader_codes order by code;
-- BERNADETTE2026 | Bernadette Carrillo
-- ENRIQUE2026    | Enrique Carrillo
-- JON2026        | Jon Hood
-- LISA2026       | Lisa Cassity
-- MARTIN2026     | Martin Banda
-- RONNIE2026     | Ronnie Craig
-- YVETTE2026     | Yvette Gomez

select name, email, is_admin, is_leader, leader_code
from owners
order by is_admin desc, is_leader desc, name;
-- Ronnie Craig      | azteampossibility@gmail.com   | true  | true  | RONNIE2026
-- Enrique Carrillo  | thespotnutrition@gmail.com    | true  | true  | ENRIQUE2026
-- Jon Hood          | jonhoodfit@gmail.com          | false | true  | JON2026
-- Lisa Cassity      | lisacassity@yahoo.com         | false | true  | LISA2026
-- Martin Banda      | martinbanda1994@gmail.com     | false | true  | MARTIN2026
-- Michelle Fairman  | standoutnutrition860@gmail.com| false | false | ENRIQUE2026
-- (Bernadette + Yvette appear here once they sign up + you flip them)
```

---

## 🚨 Open items / Risks

1. **`/signin` was deployed but the full magic-link round-trip wasn't verified end-to-end** this session. Top of Session 7's checklist.
2. **Bernadette and Yvette's invite texts may or may not have been sent yet** — confirm with Ronnie when Session 7 starts.
3. **Cloudflare proxy stays OFF (DNS only)** for both apex CNAME and www CNAME. Required by Vercel. Don't flip to orange cloud.
4. **No nested hierarchy** — each leader is independent, each owner belongs to exactly one leader via `leader_code`. The Admin tab is what provides the rollup view. Document this if/when a leader asks "why doesn't my team appear under my upline."
5. **Vercel project visibility / git author** still shows `Apple <apple@Apples-Air.hsd1.tx.comcast.net>` on commits. Cosmetic; if Ronnie wants commits attributed to his email, set `git config --global user.email azteampossibility@gmail.com` and `git config --global user.name "Ronnie Craig"`.

---

## Tagline

*Discipline today. Freedom tomorrow. Legacy forever.*

Onward to Session 7 — verify Gap 3 end-to-end, finish onboarding Bernadette + Yvette, activate Ysela's shared login, and watch the leaderboard fill up with real coaches.
