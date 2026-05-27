# Champions Tracker — Session 7 Handoff

**Date:** 2026-05-26 (Day 3 of production)
**Owner:** Ronnie Craig
**Status:** Production healthy. App now serves 2 admins, 4 active leaders (Martin, Jon, Lisa, **Bernadette**), 1 leader pending signup (Yvette), and the first downline owner under a non-Enrique leader (Gloria under Bernadette). Two material code fixes shipped: self-healing `/signup` flow and dynamic leader-name in the topbar.

---

## 🎯 What happened this session

| Task | State |
|------|-------|
| **Self-heal `/signup` flow** (Session 6's #1 carry-over — Michelle's loop fix) | ✅ DONE — commit `f242e14`, deployed |
| **Dynamic leader name in topbar** (was hardcoded "Enrique Carrillo") | ✅ DONE — commit `5e5e3e1`, deployed |
| **Bernadette Carrillo onboarded as leader** | ✅ DONE — `cocoacleveland@gmail.com`, `is_leader=true`, `leader_code=BERNADETTE2026` |
| **Gloria Carrillo signed up — moved from Enrique to Bernadette** | ✅ DONE — `ghcarr3@gmail.com`, `leader_code` updated via SQL |
| **Yvette Gomez email confirmed** | ✅ DONE — `mrjuangomez1@gmail.com` (shared with husband Juan); waiting on her signup |
| **Coach-facing copy/SMS** — daily check-in, Sunday wrap-up, first-time setup, downline invites for Enrique + Bernadette + Gloria-refresh | ✅ DONE — copy delivered to Ronnie via chat (not stored in repo) |

---

## 👥 Current human roster

### Admins (see everything via Admin tab)
- **Ronnie Craig** — azteampossibility@gmail.com — `leader_code=RONNIE2026`
- **Enrique Carrillo** — thespotnutrition@gmail.com — `leader_code=ENRIQUE2026`

### Leaders (see their own team in Group tab + "Your Team Invite Link" card)
- **Martin Banda** — martinbanda1994@gmail.com — `leader_code=MARTIN2026`
- **Jon Hood** — jonhoodfit@gmail.com — `leader_code=JON2026`
- **Lisa Cassity** — lisacassity@yahoo.com — `leader_code=LISA2026`
- **Bernadette Carrillo** — cocoacleveland@gmail.com — `leader_code=BERNADETTE2026` ✨ NEW

### Regular owners (signed up, logging activity under a leader)
- **Michelle Fairman** — standoutnutrition860@gmail.com — `leader_code=ENRIQUE2026`
- **Gloria Carrillo** — ghcarr3@gmail.com — `leader_code=BERNADETTE2026` ✨ NEW (originally signed up under ENRIQUE2026, moved via SQL)

### Invited but not yet signed up (`leader_codes` row exists, no `owners` row)
- **Yvette Gomez** — leader code `YVETTE2026`, email `mrjuangomez1@gmail.com` (shared with husband Juan). Invite link sent.

### Reserved / non-issued codes
- `DEMO2026` — intentionally NOT in `leader_codes`. Used by the demo deck as a deliberately-broken example link. Never create it.

---

## 💻 Code changes shipped (2 commits this session)

### `f242e14` — Self-heal /signup when user is already authenticated
**Files:** `src/app/signup/page.tsx`
- **Why:** Returning users who landed on `/signup` with an active session (Michelle's loop — signed in via `/signin` without a `leader_code` in `user_metadata`, no `owners` row) previously sent a second magic link that often got short-circuited by stale links, trapping them in `incomplete-signup` forever.
- **What:** Added a session check on mount. If signed in: prefill email (read-only) + name from `user_metadata.name` if present, swap form copy to "Finish your signup.", swap submit button to "FINISH SIGNUP". On submit: call `supabase.auth.updateUser({ data: { name, leader_code } })` and `router.replace("/")`. The home page's existing `getOrCreateOwner()` then creates the `owners` row from the freshened metadata. No second magic-link round trip.
- **New-user path unchanged** — magic-link flow still runs for sessions with no active user.

### `5e5e3e1` — Show actual leader name in topbar instead of hardcoded Enrique
**Files:** `src/app/page.tsx`
- **Why:** The topbar displayed `"Enrique Carrillo • {owner.name}"` on every non-admin tab regardless of the owner's actual leader. With multiple active leaders (Bernadette, Martin, Jon, Lisa, soon Yvette), Gloria — moved from Enrique to Bernadette via SQL — still saw "Enrique Carrillo" in her app, contradicting the leaderboard.
- **What:** Added `leaderName` state to `page.tsx`. After `getOrCreateOwner()` resolves, query `leader_codes.leader_name` for `owner.leader_code` and store. Updated `headerMeta`:
  - Admin tab: `"Admin • {owner.name}"`
  - Owner under a leader: `"{leaderName} • {owner.name}"`
  - Leader viewing own dashboard (leader_name === owner.name): just `"{owner.name}"` — collapses the redundant doubling
  - Fallback (no leader_name resolved): just `"{owner.name}"`

---

## 🆘 Support tickets handled this session

### Gloria Carrillo — signed up under wrong leader
**Symptom:** Gloria tapped Enrique's invite link instead of Bernadette's by mistake.
**Fix:** Moved her `owners.leader_code` from `ENRIQUE2026` → `BERNADETTE2026`:
```sql
update owners
set leader_code = 'BERNADETTE2026'
where email = 'ghcarr3@gmail.com'
returning name, email, leader_code;
```
**Follow-up:** Gloria reported the topbar still showed "Enrique Carrillo" after the SQL update — that surfaced the hardcoded-leader-name bug, which got fixed in commit `5e5e3e1`. Told Gloria to fully close and reopen the app to pull the fresh JS bundle.

**Going forward:** Same pattern for any "wrong leader" support ticket — one SQL `update` + ask the user to fully reload. No app changes needed.

---

## 🌐 Production infrastructure status

(Unchanged from Session 6.)

- **Live URL:** https://championstracker.org ✅
- **www redirect:** 308 → apex ✅
- **Vercel project:** `champions-tracker` under `ronnie-craigs-projects`
- **DNS in Cloudflare zone `championstracker.org`:** apex CNAME → Vercel, www CNAME → Vercel, Resend MX/TXT/DKIM/DMARC
- **SSL:** Auto Let's Encrypt
- **Email sender:** `Champions Tracker <hello@championstracker.org>` via Resend
- **Supabase Auth URLs:** Site URL `https://championstracker.org`, Redirect URLs include apex + localhost

---

## ⏳ Carry-over for Session 8

### High priority
1. **End-to-end verification of self-heal `/signup` against prod.** Shipped but never manually verified — the code path is small and reuses `getOrCreateOwner`, but worth a real magic-link round trip with a throwaway email to confirm the "FINISH SIGNUP" branch works as expected. Repro steps:
   1. Incognito → https://championstracker.org/signin → throwaway email → magic link
   2. Click link in Gmail → land on home → bounces to `/signup`
   3. Confirm headline says "Finish your signup.", email is prefilled+grayed, button says "FINISH SIGNUP"
   4. Type name + a valid leader code → submit
   5. Should land on Home with `owners` row created. No second email.

2. **End-to-end verification of `/signin` against prod.** Session 6 carry-over — still standing. Confirm magic-link round trip works for an existing user (someone who already has an `owners` row): open `/signin` → email → magic link → land on Home (NOT bounced to `/signup`).

3. **Yvette Gomez signup.** Waiting on her to tap the invite link. When she does, flip her to leader:
   ```sql
   update owners set is_leader = true
   where email = 'mrjuangomez1@gmail.com'
   returning name, email, is_admin, is_leader, leader_code;
   ```
   Note: she + Juan share that email. Whatever name she types at signup becomes her leaderboard label — flagged this to Ronnie when the email landed.

4. **Ysela shared-login activation.** Walk her through: open https://championstracker.org → /signin → type `azteampossibility@gmail.com` → magic link → Add to Home Screen.

### Medium priority
5. **"Consumption Sales" label** wasn't renamed in Session 4's terminology cleanup ("Drinks → Customers"). Real users might find the phrase odd. Consider "In-Club Sales" if anyone gets confused.
6. **10 leftover test users in Supabase Auth.** Cleanup candidate, very low blast radius. Query:
   ```sql
   select id, email, created_at from auth.users
   where id not in (select auth_user_id from owners);
   ```

### Low priority
7. **Co-owner / household support (Option 2 for Ysela or Yvette+Juan).** If anyone wants their *own* login that still rolls up under the household name, that needs a schema change. Not blocking — shared login works fine for now.
8. **Demo deck domain refs** already fixed (Session 5). Just don't ever create `DEMO2026` in `leader_codes` or the deck becomes a live registration funnel.

---

## ✅ Verification cheat sheet (post-restart)

```bash
cd /Users/apple/Projects/champions-tracker
git log --oneline -5                                       # 5e5e3e1 + f242e14 + Session 6 commits
git status                                                  # clean
git rev-list --left-right --count origin/main...HEAD        # 0  0
curl -sI https://championstracker.org/signup | head -3      # → HTTP/2 200
curl -sI https://championstracker.org/signin | head -3      # → HTTP/2 200
```

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
-- Ronnie Craig       | azteampossibility@gmail.com    | true  | true  | RONNIE2026
-- Enrique Carrillo   | thespotnutrition@gmail.com     | true  | true  | ENRIQUE2026
-- Bernadette Carrillo| cocoacleveland@gmail.com       | false | true  | BERNADETTE2026
-- Jon Hood           | jonhoodfit@gmail.com           | false | true  | JON2026
-- Lisa Cassity       | lisacassity@yahoo.com          | false | true  | LISA2026
-- Martin Banda       | martinbanda1994@gmail.com      | false | true  | MARTIN2026
-- (Gloria, Michelle, and anyone else who's a regular owner) | … | false | false | <their leader_code>
-- (Yvette appears once she signs up + you flip her)
```

In browser (after deploy):
- Owner with leader: topbar reads `"{LeaderName} • {OwnerName}"`
- Leader: topbar reads just `"{OwnerName}"` (no doubling)
- Admin tab: `"Admin • {OwnerName}"`

---

## 🚨 Open items / Risks

1. **Self-heal `/signup` is shipped but not manually verified end-to-end** against prod. Top of Session 8's checklist.
2. **`/signin` round trip never manually verified.** Carry-over from Session 6.
3. **Yvette + Juan share an email.** Whatever Yvette types at signup becomes the leaderboard label — flagged this to Ronnie. If she types just "Yvette Gomez" and they later want both names visible, it's another SQL `update owners set name = '…'`.
4. **Cloudflare proxy stays OFF (DNS only)** for apex + www. Required by Vercel.
5. **No nested hierarchy.** Each leader is independent; each owner has exactly one leader via `leader_code`. The Admin tab provides the rollup view.
6. **Git committer identity** still `Apple <apple@Apples-Air.hsd1.tx.comcast.net>` on commits. Cosmetic. Fix with `git config --global user.email azteampossibility@gmail.com && git config --global user.name "Ronnie Craig"` if Ronnie wants attribution cleaned up.

---

## Tagline

*Discipline today. Freedom tomorrow. Legacy forever.*

Onward to Session 8 — verify the magic-link flows end-to-end, finish onboarding Yvette + Ysela, and watch the multi-leader leaderboard fill up as Bernadette starts onboarding her downline.
