"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateOwner, signOut, type Owner } from "@/lib/owner";
import {
  loggingLabel,
  todayLabel,
  todayLocalISO,
  weekLabel,
} from "@/lib/dates";
import {
  computeStreak,
  EMPTY_WEEK,
  formatMoney,
  sumThisWeek,
  type DailyLogRow,
  type WeekSums,
} from "@/lib/aggregate";

type PageKey = "home" | "log" | "week" | "group" | "admin";
type DailyField =
  | "cons"
  | "consSales"
  | "retail"
  | "newcust"
  | "deliv"
  | "social";

type ConnState =
  | { kind: "checking" }
  | { kind: "ok"; codes: number }
  | { kind: "error"; message: string };

type LoadState = "loading" | "ready" | "error";

const ZERO_DAILY: Record<DailyField, number> = {
  cons: 0,
  consSales: 0,
  retail: 0,
  newcust: 0,
  deliv: 0,
  social: 0,
};

const FIELD_LABELS: Record<DailyField, string> = {
  cons: "Total consumptions",
  consSales: "Total consumption sales ($)",
  retail: "Total retail sales ($)",
  newcust: "New customers today",
  deliv: "Deliveries today",
  social: "Social posts today",
};

export default function HomePage() {
  const router = useRouter();
  const [page, setPage] = useState<PageKey>("home");
  const [daily, setDaily] = useState<Record<DailyField, number>>(ZERO_DAILY);
  const [customerAppreciation, setCustomerAppreciation] = useState<"yes" | "no">(
    "yes"
  );
  const [toast, setToast] = useState<string | null>(null);
  const [conn, setConn] = useState<ConnState>({ kind: "checking" });
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [saving, setSaving] = useState(false);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [weekSums, setWeekSums] = useState<WeekSums>(EMPTY_WEEK);
  // Set in useEffect to avoid SSR/hydration date mismatch.
  const [labels, setLabels] = useState({
    today: "Today",
    logging: "Logging",
    week: "This Week",
  });

  useEffect(() => {
    setLabels({
      today: todayLabel(),
      logging: loggingLabel(),
      week: weekLabel(),
    });

    let cancelled = false;
    let loadInFlight = false;

    async function loadOwnerAndToday() {
      if (loadInFlight) return;
      loadInFlight = true;
      try {
        const lookup = await getOrCreateOwner();
        if (cancelled) return;
        if (
          lookup.kind === "no-session" ||
          lookup.kind === "incomplete-signup"
        ) {
          router.replace("/signup");
          return;
        }
        if (lookup.kind === "error") {
          setConn({ kind: "error", message: `owner: ${lookup.message}` });
          setLoadState("error");
          return;
        }
        const me = lookup.owner;
        setOwner(me);
        setConn({ kind: "ok", codes: 0 });

        // Pull the last ~5 weeks of daily_logs in one shot. Today's row
        // populates the form; the full window feeds streak + this-week sums.
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 35);
        const { data: history, error: logErr } = await supabase
          .from("daily_logs")
          .select(
            "log_date, consumptions, consumption_sales, retail_sales, new_customers, deliveries, social_posts"
          )
          .eq("owner_id", me.id)
          .gte("log_date", todayLocalISO(sinceDate))
          .lte("log_date", todayLocalISO())
          .order("log_date", { ascending: false });
        if (cancelled) return;
        if (logErr) {
          setConn({ kind: "error", message: `log: ${logErr.message}` });
          setLoadState("error");
          return;
        }

        const rows = (history ?? []) as DailyLogRow[];
        const todayISO = todayLocalISO();
        const todayRow = rows.find((r) => r.log_date === todayISO);
        if (todayRow) {
          setDaily({
            cons: todayRow.consumptions ?? 0,
            consSales: todayRow.consumption_sales ?? 0,
            retail: todayRow.retail_sales ?? 0,
            newcust: todayRow.new_customers ?? 0,
            deliv: todayRow.deliveries ?? 0,
            social: todayRow.social_posts ?? 0,
          });
        }
        setStreak(computeStreak(rows));
        setWeekSums(sumThisWeek(rows));
        setLoadState("ready");
      } finally {
        loadInFlight = false;
      }
    }

    // onAuthStateChange fires INITIAL_SESSION immediately after subscribe
    // with whatever the current session is (null on a fresh load, populated
    // once a magic-link hash has been parsed). It also fires SIGNED_IN when
    // a magic link lands and is processed asynchronously, so this single
    // listener covers both the cold-load and magic-link-arrival cases.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_OUT") {
        router.replace("/signup");
        return;
      }
      if (!session) {
        // No session yet (INITIAL_SESSION with null). Bounce to signup.
        router.replace("/signup");
        return;
      }
      // We have a session — load owner + today's row.
      loadOwnerAndToday();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  const headerMeta = owner
    ? `${page === "admin" ? "Admin" : "Owner"} • ${owner.name}`
    : "…";

  async function handleSignOut() {
    await signOut();
    router.replace("/signup");
  }

  function go(p: PageKey) {
    setPage(p);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }

  function haptic() {
    if (typeof navigator !== "undefined" && navigator.vibrate)
      navigator.vibrate(8);
  }

  function bump(field: DailyField, n: number) {
    setDaily((prev) => ({ ...prev, [field]: Math.max(0, prev[field] + n) }));
    haptic();
  }

  function editField(field: DailyField) {
    const v = window.prompt(
      `${FIELD_LABELS[field]} — type exact amount:`,
      String(daily[field])
    );
    if (v === null) return;
    const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
    if (!Number.isNaN(n) && n >= 0) {
      setDaily((prev) => ({ ...prev, [field]: n }));
      haptic();
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }

  async function refreshStats(forOwner: Owner) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 35);
    const { data: history, error } = await supabase
      .from("daily_logs")
      .select(
        "log_date, consumptions, consumption_sales, retail_sales, new_customers, deliveries, social_posts"
      )
      .eq("owner_id", forOwner.id)
      .gte("log_date", todayLocalISO(sinceDate))
      .lte("log_date", todayLocalISO())
      .order("log_date", { ascending: false });
    if (error) return;
    const rows = (history ?? []) as DailyLogRow[];
    setStreak(computeStreak(rows));
    setWeekSums(sumThisWeek(rows));
  }

  async function saveDaily() {
    if (saving || loadState !== "ready" || !owner) return;
    setSaving(true);
    const { error } = await supabase.from("daily_logs").upsert(
      {
        owner_id: owner.id,
        log_date: todayLocalISO(),
        consumptions: daily.cons,
        consumption_sales: daily.consSales,
        retail_sales: daily.retail,
        new_customers: daily.newcust,
        deliveries: daily.deliv,
        social_posts: daily.social,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id,log_date" }
    );
    setSaving(false);
    if (error) {
      showToast(`❌ ${error.message}`);
      return;
    }
    // Re-fetch so streak + this-week sums reflect today's save before
    // we navigate back to home.
    await refreshStats(owner);
    showToast("🔥 Saved — streak alive!");
    window.setTimeout(() => go("home"), 600);
  }

  function submitWeek() {
    showToast("🏆 Week locked in. See you Monday.");
    fireConfetti();
    window.setTimeout(() => go("home"), 1400);
  }

  function fireConfetti() {
    const c = document.createElement("div");
    c.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:150;";
    for (let i = 0; i < 40; i++) {
      const dot = document.createElement("div");
      const colors = ["#d4ff3f", "#4ade80", "#fbbf24", "#fff"];
      dot.style.cssText = `
        position:absolute; top:40%; left:50%;
        width:8px; height:8px; border-radius:2px;
        background:${colors[i % 4]};
        transform:translate(-50%,-50%);
        transition: all 1.2s cubic-bezier(.3,.6,.4,1);
      `;
      c.appendChild(dot);
      requestAnimationFrame(() => {
        const angle = (Math.PI * 2 * i) / 40;
        const dist = 150 + Math.random() * 100;
        dot.style.transform = `translate(${Math.cos(angle) * dist - 4}px, ${
          Math.sin(angle) * dist - 4 + 200
        }px) rotate(${Math.random() * 360}deg)`;
        dot.style.opacity = "0";
      });
    }
    document.body.appendChild(c);
    window.setTimeout(() => c.remove(), 1400);
  }

  const consPct = Math.min(100, daily.cons);
  const consSalesPct = Math.min(100, daily.consSales / 10);
  const socialPct = Math.min(100, (daily.social / 3) * 100);

  // Don't render the broken half-loaded home screen while we're still
  // checking auth + fetching the owner. The auth effect will either flip
  // loadState to "ready" or redirect to /signup.
  if (loadState === "loading" || !owner) {
    return (
      <div className="phone">
        <div className="topbar">
          <div className="logo">
            THE <span>CHAMPIONS</span>
          </div>
          <div className="topbar-meta">…</div>
        </div>
        <div
          className="page active"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            color: "var(--text-dim)",
            fontSize: 13,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {conn.kind === "error" ? (
            <>
              <div style={{ color: "var(--danger)", marginBottom: 12 }}>
                ❌ {conn.message}
              </div>
              <button
                className="btn-secondary"
                onClick={() => router.replace("/signup")}
              >
                Go to sign in
              </button>
            </>
          ) : (
            <>Loading your data…</>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="phone">
      <div className="topbar">
        <div className="logo">
          THE <span>CHAMPIONS</span>
        </div>
        <div className="topbar-meta">{headerMeta}</div>
      </div>

      {/* HOME */}
      <div className={`page ${page === "home" ? "active" : ""}`}>
        {conn.kind === "error" && <ConnStatus state={conn} />}
        <div className="streak">
          <div className="streak-emoji">🔥</div>
          <div className="streak-num">{streak}</div>
          <div className="streak-label">Day Streak</div>
        </div>

        <div className="date-row">{labels.today}</div>

        <div className="card">
          <div className="prog-row">
            <div className="prog-head">
              <span className="prog-label">Consumptions</span>
              <span className="prog-val">
                {daily.cons}
                <span className="target"> / 100</span>
              </span>
            </div>
            <div className="bar">
              <div style={{ width: `${consPct}%` }} />
            </div>
          </div>
          <div className="prog-row">
            <div className="prog-head">
              <span className="prog-label">Consumption Sales</span>
              <span className="prog-val">
                ${daily.consSales}
                <span className="target"> / $1,000</span>
              </span>
            </div>
            <div className="bar">
              <div style={{ width: `${consSalesPct}%` }} />
            </div>
          </div>
          <div className="prog-row">
            <div className="prog-head">
              <span className="prog-label">Retail Sales</span>
              <span className="prog-val">${daily.retail}</span>
            </div>
          </div>
          <div className="prog-row">
            <div className="prog-head">
              <span className="prog-label">Social Posts</span>
              <span className="prog-val">
                {daily.social}
                <span className="target"> / 3</span>
              </span>
            </div>
            <div className="bar green">
              <div style={{ width: `${socialPct}%` }} />
            </div>
          </div>
        </div>

        <button className="btn-primary" onClick={() => go("log")}>
          LOG / EDIT TODAY
        </button>

        <div className="h-section">This Week So Far</div>
        <div className="week-snap">
          <div>
            <div className="num">{weekSums.consumptions}</div>
            <div className="lbl">Drinks</div>
          </div>
          <div>
            <div className="num">
              {formatMoney(weekSums.consumption_sales + weekSums.retail_sales)}
            </div>
            <div className="lbl">Sales</div>
          </div>
          <div>
            <div className="num">
              —
              <span style={{ color: "var(--text-mute)", fontSize: 13 }}>
                {" "}
                soon
              </span>
            </div>
            <div className="lbl">Group Rank</div>
          </div>
        </div>

        <div className="tagline">Discipline today. Freedom tomorrow.</div>
      </div>

      {/* DAILY LOG */}
      <div className={`page ${page === "log" ? "active" : ""}`}>
        <div className="date-row">{labels.logging}</div>

        <NumField
          icon="🥤"
          label="Consumptions"
          value={daily.cons}
          goalHint="Goal: 100"
          editable
          onEdit={() => editField("cons")}
          quickButtons={[
            { delta: -1, label: "−1", minus: true },
            { delta: 1, label: "+1" },
            { delta: 5, label: "+5" },
            { delta: 10, label: "+10" },
          ]}
          onBump={(n) => bump("cons", n)}
          subLabel="— tap number to type exact count"
        />

        <NumField
          icon="💵"
          label="Consumption Sales ($)"
          value={daily.consSales}
          valuePrefix="$"
          goalHint="Goal: $1,000"
          editable
          onEdit={() => editField("consSales")}
          quickButtons={[
            { delta: -5, label: "−$5", minus: true },
            { delta: 1, label: "+$1" },
            { delta: 5, label: "+$5" },
            { delta: 10, label: "+$10" },
            { delta: 25, label: "+$25" },
          ]}
          onBump={(n) => bump("consSales", n)}
          subLabel="— tap number to type exact amount"
        />

        <NumField
          icon="📦"
          label="Retail Sales ($)"
          value={daily.retail}
          valuePrefix="$"
          goalHint="Containers / programs"
          editable
          onEdit={() => editField("retail")}
          quickButtons={[
            { delta: -5, label: "−$5", minus: true },
            { delta: 1, label: "+$1" },
            { delta: 5, label: "+$5" },
            { delta: 25, label: "+$25" },
            { delta: 100, label: "+$100" },
          ]}
          onBump={(n) => bump("retail", n)}
          subLabel="— tap number to type exact amount"
        />

        <NumField
          icon="🙋"
          label="New Customers"
          value={daily.newcust}
          goalHint="Today"
          quickButtons={[
            { delta: -1, label: "−1", minus: true },
            { delta: 1, label: "+1" },
          ]}
          onBump={(n) => bump("newcust", n)}
        />

        <NumField
          icon="🚚"
          label="Deliveries / Tea Drops"
          value={daily.deliv}
          goalHint="Today"
          quickButtons={[
            { delta: -1, label: "−1", minus: true },
            { delta: 1, label: "+1" },
          ]}
          onBump={(n) => bump("deliv", n)}
        />

        <NumField
          icon="📱"
          label="Social Posts"
          value={daily.social}
          goalHint="Min: 3"
          quickButtons={[
            { delta: -1, label: "−1", minus: true },
            { delta: 1, label: "+1" },
          ]}
          onBump={(n) => bump("social", n)}
        />

        <button
          className="btn-primary"
          onClick={saveDaily}
          disabled={saving || loadState !== "ready"}
        >
          {saving ? "SAVING…" : "SAVE TODAY"}
        </button>
        <button className="btn-secondary" onClick={() => go("home")}>
          Cancel
        </button>
      </div>

      {/* WEEKLY WRAP-UP */}
      <div className={`page ${page === "week" ? "active" : ""}`}>
        <div className="date-row">🏆 Sunday Wrap-Up — {labels.week}</div>

        <div className="h-section">Auto-Filled From Your Dailies</div>
        <div className="auto-grid">
          <AutoCell label="Consumptions" value={String(weekSums.consumptions)} />
          <AutoCell
            label="Consumption Sales"
            value={formatMoney(weekSums.consumption_sales)}
          />
          <AutoCell
            label="Retail Sales"
            value={formatMoney(weekSums.retail_sales)}
          />
          <AutoCell
            label="New Customers"
            value={String(weekSums.new_customers)}
          />
          <AutoCell
            label="Deliveries"
            value={String(weekSums.deliveries)}
          />
          <AutoCell
            label="Social Posts"
            value={String(weekSums.social_posts)}
            wide
          />
        </div>

        <div className="h-section">Fill In The Rest</div>

        <div className="input-row">
          <label>Pop-ups this week</label>
          <input type="number" placeholder="0" defaultValue={1} />
        </div>
        <div className="input-row">
          <label>Events held</label>
          <input type="number" placeholder="0" defaultValue={0} />
        </div>
        <div className="input-row">
          <label>Customer Appreciation Day?</label>
          <div className="toggle-row">
            <button
              className={`toggle-btn ${customerAppreciation === "no" ? "active" : ""}`}
              onClick={() => setCustomerAppreciation("no")}
            >
              No
            </button>
            <button
              className={`toggle-btn ${customerAppreciation === "yes" ? "active" : ""}`}
              onClick={() => setCustomerAppreciation("yes")}
            >
              Yes
            </button>
          </div>
        </div>
        <div className="input-row">
          <label>🏆 Biggest win of the week</label>
          <textarea
            placeholder="What went right this week?"
            defaultValue="Hit 100 drinks on Saturday for the first time ever 🔥"
          />
        </div>
        <div className="input-row">
          <label>💡 Biggest lesson learned</label>
          <textarea placeholder="What did you learn?" />
        </div>

        <div className="h-section">🎯 Goals For Next Week</div>
        <div className="input-row">
          <label>Consumptions goal</label>
          <input type="number" placeholder="500" defaultValue={500} />
        </div>
        <div className="input-row">
          <label>Consumption sales goal ($)</label>
          <input type="number" placeholder="5000" defaultValue={5000} />
        </div>
        <div className="input-row">
          <label>Retail sales goal ($)</label>
          <input type="number" placeholder="1000" defaultValue={1000} />
        </div>
        <div className="input-row">
          <label>New customers goal</label>
          <input type="number" placeholder="12" defaultValue={12} />
        </div>

        <button className="btn-primary" onClick={submitWeek}>
          SUBMIT WEEK
        </button>
      </div>

      {/* GROUP / LEADERBOARD */}
      <div className={`page ${page === "group" ? "active" : ""}`}>
        <div className="date-row">The Champions — {labels.week}</div>

        <div className="card">
          <div className="h-section" style={{ margin: "0 0 12px" }}>
            Group Pulse
          </div>
          <PulseRow label="Consumptions" value="4,287" delta="↑ 12% vs last week" />
          <PulseRow label="Sales" value="$38,920" delta="↑ 8%" />
          <PulseRow label="New Customers" value="68" delta="↑ 3%" />
          <PulseRow label="Active Owners (7/7 logged)" value="9 / 12" />
        </div>

        <div className="h-section">Leaderboard — This Week</div>
        <div className="card">
          <div
            className="lb-row"
            style={{
              fontSize: 10,
              color: "var(--text-mute)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            <div>#</div>
            <div>Owner</div>
            <div className="stat">Drinks</div>
            <div className="stat">Sales</div>
            <div className="streak-mini">🔥</div>
          </div>
          <LBRow rank={1} name="Maria L." code="Maria's Code" drinks="624" sales="$6.2k" streak="28d" />
          <LBRow rank={2} name="Carlos R." code="Ronnie's Code" drinks="487" sales="$4.8k" streak="21d" />
          <LBRow rank={3} name="You" code="Ronnie's Code" drinks="412" sales="$3.9k" streak="14d" you />
          <LBRow rank={4} name="Diana V." code="Maria's Code" drinks="398" sales="$3.6k" streak="12d" />
          <LBRow rank={5} name="Sam T." code="John's Code" drinks="356" sales="$3.4k" streak="9d" />
          <LBRow rank={6} name="Patty G." code="Ronnie's Code" drinks="312" sales="$2.9k" streak="7d" />
          <LBRow rank={7} name="Eddie M." code="John's Code" drinks="298" sales="$2.7k" streak="5d" />
          <LBRow rank={8} name="Lisa K." code="Sara's Code" drinks="241" sales="$2.2k" streak="3d" />
        </div>
      </div>

      {/* ADMIN */}
      <div className={`page ${page === "admin" ? "active" : ""}`}>
        <div className="date-row">⭐ Admin — {labels.week}</div>

        <div className="card">
          <div className="h-section" style={{ margin: "0 0 12px" }}>
            Where The Team Is Going
          </div>
          <PulseRow label="Consumptions" value="4,287" delta="↑ 12%" />
          <PulseRow label="Sales" value="$38,920" delta="↑ 8%" />
          <PulseRow label="New Customers" value="68" delta="↑ 3%" />
          <PulseRow label="Avg Streak" value="12.4d" delta="↑ 1.8d" />
          <PulseRow label="Owners Logging Daily" value="9 / 12" delta="↓ 1" deltaDown />
        </div>

        <button className="btn-secondary" onClick={() => go("group")}>
          View Full Leaderboard →
        </button>
        <button className="btn-secondary" onClick={() => showToast("CSV exported (mock)")}>
          ⬇ Export Week as CSV
        </button>

        <div className="h-section">By Leader Code</div>
        <div className="card">
          <PulseRow label={<>RONNIE2026 <span style={{ color: "var(--text-mute)" }}>(3 owners)</span></>} value="1,211" />
          <PulseRow label={<>MARIA2026 <span style={{ color: "var(--text-mute)" }}>(2 owners)</span></>} value="1,022" />
          <PulseRow label={<>JOHN2026 <span style={{ color: "var(--text-mute)" }}>(3 owners)</span></>} value="954" />
          <PulseRow label={<>SARA2026 <span style={{ color: "var(--text-mute)" }}>(2 owners)</span></>} value="641" />
          <PulseRow label={<>MIKE2026 <span style={{ color: "var(--text-mute)" }}>(2 owners)</span></>} value="459" />
        </div>

        <div className="h-section">🚨 Needs Attention</div>
        <div className="card">
          <div className="pulse-row">
            <div className="pulse-label">Eddie M. — broke streak yesterday</div>
          </div>
          <div className="pulse-row">
            <div className="pulse-label">Lisa K. — 3-day average dropping</div>
          </div>
          <div className="pulse-row">
            <div className="pulse-label">2 owners didn&apos;t submit wrap-up</div>
          </div>
        </div>

        <div className="h-section">Account</div>
        <button className="btn-secondary" onClick={handleSignOut}>
          Sign out
        </button>

        <div className="tagline">2,000+ clubs and beyond.</div>
      </div>

      {/* Bottom Nav */}
      <div className="navbar">
        <NavButton page="home" current={page} onSelect={go} icon="🏠" label="Home" />
        <NavButton page="log" current={page} onSelect={go} icon="➕" label="Log" />
        <NavButton page="week" current={page} onSelect={go} icon="🏆" label="Week" />
        <NavButton page="group" current={page} onSelect={go} icon="📊" label="Group" />
        <NavButton page="admin" current={page} onSelect={go} icon="⭐" label="Admin" />
      </div>

      {toast && <div className="toast show">{toast}</div>}
    </div>
  );
}

// ---------- Sub-components ----------

type QuickBtn = { delta: number; label: string; minus?: boolean };

function NumField({
  icon,
  label,
  value,
  valuePrefix,
  goalHint,
  editable,
  onEdit,
  quickButtons,
  onBump,
  subLabel,
}: {
  icon: string;
  label: string;
  value: number;
  valuePrefix?: string;
  goalHint: string;
  editable?: boolean;
  onEdit?: () => void;
  quickButtons: QuickBtn[];
  onBump: (n: number) => void;
  subLabel?: string;
}) {
  return (
    <div className="num-field">
      <div className="label">
        {icon} {label}
        {subLabel && (
          <span
            style={{
              color: "var(--text-mute)",
              fontWeight: "normal",
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            {" "}
            {subLabel}
          </span>
        )}
      </div>
      <div className="num-display">
        <span
          className={`big ${editable ? "editable" : ""}`}
          onClick={editable ? onEdit : undefined}
        >
          {valuePrefix}
          {value}
        </span>
        <span className="hint">{goalHint}</span>
      </div>
      <div className="quick-btns">
        {quickButtons.map((b) => (
          <button
            key={b.label}
            className={`quick-btn ${b.minus ? "minus" : ""}`}
            onClick={() => onBump(b.delta)}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AutoCell({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className="auto-cell"
      style={wide ? { gridColumn: "span 2" } : undefined}
    >
      <div className="lbl">{label}</div>
      <div className="val">{value}</div>
    </div>
  );
}

function PulseRow({
  label,
  value,
  delta,
  deltaDown,
}: {
  label: React.ReactNode;
  value: string;
  delta?: string;
  deltaDown?: boolean;
}) {
  return (
    <div className="pulse-row">
      <div className="pulse-label">{label}</div>
      <div className="pulse-stat">
        <div className="pulse-num">{value}</div>
        {delta && (
          <div className={`pulse-delta ${deltaDown ? "down" : "up"}`}>
            {delta}
          </div>
        )}
      </div>
    </div>
  );
}

function LBRow({
  rank,
  name,
  code,
  drinks,
  sales,
  streak,
  you,
}: {
  rank: number;
  name: string;
  code: string;
  drinks: string;
  sales: string;
  streak: string;
  you?: boolean;
}) {
  return (
    <div className={`lb-row ${you ? "you" : ""}`}>
      <div className="rank">{rank}</div>
      <div className="name">
        {name}
        <span className="sub">{code}</span>
      </div>
      <div className="stat">{drinks}</div>
      <div className="stat">{sales}</div>
      <div className="streak-mini">{streak}</div>
    </div>
  );
}

function ConnStatus({ state }: { state: ConnState }) {
  const baseStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    padding: "8px 12px",
    borderRadius: 8,
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    border: "1px solid",
  };
  if (state.kind === "checking") {
    return (
      <div
        style={{
          ...baseStyle,
          background: "rgba(156,163,175,0.1)",
          color: "var(--text-dim)",
          borderColor: "var(--border)",
        }}
      >
        ⏳ Checking Supabase…
      </div>
    );
  }
  if (state.kind === "ok") {
    return (
      <div
        style={{
          ...baseStyle,
          background: "rgba(74,222,128,0.1)",
          color: "var(--success)",
          borderColor: "var(--success)",
        }}
      >
        ✅ Supabase connected · {state.codes} leader code
        {state.codes === 1 ? "" : "s"}
      </div>
    );
  }
  return (
    <div
      style={{
        ...baseStyle,
        background: "rgba(248,113,113,0.1)",
        color: "var(--danger)",
        borderColor: "var(--danger)",
        fontSize: 10,
      }}
    >
      ❌ Supabase error: {state.message}
    </div>
  );
}

function NavButton({
  page,
  current,
  onSelect,
  icon,
  label,
}: {
  page: PageKey;
  current: PageKey;
  onSelect: (p: PageKey) => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      className={`nav-btn ${current === page ? "active" : ""}`}
      onClick={() => onSelect(page)}
    >
      <div className="ico">{icon}</div>
      {label}
    </button>
  );
}
