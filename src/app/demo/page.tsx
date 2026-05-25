"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

// Self-contained walkthrough for live demos. Renders its own UI mocks —
// does NOT touch Supabase or the real auth session. Safe to show to a
// room while the live app keeps running in another tab.

type SlideRenderer = (ctx: { go: (i: number) => void }) => ReactNode;
type Slide = {
  kind: "cover" | "split" | "fullphone" | "closer";
  eyebrow?: string;
  headline: string;
  body?: ReactNode;
  visual?: SlideRenderer;
};

const kbd: React.CSSProperties = {
  background: "#1a201b",
  border: "1px solid #2d3530",
  padding: "2px 8px",
  borderRadius: 4,
  fontFamily: "monospace",
  margin: "0 3px",
};

const p: React.CSSProperties = {
  fontSize: 16,
  color: "#d1d5db",
  lineHeight: 1.6,
  margin: "0 0 14px",
};

const linkBox: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  background: "#0a0d0a",
  border: "1px solid #2d3530",
  padding: "14px 16px",
  borderRadius: 8,
  fontSize: 14,
  color: "#d4ff3f",
  wordBreak: "break-all",
  margin: "14px 0",
};

const listStyle: React.CSSProperties = {
  margin: "0 0 14px",
  paddingLeft: 22,
  color: "#d1d5db",
  fontSize: 15,
  lineHeight: 1.8,
};

const SLIDES: Slide[] = [
  {
    kind: "cover",
    headline: "THE CHAMPIONS",
    body: (
      <>
        <div style={{ fontSize: 18, color: "#d4ff3f", fontWeight: 800, letterSpacing: 3, marginTop: 4 }}>
          TRACKER
        </div>
        <div style={{ marginTop: 28, fontSize: 16, color: "#9ca3af", maxWidth: 480, lineHeight: 1.55 }}>
          Daily accountability for nutrition club owners and the leaders who coach them.
        </div>
        <div style={{ marginTop: 36, fontSize: 11, color: "#6b7280", letterSpacing: 2, textTransform: "uppercase" }}>
          Press <kbd style={kbd}>→</kbd> or click anywhere to start
        </div>
      </>
    ),
  },
  {
    kind: "split",
    eyebrow: "The problem",
    headline: "Coaches don't know who's logging.",
    body: (
      <>
        <p style={p}>Owners drift. They stop posting their numbers in the group chat.</p>
        <p style={p}>Sunday rolls around and nobody knows the real score — drinks made, sales done, who's still on a streak.</p>
        <p style={{ ...p, color: "#d4ff3f", fontWeight: 700 }}>
          We built one app where the team logs daily, the leader sees it live, and the streak holds them.
        </p>
      </>
    ),
    visual: () => <PhoneMock screen="home" />,
  },
  {
    kind: "split",
    eyebrow: "How it works",
    headline: "Three roles. One app.",
    body: (
      <div style={{ display: "grid", gap: 14, marginTop: 10 }}>
        <RoleCard tag="⭐ ADMIN" name="Enrique" who="Sees every leader's group. Coaches the coaches." />
        <RoleCard tag="🎯 LEADER" name="You — the coach" who="Sees your downline of nutrition club owners. Sends the invite link." />
        <RoleCard tag="🔥 OWNER" name="Each club owner" who="Logs drinks, sales, customers daily. Builds the streak." />
      </div>
    ),
  },
  {
    kind: "split",
    eyebrow: "Onboarding · Step 1 of 5",
    headline: "Your unique invite link.",
    body: (
      <>
        <p style={p}>Every leader gets a personal code — yours is <strong style={{ color: "#d4ff3f" }}>DEMO2026</strong>.</p>
        <p style={p}>The shareable link bakes the code in, so the new owner doesn't have to type anything:</p>
        <div style={linkBox}>https://thechampions.club/signup?code=DEMO2026</div>
        <p style={{ ...p, color: "#9ca3af", fontSize: 14 }}>
          Send it in iMessage, in your Herbalife group chat, in your Instagram bio. Anywhere.
        </p>
      </>
    ),
    visual: () => <ShareCard />,
  },
  {
    kind: "split",
    eyebrow: "Onboarding · Step 2 of 5",
    headline: "They tap the link. Code pre-fills.",
    body: (
      <>
        <p style={p}>The signup screen opens with their leader code already locked in.</p>
        <p style={p}>They type their name + email and tap <strong style={{ color: "#d4ff3f" }}>SEND MAGIC LINK</strong>.</p>
        <p style={{ ...p, color: "#9ca3af", fontSize: 14 }}>No password. No app store. Just a web link.</p>
      </>
    ),
    visual: () => <PhoneMock screen="signup" />,
  },
  {
    kind: "split",
    eyebrow: "Onboarding · Step 3 of 5",
    headline: "Magic link arrives in 10 seconds.",
    body: (
      <>
        <p style={p}>One tap on the email button → they're signed in. Done.</p>
        <p style={{ ...p, color: "#9ca3af", fontSize: 14 }}>
          No passwords to forget. No download. Works on any phone.
        </p>
      </>
    ),
    visual: () => <EmailMock />,
  },
  {
    kind: "split",
    eyebrow: "Onboarding · Step 4 of 5",
    headline: "They land signed in. Day 0 ready.",
    body: (
      <>
        <p style={p}>Empty home screen, streak counter at zero, ready to log their first day.</p>
        <p style={{ ...p, color: "#d4ff3f", fontWeight: 700 }}>
          From your text → them being in the app: under 60 seconds.
        </p>
      </>
    ),
    visual: () => <PhoneMock screen="home-empty" />,
  },
  {
    kind: "split",
    eyebrow: "Onboarding · Step 5 of 5",
    headline: "You see them in your group.",
    body: (
      <>
        <p style={p}>The moment they sign up, they appear in your group leaderboard.</p>
        <p style={p}>No emails to forward. No spreadsheet to update.</p>
        <p style={{ ...p, color: "#9ca3af", fontSize: 14 }}>
          Now you can coach them on real numbers — drinks, sales, streak — without asking.
        </p>
      </>
    ),
    visual: () => <PhoneMock screen="group" />,
  },
  {
    kind: "split",
    eyebrow: "The daily habit",
    headline: "30 seconds. Six numbers.",
    body: (
      <>
        <p style={p}>Tap the bump buttons or type the exact amount. Done.</p>
        <ul style={listStyle}>
          <li>Customers</li>
          <li>Consumption sales ($)</li>
          <li>Retail sales ($)</li>
          <li>New customers</li>
          <li>Deliveries / tea drops</li>
          <li>Social posts</li>
        </ul>
        <p style={{ ...p, color: "#9ca3af", fontSize: 14 }}>
          Hit SAVE — streak ticks up, week stats update, leaderboard moves.
        </p>
      </>
    ),
    visual: () => <PhoneMock screen="log" />,
  },
  {
    kind: "split",
    eyebrow: "The motivation engine",
    headline: "The streak holds them.",
    body: (
      <>
        <p style={p}>One number on the home screen that everybody fights to protect.</p>
        <p style={p}>Miss a day → it resets. Hit a day → it climbs. Simple, brutal, effective.</p>
        <p style={{ ...p, color: "#d4ff3f", fontWeight: 700 }}>
          Owners log daily because they don't want to be the one who broke it.
        </p>
      </>
    ),
    visual: () => <PhoneMock screen="streak" />,
  },
  {
    kind: "split",
    eyebrow: "Sunday wrap-up",
    headline: "Reflection, not data entry.",
    body: (
      <>
        <p style={p}>Daily logs auto-roll into the weekly view. No re-typing numbers.</p>
        <p style={p}>Owners just answer the questions that matter:</p>
        <ul style={listStyle}>
          <li>🏆 Biggest win this week</li>
          <li>💡 Biggest lesson learned</li>
          <li>🎯 Goals for next week</li>
        </ul>
      </>
    ),
    visual: () => <PhoneMock screen="week" />,
  },
  {
    kind: "split",
    eyebrow: "The leader view",
    headline: "Group leaderboard — friendly pressure.",
    body: (
      <>
        <p style={p}>Your downline ranked live, every week. Customers, sales, streak.</p>
        <p style={{ ...p, color: "#9ca3af", fontSize: 14 }}>
          You don't have to chase anybody. The ranking does the coaching.
        </p>
      </>
    ),
    visual: () => <PhoneMock screen="group" />,
  },
  {
    kind: "split",
    eyebrow: "The admin view",
    headline: "Enrique sees everything.",
    body: (
      <>
        <p style={p}>Group pulse across every leader. By-leader-code rollups. &ldquo;Needs attention&rdquo; alerts when someone's slipping.</p>
        <p style={{ ...p, color: "#9ca3af", fontSize: 14 }}>
          The admin coaches the coaches without ever asking for a status update.
        </p>
      </>
    ),
    visual: () => <PhoneMock screen="admin" />,
  },
  {
    kind: "closer",
    eyebrow: "What's next",
    headline: "Want in?",
    body: (
      <>
        <p style={{ ...p, fontSize: 18, color: "#f3f4f6" }}>
          If you lead a team of club owners and want them logging daily by next Monday — let's talk.
        </p>
        <div style={{ marginTop: 28, display: "flex", gap: 14, flexWrap: "wrap" }}>
          <CtaBox label="Book a 15-min walkthrough" detail="tidycal.com/ronnieysela/ai-strategy-call" />
          <CtaBox label="Text Ronnie direct" detail="520-560-5447" />
        </div>
        <div style={{ marginTop: 36, fontSize: 11, color: "#6b7280", letterSpacing: 2, textTransform: "uppercase" }}>
          Discipline today · Freedom tomorrow · Legacy forever
        </div>
      </>
    ),
  },
];

export default function DemoPage() {
  const [i, setI] = useState(0);
  const total = SLIDES.length;

  const next = useCallback(() => setI((x) => Math.min(total - 1, x + 1)), [total]);
  const prev = useCallback(() => setI((x) => Math.max(0, x - 1)), []);
  const go = useCallback((n: number) => setI(Math.max(0, Math.min(total - 1, n))), [total]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      } else if (e.key === "Home") {
        e.preventDefault();
        go(0);
      } else if (e.key === "End") {
        e.preventDefault();
        go(total - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, go, total]);

  const slide = SLIDES[i];

  return (
    <div
      onClick={(e) => {
        // Don't advance when clicking interactive children
        const target = e.target as HTMLElement;
        if (target.closest("button, a, kbd, .demo-no-advance")) return;
        next();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(180deg, #000 0%, #0a0d0a 100%)",
        color: "#f3f4f6",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
        cursor: "pointer",
        overflow: "hidden",
      }}
    >
      {/* Brand bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "18px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #2d3530",
          zIndex: 5,
        }}
      >
        <div style={{ fontWeight: 900, letterSpacing: 1.5, fontSize: 13 }}>
          <span style={{ color: "#d4ff3f" }}>THE</span>{" "}
          <span style={{ color: "#f3f4f6" }}>CHAMPIONS</span>
          <span style={{ color: "#6b7280", fontWeight: 600, marginLeft: 8 }}>· demo</span>
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af", letterSpacing: 1 }}>
          {String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>
      </div>

      {/* Slide */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          paddingTop: 70,
          paddingBottom: 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {slide.kind === "cover" || slide.kind === "closer" ? (
          <CenterSlide slide={slide} go={go} />
        ) : slide.kind === "fullphone" ? (
          <FullPhoneSlide slide={slide} go={go} />
        ) : (
          <SplitSlide slide={slide} go={go} />
        )}
      </div>

      {/* Footer nav */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "14px 28px calc(14px + env(safe-area-inset-bottom))",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(15,20,16,0.92)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid #2d3530",
          gap: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={prev} disabled={i === 0} style={navBtnStyle(i === 0)}>
          ← Back
        </button>
        <DotRow total={total} active={i} onPick={go} />
        <button onClick={next} disabled={i === total - 1} style={navBtnStyle(i === total - 1, true)}>
          Next →
        </button>
      </div>
    </div>
  );
}

function navBtnStyle(disabled: boolean, primary = false): React.CSSProperties {
  return {
    background: primary ? "#d4ff3f" : "transparent",
    color: primary ? "#000" : "#f3f4f6",
    border: primary ? "none" : "1px solid #2d3530",
    padding: "10px 18px",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    minWidth: 100,
  };
}

function DotRow({ total, active, onPick }: { total: number; active: number; onPick: (i: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", flex: 1 }}>
      {Array.from({ length: total }).map((_, idx) => (
        <button
          key={idx}
          onClick={() => onPick(idx)}
          aria-label={`Go to slide ${idx + 1}`}
          style={{
            width: idx === active ? 22 : 8,
            height: 8,
            borderRadius: 4,
            border: "none",
            background: idx === active ? "#d4ff3f" : "#374151",
            cursor: "pointer",
            transition: "all 0.2s ease",
            padding: 0,
          }}
        />
      ))}
    </div>
  );
}

function CenterSlide({ slide }: { slide: Slide; go: (i: number) => void }) {
  return (
    <div
      style={{
        maxWidth: 720,
        padding: "0 28px",
        textAlign: "center",
      }}
    >
      {slide.eyebrow && <Eyebrow text={slide.eyebrow} />}
      <h1
        style={{
          fontSize: "clamp(40px, 7vw, 84px)",
          fontWeight: 900,
          letterSpacing: -1,
          margin: 0,
          lineHeight: 1.05,
          background: "linear-gradient(180deg, #f3f4f6, #9ca3af)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {slide.headline}
      </h1>
      <div className="demo-no-advance">{slide.body}</div>
    </div>
  );
}

function SplitSlide({ slide }: { slide: Slide; go: (i: number) => void }) {
  return (
    <div
      style={{
        maxWidth: 1180,
        width: "100%",
        padding: "0 32px",
        display: "grid",
        gridTemplateColumns: slide.visual ? "minmax(0, 1.15fr) minmax(0, 0.85fr)" : "minmax(0, 1fr)",
        gap: 48,
        alignItems: "center",
      }}
    >
      <div style={{ minWidth: 0 }}>
        {slide.eyebrow && <Eyebrow text={slide.eyebrow} />}
        <h1
          style={{
            fontSize: "clamp(28px, 4.4vw, 52px)",
            fontWeight: 900,
            letterSpacing: -0.5,
            margin: "0 0 22px",
            lineHeight: 1.1,
            color: "#f3f4f6",
          }}
        >
          {slide.headline}
        </h1>
        <div className="demo-no-advance">{slide.body}</div>
      </div>
      {slide.visual && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          {slide.visual({ go: () => {} })}
        </div>
      )}
    </div>
  );
}

function FullPhoneSlide({ slide }: { slide: Slide; go: (i: number) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      {slide.eyebrow && <Eyebrow text={slide.eyebrow} />}
      <h1 style={{ fontSize: 36, margin: 0, color: "#f3f4f6", fontWeight: 900 }}>{slide.headline}</h1>
      {slide.visual && slide.visual({ go: () => {} })}
    </div>
  );
}

function Eyebrow({ text }: { text: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: "#d4ff3f",
        letterSpacing: 2.5,
        textTransform: "uppercase",
        fontWeight: 800,
        marginBottom: 14,
      }}
    >
      {text}
    </div>
  );
}

function RoleCard({ tag, name, who }: { tag: string; name: string; who: string }) {
  return (
    <div
      style={{
        background: "#1a201b",
        border: "1px solid #2d3530",
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div style={{ fontSize: 11, color: "#d4ff3f", letterSpacing: 1.5, fontWeight: 800, marginBottom: 4 }}>{tag}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: "#f3f4f6", marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.45 }}>{who}</div>
    </div>
  );
}

function CtaBox({ label, detail }: { label: string; detail: string }) {
  return (
    <div
      style={{
        background: "#1a201b",
        border: "1px solid #d4ff3f",
        borderRadius: 12,
        padding: "16px 20px",
        flex: 1,
        minWidth: 240,
      }}
    >
      <div style={{ fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, color: "#d4ff3f", fontWeight: 800, marginTop: 4 }}>{detail}</div>
    </div>
  );
}

function ShareCard() {
  return (
    <div
      style={{
        width: 320,
        background: "#1a201b",
        border: "1px solid #2d3530",
        borderRadius: 16,
        padding: 22,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ fontSize: 11, color: "#9ca3af", letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>
        Your invite link
      </div>
      <div
        style={{
          fontFamily: "ui-monospace, monospace",
          background: "#0a0d0a",
          borderRadius: 8,
          padding: "12px 14px",
          fontSize: 13,
          color: "#d4ff3f",
          wordBreak: "break-all",
          border: "1px solid #2d3530",
        }}
      >
        thechampions.club/signup?code=<strong>DEMO2026</strong>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <ShareBtn label="📱 iMessage" />
        <ShareBtn label="💬 SMS" />
        <ShareBtn label="📨 Email" />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <ShareBtn label="📷 IG DM" />
        <ShareBtn label="🔗 Copy" />
      </div>
    </div>
  );
}

function ShareBtn({ label }: { label: string }) {
  return (
    <div
      style={{
        flex: 1,
        textAlign: "center",
        background: "#232a25",
        border: "1px solid #2d3530",
        borderRadius: 8,
        padding: "8px 4px",
        fontSize: 12,
        fontWeight: 700,
        color: "#d1d5db",
      }}
    >
      {label}
    </div>
  );
}

function EmailMock() {
  return (
    <div
      style={{
        width: 340,
        background: "#fff",
        borderRadius: 14,
        padding: 22,
        color: "#111",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
        Inbox · Now
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, marginTop: 8, color: "#111" }}>
        Your Champions sign-in link
      </div>
      <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>from noreply@thechampions.club</div>
      <div style={{ borderTop: "1px solid #e5e7eb", margin: "14px 0", paddingTop: 14 }}>
        <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.55 }}>
          Tap below to finish signing in. Link expires in 60 minutes.
        </div>
        <div
          style={{
            display: "inline-block",
            marginTop: 14,
            background: "#0f1410",
            color: "#d4ff3f",
            padding: "12px 24px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: 1,
          }}
        >
          SIGN ME IN →
        </div>
      </div>
    </div>
  );
}

// --------- Phone mocks (static visuals of the real app screens) ---------

function PhoneFrame({ children, header = "Owner · Maria L." }: { children: ReactNode; header?: string }) {
  return (
    <div
      style={{
        width: 320,
        background: "#0f1410",
        borderRadius: 28,
        border: "8px solid #1a1d1a",
        boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          padding: "14px 16px 10px",
          borderBottom: "1px solid #2d3530",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: 1.5 }}>
          <span style={{ color: "#d4ff3f" }}>THE</span>{" "}
          <span style={{ color: "#f3f4f6" }}>CHAMPIONS</span>
        </div>
        <div style={{ fontSize: 10, color: "#9ca3af" }}>{header}</div>
      </div>
      <div style={{ padding: "16px 14px", minHeight: 460 }}>{children}</div>
    </div>
  );
}

function PhoneMock({ screen }: { screen: string }) {
  if (screen === "home" || screen === "streak") {
    const streakNum = screen === "streak" ? 28 : 14;
    return (
      <PhoneFrame>
        <div
          style={{
            background: "linear-gradient(135deg, #1a201b 0%, #2a3528 100%)",
            border: "1px solid #a4c92e",
            borderRadius: 14,
            padding: "20px 14px",
            textAlign: "center",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 28 }}>🔥</div>
          <div style={{ fontSize: 52, fontWeight: 900, color: "#d4ff3f", lineHeight: 1 }}>{streakNum}</div>
          <div style={{ fontSize: 10, color: "#9ca3af", letterSpacing: 2, textTransform: "uppercase" }}>Day Streak</div>
        </div>
        <MiniProg label="Customers" val="87 / 100" pct={87} />
        <MiniProg label="Consumption Sales" val="$820 / $1,000" pct={82} />
        <MiniProg label="Retail Sales" val="$245" pct={0} hideBar />
        <MiniProg label="Social Posts" val="3 / 3" pct={100} green />
      </PhoneFrame>
    );
  }
  if (screen === "home-empty") {
    return (
      <PhoneFrame header="Owner · New club">
        <div
          style={{
            background: "linear-gradient(135deg, #1a201b 0%, #2a3528 100%)",
            border: "1px dashed #2d3530",
            borderRadius: 14,
            padding: "20px 14px",
            textAlign: "center",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 28 }}>🔥</div>
          <div style={{ fontSize: 52, fontWeight: 900, color: "#6b7280", lineHeight: 1 }}>0</div>
          <div style={{ fontSize: 10, color: "#9ca3af", letterSpacing: 2, textTransform: "uppercase" }}>Day Streak</div>
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
          Today · ready to log
        </div>
        <MiniProg label="Customers" val="0 / 100" pct={0} />
        <MiniProg label="Consumption Sales" val="$0 / $1,000" pct={0} />
        <MiniProg label="Retail Sales" val="$0" pct={0} hideBar />
        <MiniProg label="Social Posts" val="0 / 3" pct={0} green />
        <div
          style={{
            background: "#d4ff3f",
            color: "#000",
            textAlign: "center",
            padding: 12,
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 13,
            marginTop: 14,
          }}
        >
          LOG / EDIT TODAY
        </div>
      </PhoneFrame>
    );
  }
  if (screen === "signup") {
    return (
      <PhoneFrame header="Sign in">
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#f3f4f6", marginBottom: 4 }}>Welcome, Champion.</div>
          <div style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.5 }}>
            We&apos;ll email you a one-tap link — no password.
          </div>
        </div>
        <MiniInput label="Your name" value="Maria Lopez" />
        <MiniInput label="Email" value="maria@example.com" />
        <MiniInput label="Leader code" value="DEMO2026" highlight />
        <div
          style={{
            background: "#d4ff3f",
            color: "#000",
            textAlign: "center",
            padding: 14,
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 14,
            marginTop: 8,
          }}
        >
          SEND MAGIC LINK
        </div>
      </PhoneFrame>
    );
  }
  if (screen === "log") {
    return (
      <PhoneFrame>
        <div style={{ fontSize: 11, color: "#9ca3af", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
          Logging · Thursday
        </div>
        <LogField icon="🥤" label="Customers" value="87" hint="Goal: 100" buttons={["−1", "+1", "+5", "+10"]} />
        <LogField icon="💵" label="Consumption Sales" value="$820" hint="Goal: $1,000" buttons={["+$1", "+$5", "+$10", "+$25"]} />
        <LogField icon="📦" label="Retail Sales" value="$245" hint="Containers" buttons={["+$5", "+$25", "+$100"]} />
        <LogRowCompact icon="🙋" label="New Customers" value="4" buttons={["−1", "+1"]} />
        <LogRowCompact icon="🚚" label="Deliveries / Tea Drops" value="6" buttons={["−1", "+1"]} />
        <LogRowCompact icon="📱" label="Social Posts" value="3" buttons={["−1", "+1"]} />
        <div
          style={{
            background: "#d4ff3f",
            color: "#000",
            textAlign: "center",
            padding: 11,
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 13,
            marginTop: 8,
          }}
        >
          SAVE TODAY
        </div>
      </PhoneFrame>
    );
  }
  if (screen === "week") {
    return (
      <PhoneFrame>
        <div style={{ fontSize: 11, color: "#9ca3af", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
          🏆 Sunday Wrap-Up
        </div>
        <div style={{ fontSize: 10, color: "#9ca3af", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
          Auto-filled from your dailies
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
          <AutoMini label="Customers" val="487" />
          <AutoMini label="Cons. Sales" val="$4.8k" />
          <AutoMini label="Retail" val="$1.2k" />
          <AutoMini label="New Cust." val="14" />
        </div>
        <div style={{ fontSize: 10, color: "#9ca3af", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>
          🏆 Biggest win
        </div>
        <div
          style={{
            background: "#232a25",
            border: "1px solid #2d3530",
            borderRadius: 8,
            padding: 10,
            fontSize: 12,
            color: "#d1d5db",
            lineHeight: 1.4,
            marginBottom: 10,
          }}
        >
          Hit 100 drinks Saturday for the first time ever 🔥
        </div>
        <div
          style={{
            background: "#d4ff3f",
            color: "#000",
            textAlign: "center",
            padding: 12,
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          SUBMIT WEEK
        </div>
      </PhoneFrame>
    );
  }
  if (screen === "group") {
    return (
      <PhoneFrame header="Leader · Ronnie">
        <div style={{ fontSize: 11, color: "#9ca3af", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
          Your group · This week
        </div>
        <LBMock rank={1} name="Maria L." drinks="624" sales="$6.2k" streak="28d" />
        <LBMock rank={2} name="Carlos R." drinks="487" sales="$4.8k" streak="21d" />
        <LBMock rank={3} name="Diana V." drinks="412" sales="$3.9k" streak="14d" />
        <LBMock rank={4} name="Patty G." drinks="312" sales="$2.9k" streak="7d" />
        <LBMock rank={5} name="Lisa K." drinks="241" sales="$2.2k" streak="3d" />
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            background: "rgba(212,255,63,0.08)",
            border: "1px solid #a4c92e",
            borderRadius: 8,
            fontSize: 12,
            color: "#d4ff3f",
          }}
        >
          ✨ New: Maria Lopez joined your group
        </div>
      </PhoneFrame>
    );
  }
  if (screen === "admin") {
    return (
      <PhoneFrame header="⭐ Admin · Enrique">
        <div style={{ fontSize: 11, color: "#9ca3af", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
          Where the team is going
        </div>
        <PulseMini label="Customers" val="4,287" delta="↑ 12%" />
        <PulseMini label="Sales" val="$38,920" delta="↑ 8%" />
        <PulseMini label="Avg Streak" val="12.4d" delta="↑ 1.8d" />
        <PulseMini label="Logging Daily" val="9 / 12" delta="↓ 1" down />
        <div style={{ fontSize: 10, color: "#9ca3af", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 14, marginBottom: 6 }}>
          🚨 Needs attention
        </div>
        <div
          style={{
            background: "#1a201b",
            border: "1px solid #2d3530",
            borderRadius: 8,
            padding: 10,
            fontSize: 12,
            color: "#d1d5db",
            lineHeight: 1.5,
          }}
        >
          <div>Eddie M. — broke streak yesterday</div>
          <div style={{ marginTop: 4 }}>Lisa K. — 3-day avg dropping</div>
        </div>
      </PhoneFrame>
    );
  }
  return null;
}

function MiniProg({ label, val, pct, green, hideBar }: { label: string; val: string; pct: number; green?: boolean; hideBar?: boolean }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: "#d1d5db" }}>{label}</span>
        <span style={{ color: "#f3f4f6", fontWeight: 700 }}>{val}</span>
      </div>
      {!hideBar && (
        <div style={{ height: 6, background: "#2d3530", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: green ? "#4ade80" : "#d4ff3f" }} />
        </div>
      )}
    </div>
  );
}

function MiniInput({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: "#9ca3af", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div
        style={{
          background: highlight ? "rgba(212,255,63,0.08)" : "#232a25",
          border: `1px solid ${highlight ? "#a4c92e" : "#2d3530"}`,
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 13,
          color: highlight ? "#d4ff3f" : "#f3f4f6",
          fontWeight: highlight ? 800 : 500,
          letterSpacing: highlight ? 1 : 0,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function LogField({ icon, label, value, hint, buttons }: { icon: string; label: string; value: string; hint: string; buttons: string[] }) {
  return (
    <div
      style={{
        background: "#1a201b",
        border: "1px solid #2d3530",
        borderRadius: 10,
        padding: 10,
        marginBottom: 8,
      }}
    >
      <div style={{ fontSize: 9, color: "#9ca3af", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
        {icon} {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#d4ff3f", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 10, color: "#6b7280" }}>{hint}</div>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {buttons.map((b) => (
          <div
            key={b}
            style={{
              flex: 1,
              background: "#232a25",
              border: "1px solid #2d3530",
              borderRadius: 6,
              padding: "5px 0",
              textAlign: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "#d1d5db",
            }}
          >
            {b}
          </div>
        ))}
      </div>
    </div>
  );
}

function LogRowCompact({ icon, label, value, buttons }: { icon: string; label: string; value: string; buttons: string[] }) {
  return (
    <div
      style={{
        background: "#1a201b",
        border: "1px solid #2d3530",
        borderRadius: 10,
        padding: "7px 10px",
        marginBottom: 6,
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 8,
        alignItems: "center",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 9, color: "#9ca3af", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>
          {icon} {label}
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#d4ff3f", lineHeight: 1 }}>{value}</div>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {buttons.map((b) => (
          <div
            key={b}
            style={{
              background: "#232a25",
              border: "1px solid #2d3530",
              borderRadius: 6,
              padding: "6px 9px",
              fontSize: 11,
              fontWeight: 700,
              color: "#d1d5db",
            }}
          >
            {b}
          </div>
        ))}
      </div>
    </div>
  );
}

function AutoMini({ label, val }: { label: string; val: string }) {
  return (
    <div style={{ background: "#232a25", borderRadius: 8, padding: 8 }}>
      <div style={{ fontSize: 9, color: "#9ca3af", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#d4ff3f", marginTop: 2 }}>{val}</div>
    </div>
  );
}

function LBMock({ rank, name, drinks, sales, streak }: { rank: number; name: string; drinks: string; sales: string; streak: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "20px 1fr 50px 56px 32px",
        gap: 6,
        alignItems: "center",
        padding: "8px 2px",
        borderBottom: "1px solid #2d3530",
        fontSize: 12,
      }}
    >
      <div style={{ color: "#d4ff3f", fontWeight: 800 }}>{rank}</div>
      <div style={{ fontWeight: 600, color: "#f3f4f6" }}>{name}</div>
      <div style={{ textAlign: "right", fontWeight: 700 }}>{drinks}</div>
      <div style={{ textAlign: "right", fontWeight: 700 }}>{sales}</div>
      <div style={{ textAlign: "right", color: "#9ca3af", fontSize: 10 }}>{streak}</div>
    </div>
  );
}

function PulseMini({ label, val, delta, down }: { label: string; val: string; delta: string; down?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid #2d3530",
      }}
    >
      <div style={{ fontSize: 12, color: "#d1d5db" }}>{label}</div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>{val}</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: down ? "#f87171" : "#4ade80" }}>{delta}</div>
      </div>
    </div>
  );
}
