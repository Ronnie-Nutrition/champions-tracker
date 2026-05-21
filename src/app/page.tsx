"use client";

import { useState } from "react";

type PageKey = "home" | "log" | "week" | "group" | "admin";
type DailyField = "cons" | "sales" | "newcust" | "deliv" | "social";

const TODAY_LABEL = "Today — Thursday, May 21";
const WEEK_LABEL = "Week of May 19";

export default function HomePage() {
  const [page, setPage] = useState<PageKey>("home");
  const [daily, setDaily] = useState<Record<DailyField, number>>({
    cons: 47,
    sales: 423,
    newcust: 2,
    deliv: 1,
    social: 2,
  });
  const [customerAppreciation, setCustomerAppreciation] = useState<"yes" | "no">(
    "yes"
  );
  const [toast, setToast] = useState<string | null>(null);

  const headerMeta = page === "admin" ? "Admin • Enrique" : "Owner • Enrique";

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
    const label = field === "sales" ? "Total sales ($)" : "Total consumptions";
    const v = window.prompt(`${label} — type exact amount:`, String(daily[field]));
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

  function saveDaily() {
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
  const salesPct = Math.min(100, daily.sales / 10);
  const socialPct = Math.min(100, (daily.social / 3) * 100);

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
        <div className="streak">
          <div className="streak-emoji">🔥</div>
          <div className="streak-num">14</div>
          <div className="streak-label">Day Streak</div>
        </div>

        <div className="date-row">{TODAY_LABEL}</div>

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
              <span className="prog-label">Sales</span>
              <span className="prog-val">
                ${daily.sales}
                <span className="target"> / $1,000</span>
              </span>
            </div>
            <div className="bar">
              <div style={{ width: `${salesPct}%` }} />
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
            <div className="num">312</div>
            <div className="lbl">Drinks</div>
          </div>
          <div>
            <div className="num">$2,847</div>
            <div className="lbl">Sales</div>
          </div>
          <div>
            <div className="num">
              #3
              <span style={{ color: "var(--text-mute)", fontSize: 13 }}>
                /12
              </span>
            </div>
            <div className="lbl">Group Rank</div>
          </div>
        </div>

        <div className="tagline">Discipline today. Freedom tomorrow.</div>
      </div>

      {/* DAILY LOG */}
      <div className={`page ${page === "log" ? "active" : ""}`}>
        <div className="date-row">Logging — Thursday, May 21</div>

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
          label="Sales ($)"
          value={daily.sales}
          valuePrefix="$"
          goalHint="Goal: $1,000"
          editable
          onEdit={() => editField("sales")}
          quickButtons={[
            { delta: -5, label: "−$5", minus: true },
            { delta: 1, label: "+$1" },
            { delta: 5, label: "+$5" },
            { delta: 10, label: "+$10" },
            { delta: 25, label: "+$25" },
          ]}
          onBump={(n) => bump("sales", n)}
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

        <button className="btn-primary" onClick={saveDaily}>
          SAVE TODAY
        </button>
        <button className="btn-secondary" onClick={() => go("home")}>
          Cancel
        </button>
      </div>

      {/* WEEKLY WRAP-UP */}
      <div className={`page ${page === "week" ? "active" : ""}`}>
        <div className="date-row">🏆 Sunday Wrap-Up — {WEEK_LABEL}</div>

        <div className="h-section">Auto-Filled From Your Dailies</div>
        <div className="auto-grid">
          <AutoCell label="Consumptions" value="412" />
          <AutoCell label="Sales" value="$3,890" />
          <AutoCell label="New Customers" value="9" />
          <AutoCell label="Deliveries" value="6" />
          <AutoCell label="Social Posts" value="22" wide />
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
          <label>Sales goal ($)</label>
          <input type="number" placeholder="5000" defaultValue={5000} />
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
        <div className="date-row">The Champions — {WEEK_LABEL}</div>

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
        <div className="date-row">⭐ Admin — {WEEK_LABEL}</div>

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
