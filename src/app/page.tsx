"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateOwner, signOut, type Owner } from "@/lib/owner";
import {
  loggingLabel,
  mondayOfWeek,
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
type GroupRow = {
  owner_id: string;
  name: string;
  drinks: number;
  sales: number;
  newCustomers: number;
  streak: number;
  isMe: boolean;
};
type LeaderRollup = {
  code: string;
  name: string | null;
  ownerCount: number;
  drinks: number;
};
type TopChampion = {
  owner_id: string;
  name: string;
  leader_code: string | null;
  leader_name: string | null;
  drinks: number;
  sales: number;
};
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
  cons: "Total customers",
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
  const [groupRows, setGroupRows] = useState<GroupRow[]>([]);
  const [groupPulse, setGroupPulse] = useState({
    consumptions: 0,
    sales: 0,
    newCustomers: 0,
    activeOwners: 0,
    totalOwners: 0,
  });
  const [adminPulse, setAdminPulse] = useState({
    consumptions: 0,
    sales: 0,
    newCustomers: 0,
    avgStreak: 0,
    activeToday: 0,
    totalOwners: 0,
  });
  const [leaderRollups, setLeaderRollups] = useState<LeaderRollup[]>([]);
  const [topChampions, setTopChampions] = useState<TopChampion[]>([]);
  const [attentionItems, setAttentionItems] = useState<string[]>([]);
  // Admin drill-down: when an admin clicks a row in the "By Leader Code"
  // rollup, the Group tab swaps to that leader's downline instead of the
  // admin's own. null = default (show own group via loadGroup).
  const [adminViewingLeader, setAdminViewingLeader] = useState<{
    code: string;
    name: string;
  } | null>(null);
  // Stale-response guard for refreshGroupForCode — rapid clicks across
  // different leaders would otherwise race.
  const groupRequestIdRef = useRef(0);
  const [inviteCopied, setInviteCopied] = useState(false);
  // The actual leader's display name (from leader_codes.leader_name), not
  // a hardcoded value — so Gloria-under-Bernadette sees "Bernadette
  // Carrillo • Gloria Carrillo" instead of the old "Enrique Carrillo • …".
  const [leaderName, setLeaderName] = useState<string | null>(null);
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
        if (lookup.kind === "no-session") {
          router.replace("/signin");
          return;
        }
        if (lookup.kind === "incomplete-signup") {
          // Signed in but no owners row + no leader_code in metadata —
          // typically happens when a brand-new user landed on /signin
          // instead of using their leader's invite link. Send them to
          // /signup so they can enter their leader code.
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

        // Resolve the leader's actual display name. leader_codes is publicly
        // readable (RLS); a missing or null result just falls back to the
        // owner's own name in headerMeta.
        if (me.leader_code) {
          supabase
            .from("leader_codes")
            .select("leader_name")
            .eq("code", me.leader_code)
            .maybeSingle()
            .then(({ data }) => {
              if (cancelled) return;
              if (data?.leader_name) setLeaderName(data.leader_name);
            });
        }

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

        loadGroup(me).catch(() => {
          // leaderboard is non-critical — silent fail keeps Home usable
        });
        loadAdminViews(me).catch(() => {
          // admin views are non-critical too — silent fail
        });
      } finally {
        loadInFlight = false;
      }
    }

    async function loadGroup(me: Owner) {
      if (!me.leader_code) return;

      const { data: ownerList, error: ownerErr } = await supabase
        .from("owners")
        .select("id, name")
        .eq("leader_code", me.leader_code);
      if (cancelled || ownerErr || !ownerList?.length) return;

      const ownerIds = ownerList.map((o) => o.id);

      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - 35);
      const { data: logs, error: logErr } = await supabase
        .from("daily_logs")
        .select(
          "owner_id, log_date, consumptions, consumption_sales, retail_sales, new_customers, deliveries, social_posts"
        )
        .in("owner_id", ownerIds)
        .gte("log_date", todayLocalISO(sinceDate))
        .lte("log_date", todayLocalISO());
      if (cancelled || logErr) return;

      const logsByOwner = new Map<string, DailyLogRow[]>();
      for (const log of logs ?? []) {
        const arr = logsByOwner.get(log.owner_id) ?? [];
        arr.push(log as DailyLogRow);
        logsByOwner.set(log.owner_id, arr);
      }

      const weekStartISO = todayLocalISO(mondayOfWeek());
      const todayISO = todayLocalISO();

      const groupedRows: GroupRow[] = ownerList.map((o) => {
        const ownerLogs = logsByOwner.get(o.id) ?? [];
        const wk = sumThisWeek(ownerLogs);
        return {
          owner_id: o.id,
          name: o.id === me.id ? "You" : o.name,
          drinks: wk.consumptions,
          sales: wk.consumption_sales + wk.retail_sales,
          newCustomers: wk.new_customers,
          streak: computeStreak(ownerLogs),
          isMe: o.id === me.id,
        };
      });

      groupedRows.sort(
        (a, b) => b.drinks - a.drinks || b.sales - a.sales
      );
      setGroupRows(groupedRows);

      const activeOwners = ownerList.filter((o) => {
        const ownerLogs = logsByOwner.get(o.id) ?? [];
        return ownerLogs.some(
          (l) => l.log_date >= weekStartISO && l.log_date <= todayISO
        );
      }).length;

      setGroupPulse({
        consumptions: groupedRows.reduce((s, r) => s + r.drinks, 0),
        sales: groupedRows.reduce((s, r) => s + r.sales, 0),
        newCustomers: groupedRows.reduce((s, r) => s + r.newCustomers, 0),
        activeOwners,
        totalOwners: ownerList.length,
      });
    }

    async function loadAdminViews(me: Owner) {
      if (!me.is_admin) return;

      const { data: allOwners, error: ownerErr } = await supabase
        .from("owners")
        .select("id, name, leader_code");
      if (cancelled || ownerErr || !allOwners?.length) return;

      const allOwnerIds = allOwners.map((o) => o.id);

      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - 35);
      const { data: logs, error: logErr } = await supabase
        .from("daily_logs")
        .select(
          "owner_id, log_date, consumptions, consumption_sales, retail_sales, new_customers, deliveries, social_posts"
        )
        .in("owner_id", allOwnerIds)
        .gte("log_date", todayLocalISO(sinceDate))
        .lte("log_date", todayLocalISO());
      if (cancelled || logErr) return;

      const weekStartISO = todayLocalISO(mondayOfWeek());
      const { data: wrapups } = await supabase
        .from("weekly_wrapups")
        .select("owner_id")
        .eq("week_start", weekStartISO);
      if (cancelled) return;

      const logsByOwner = new Map<string, DailyLogRow[]>();
      for (const log of logs ?? []) {
        const arr = logsByOwner.get(log.owner_id) ?? [];
        arr.push(log as DailyLogRow);
        logsByOwner.set(log.owner_id, arr);
      }

      const todayISO = todayLocalISO();
      let totalConsumptions = 0;
      let totalSales = 0;
      let totalNewCustomers = 0;
      let totalStreak = 0;
      let activeToday = 0;

      for (const o of allOwners) {
        const ownerLogs = logsByOwner.get(o.id) ?? [];
        const wk = sumThisWeek(ownerLogs);
        totalConsumptions += wk.consumptions;
        totalSales += wk.consumption_sales + wk.retail_sales;
        totalNewCustomers += wk.new_customers;
        totalStreak += computeStreak(ownerLogs);
        if (ownerLogs.some((l) => l.log_date === todayISO)) activeToday++;
      }

      setAdminPulse({
        consumptions: totalConsumptions,
        sales: totalSales,
        newCustomers: totalNewCustomers,
        avgStreak:
          allOwners.length > 0
            ? Math.round((totalStreak / allOwners.length) * 10) / 10
            : 0,
        activeToday,
        totalOwners: allOwners.length,
      });

      // By Leader Code rollup
      const byCode = new Map<
        string,
        { code: string; ownerCount: number; drinks: number }
      >();
      for (const o of allOwners) {
        if (!o.leader_code) continue;
        const ownerLogs = logsByOwner.get(o.id) ?? [];
        const wk = sumThisWeek(ownerLogs);
        const cur = byCode.get(o.leader_code) ?? {
          code: o.leader_code,
          ownerCount: 0,
          drinks: 0,
        };
        cur.ownerCount += 1;
        cur.drinks += wk.consumptions;
        byCode.set(o.leader_code, cur);
      }

      // Pre-fetch leader display names so the rollup rows can be clicked to
      // drill into a specific leader's downline (and the banner that appears
      // on the Group tab knows what name to show).
      const { data: codeRows } = await supabase
        .from("leader_codes")
        .select("code, leader_name");
      if (cancelled) return;
      const codeToName = new Map<string, string | null>(
        (codeRows ?? []).map((r) => [r.code, r.leader_name])
      );

      setLeaderRollups(
        Array.from(byCode.values())
          .map((r) => ({ ...r, name: codeToName.get(r.code) ?? null }))
          .sort((a, b) => b.drinks - a.drinks)
      );

      // Cross-downline Top 10 — ranks every individual owner across every
      // leader's downline by this-week drinks (tiebreak: sales). Admin-only
      // view so Enrique can see the team-wide champions, not just his own
      // direct signups. Mirrors group-leaderboard sort to stay consistent.
      const champions: TopChampion[] = allOwners.map((o) => {
        const wk = sumThisWeek(logsByOwner.get(o.id) ?? []);
        return {
          owner_id: o.id,
          name: o.name,
          leader_code: o.leader_code ?? null,
          leader_name: o.leader_code
            ? codeToName.get(o.leader_code) ?? null
            : null,
          drinks: wk.consumptions,
          sales: wk.consumption_sales + wk.retail_sales,
        };
      });
      champions.sort((a, b) => b.drinks - a.drinks || b.sales - a.sales);
      setTopChampions(champions.slice(0, 10));

      // Needs Attention — broke-streak owners + missing wrap-ups
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoISO = todayLocalISO(sevenDaysAgo);

      const items: string[] = [];
      for (const o of allOwners) {
        const ownerLogs = logsByOwner.get(o.id) ?? [];
        const streak = computeStreak(ownerLogs);
        const loggedInLast7 = ownerLogs.some(
          (l) => l.log_date >= sevenDaysAgoISO
        );
        if (streak === 0 && loggedInLast7) {
          items.push(`${o.name} — broke streak`);
        }
      }

      const submittedIds = new Set((wrapups ?? []).map((w) => w.owner_id));
      const missingCount = allOwners.filter(
        (o) => !submittedIds.has(o.id)
      ).length;
      if (missingCount > 0) {
        items.push(
          `${missingCount} owner${missingCount === 1 ? "" : "s"} haven't submitted this week's wrap-up`
        );
      }
      setAttentionItems(items.slice(0, 5));
    }

    // onAuthStateChange fires INITIAL_SESSION immediately after subscribe
    // with whatever the current session is (null on a fresh load, populated
    // once a magic-link hash has been parsed). It also fires SIGNED_IN when
    // a magic link lands and is processed asynchronously, so this single
    // listener covers both the cold-load and magic-link-arrival cases.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_OUT") {
        router.replace("/signin");
        return;
      }
      if (!session) {
        // No session yet (INITIAL_SESSION with null). Bounce to signin.
        router.replace("/signin");
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
    ? page === "admin"
      ? `Admin • ${owner.name}`
      : leaderName && leaderName !== owner.name
        ? `${leaderName} • ${owner.name}`
        : owner.name
    : "…";

  // Admin drill-down: fetch + render any leader's downline in the Group tab.
  // Mirrors the inline loadGroup() inside the mount useEffect but parameterised
  // by leader_code and protected by a request-id ref so rapid clicks across
  // leaders don't let a stale response overwrite the newest one. RLS still
  // applies: only is_admin owners can query owners outside their own
  // leader_code (see migration 003 — owners_admin_read, daily_logs_select_visible).
  async function refreshGroupForCode(leaderCode: string, myOwnerId: string) {
    const myRequestId = ++groupRequestIdRef.current;

    const { data: ownerList, error: ownerErr } = await supabase
      .from("owners")
      .select("id, name")
      .eq("leader_code", leaderCode);
    if (myRequestId !== groupRequestIdRef.current) return;
    if (ownerErr || !ownerList?.length) {
      setGroupRows([]);
      setGroupPulse({
        consumptions: 0,
        sales: 0,
        newCustomers: 0,
        activeOwners: 0,
        totalOwners: 0,
      });
      return;
    }

    const ownerIds = ownerList.map((o) => o.id);
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 35);
    const { data: logs, error: logErr } = await supabase
      .from("daily_logs")
      .select(
        "owner_id, log_date, consumptions, consumption_sales, retail_sales, new_customers, deliveries, social_posts"
      )
      .in("owner_id", ownerIds)
      .gte("log_date", todayLocalISO(sinceDate))
      .lte("log_date", todayLocalISO());
    if (myRequestId !== groupRequestIdRef.current) return;
    if (logErr) return;

    const logsByOwner = new Map<string, DailyLogRow[]>();
    for (const log of logs ?? []) {
      const arr = logsByOwner.get(log.owner_id) ?? [];
      arr.push(log as DailyLogRow);
      logsByOwner.set(log.owner_id, arr);
    }

    const weekStartISO = todayLocalISO(mondayOfWeek());
    const todayISO = todayLocalISO();

    const groupedRows: GroupRow[] = ownerList.map((o) => {
      const ownerLogs = logsByOwner.get(o.id) ?? [];
      const wk = sumThisWeek(ownerLogs);
      return {
        owner_id: o.id,
        name: o.id === myOwnerId ? "You" : o.name,
        drinks: wk.consumptions,
        sales: wk.consumption_sales + wk.retail_sales,
        newCustomers: wk.new_customers,
        streak: computeStreak(ownerLogs),
        isMe: o.id === myOwnerId,
      };
    });

    groupedRows.sort((a, b) => b.drinks - a.drinks || b.sales - a.sales);

    const activeOwners = ownerList.filter((o) => {
      const ownerLogs = logsByOwner.get(o.id) ?? [];
      return ownerLogs.some(
        (l) => l.log_date >= weekStartISO && l.log_date <= todayISO
      );
    }).length;

    if (myRequestId !== groupRequestIdRef.current) return;
    setGroupRows(groupedRows);
    setGroupPulse({
      consumptions: groupedRows.reduce((s, r) => s + r.drinks, 0),
      sales: groupedRows.reduce((s, r) => s + r.sales, 0),
      newCustomers: groupedRows.reduce((s, r) => s + r.newCustomers, 0),
      activeOwners,
      totalOwners: ownerList.length,
    });
  }

  function viewLeaderTeam(code: string, name: string) {
    if (!owner) return;
    setAdminViewingLeader({ code, name });
    go("group");
    refreshGroupForCode(code, owner.id).catch(() => {});
  }

  function backToMyTeam() {
    if (!owner?.leader_code) return;
    setAdminViewingLeader(null);
    refreshGroupForCode(owner.leader_code, owner.id).catch(() => {});
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/signin");
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

  async function submitWeek(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!owner) return;

    const fd = new FormData(e.currentTarget);
    const num = (k: string) => {
      const v = fd.get(k);
      return v == null || v === "" ? null : Number(v);
    };
    const text = (k: string) => {
      const v = fd.get(k);
      return typeof v === "string" && v.trim() ? v.trim() : null;
    };

    const row = {
      owner_id: owner.id,
      week_start: todayLocalISO(mondayOfWeek()),
      popups: num("popups") ?? 0,
      events: num("events") ?? 0,
      customer_appreciation_day: customerAppreciation === "yes",
      biggest_win: text("biggest_win"),
      biggest_lesson: text("biggest_lesson"),
      consumptions_goal: num("consumptions_goal"),
      consumption_sales_goal: num("consumption_sales_goal"),
      retail_sales_goal: num("retail_sales_goal"),
      new_customers_goal: num("new_customers_goal"),
    };

    const { error } = await supabase
      .from("weekly_wrapups")
      .upsert(row, { onConflict: "owner_id,week_start" });

    if (error) {
      showToast(`❌ Save failed: ${error.message}`);
      return;
    }

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
                onClick={() => router.replace("/signin")}
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
              <span className="prog-label">Customers</span>
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
            <div className="lbl">Customers</div>
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

        <div className="h-section">Account</div>
        <button className="btn-secondary" onClick={handleSignOut}>
          Sign out
        </button>

        <div className="tagline">Discipline today. Freedom tomorrow.</div>
      </div>

      {/* DAILY LOG */}
      <div className={`page ${page === "log" ? "active" : ""}`}>
        <div className="date-row">{labels.logging}</div>

        <NumField
          icon="🥤"
          label="Customers"
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
          <AutoCell label="Customers" value={String(weekSums.consumptions)} />
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

        <form onSubmit={submitWeek}>
          <div className="h-section">Fill In The Rest</div>

          <div className="input-row">
            <label>Pop-ups this week</label>
            <input type="number" name="popups" placeholder="0" defaultValue={1} />
          </div>
          <div className="input-row">
            <label>Events held</label>
            <input type="number" name="events" placeholder="0" defaultValue={0} />
          </div>
          <div className="input-row">
            <label>Customer Appreciation Day?</label>
            <div className="toggle-row">
              <button
                type="button"
                className={`toggle-btn ${customerAppreciation === "no" ? "active" : ""}`}
                onClick={() => setCustomerAppreciation("no")}
              >
                No
              </button>
              <button
                type="button"
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
              name="biggest_win"
              placeholder="What went right this week?"
              defaultValue="Hit 100 drinks on Saturday for the first time ever 🔥"
            />
          </div>
          <div className="input-row">
            <label>💡 Biggest lesson learned</label>
            <textarea name="biggest_lesson" placeholder="What did you learn?" />
          </div>

          <div className="h-section">🎯 Goals For Next Week</div>
          <div className="input-row">
            <label>Customers goal</label>
            <input type="number" name="consumptions_goal" placeholder="500" defaultValue={500} />
          </div>
          <div className="input-row">
            <label>Consumption sales goal ($)</label>
            <input type="number" name="consumption_sales_goal" placeholder="5000" defaultValue={5000} />
          </div>
          <div className="input-row">
            <label>Retail sales goal ($)</label>
            <input type="number" name="retail_sales_goal" placeholder="1000" defaultValue={1000} />
          </div>
          <div className="input-row">
            <label>New customers goal</label>
            <input type="number" name="new_customers_goal" placeholder="12" defaultValue={12} />
          </div>

          <button type="submit" className="btn-primary">
            SUBMIT WEEK
          </button>
        </form>
      </div>

      {/* GROUP / LEADERBOARD */}
      <div className={`page ${page === "group" ? "active" : ""}`}>
        <div className="date-row">The Champions — {labels.week}</div>

        {/* ADMIN DRILL-DOWN BANNER — shown when an admin clicked into another
            leader's team via the Admin tab's By Leader Code rollup. */}
        {adminViewingLeader && (
          <div
            className="card"
            style={{
              borderLeft: "3px solid var(--accent)",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-mute)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Admin view
                </div>
                <div style={{ fontSize: 14, marginTop: 2 }}>
                  Viewing <strong>{adminViewingLeader.name}</strong>&apos;s team
                  <span
                    style={{
                      color: "var(--text-mute)",
                      marginLeft: 6,
                      fontSize: 12,
                    }}
                  >
                    ({adminViewingLeader.code})
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={backToMyTeam}
                style={{ flexShrink: 0, whiteSpace: "nowrap" }}
              >
                ← MY TEAM
              </button>
            </div>
          </div>
        )}

        {/* LEADER INVITE LINK — only visible to leaders, with their own code baked in.
            Hidden during admin drill-down to avoid confusion: the link is the admin's
            own invite, not the leader they're currently viewing. */}
        {owner.is_leader && owner.leader_code && !adminViewingLeader && (() => {
          const inviteUrl = `https://championstracker.org/signup?code=${owner.leader_code}`;
          return (
            <>
              <div className="h-section" style={{ margin: "0 0 12px" }}>
                Your Team Invite Link
              </div>
              <div className="card">
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-dim)",
                    marginBottom: 10,
                    lineHeight: 1.4,
                  }}
                >
                  Share this with anyone you want on your team. Their signup is preloaded with your code.
                </div>
                <div
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 12,
                    color: "var(--text)",
                    background: "var(--bg-card-2)",
                    padding: "10px 12px",
                    borderRadius: 8,
                    wordBreak: "break-all",
                    marginBottom: 12,
                    userSelect: "all",
                  }}
                >
                  {inviteUrl}
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(inviteUrl);
                      setInviteCopied(true);
                      setTimeout(() => setInviteCopied(false), 2000);
                    } catch {
                      setToast("Couldn't copy — long-press the link above to copy manually.");
                    }
                  }}
                >
                  {inviteCopied ? "✓ COPIED" : "COPY LINK"}
                </button>
              </div>
            </>
          );
        })()}

        <div className="card">
          <div className="h-section" style={{ margin: "0 0 12px" }}>
            Group Pulse
          </div>
          <PulseRow
            label="Customers"
            value={groupPulse.consumptions.toLocaleString()}
          />
          <PulseRow label="Sales" value={formatMoney(groupPulse.sales)} />
          <PulseRow
            label="New Customers"
            value={groupPulse.newCustomers.toString()}
          />
          <PulseRow
            label="Active Owners (logged this week)"
            value={`${groupPulse.activeOwners} / ${groupPulse.totalOwners}`}
          />
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
            <div className="stat">Customers</div>
            <div className="stat">Sales</div>
            <div className="streak-mini">🔥</div>
          </div>
          {groupRows.length === 0 ? (
            <div
              style={{
                color: "var(--text-mute)",
                padding: "16px 12px",
                textAlign: "center",
                fontSize: 13,
              }}
            >
              No data yet — log a daily to appear here.
            </div>
          ) : (
            groupRows.map((r, i) => (
              <LBRow
                key={r.owner_id}
                rank={i + 1}
                name={r.name}
                drinks={r.drinks.toLocaleString()}
                sales={formatMoney(r.sales)}
                streak={`${r.streak}d`}
                you={r.isMe}
              />
            ))
          )}
        </div>
      </div>

      {/* ADMIN — gated to is_admin owners only */}
      {owner.is_admin && (
      <div className={`page ${page === "admin" ? "active" : ""}`}>
        <div className="date-row">⭐ Admin — {labels.week}</div>

        <div className="card">
          <div className="h-section" style={{ margin: "0 0 12px" }}>
            Where The Team Is Going
          </div>
          <PulseRow
            label="Customers"
            value={adminPulse.consumptions.toLocaleString()}
          />
          <PulseRow label="Sales" value={formatMoney(adminPulse.sales)} />
          <PulseRow
            label="New Customers"
            value={adminPulse.newCustomers.toString()}
          />
          <PulseRow label="Avg Streak" value={`${adminPulse.avgStreak}d`} />
          <PulseRow
            label="Active Today"
            value={`${adminPulse.activeToday} / ${adminPulse.totalOwners}`}
          />
        </div>

        <button className="btn-secondary" onClick={() => go("group")}>
          View Full Leaderboard →
        </button>

        <div className="h-section">🏆 Top 10 Champions — All Teams</div>
        <div className="card">
          {topChampions.length === 0 ? (
            <div
              style={{
                color: "var(--text-mute)",
                padding: "12px",
                fontSize: 13,
              }}
            >
              No data yet.
            </div>
          ) : (
            topChampions.map((c, i) => (
              <PulseRow
                key={c.owner_id}
                label={
                  <>
                    <span style={{ color: "var(--text-mute)", marginRight: 6 }}>
                      #{i + 1}
                    </span>
                    {c.name}
                    {c.leader_name && (
                      <span
                        style={{
                          color: "var(--text-dim)",
                          marginLeft: 6,
                          fontSize: 12,
                        }}
                      >
                        — {c.leader_name}&apos;s team
                      </span>
                    )}
                  </>
                }
                value={c.drinks.toLocaleString()}
              />
            ))
          )}
        </div>

        <div className="h-section">By Leader Code</div>
        <div className="card">
          {leaderRollups.length === 0 ? (
            <div
              style={{
                color: "var(--text-mute)",
                padding: "12px",
                fontSize: 13,
              }}
            >
              No data yet.
            </div>
          ) : (
            leaderRollups.map((r) => (
              <button
                key={r.code}
                type="button"
                onClick={() => viewLeaderTeam(r.code, r.name ?? r.code)}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  textAlign: "left",
                  color: "inherit",
                  font: "inherit",
                  display: "block",
                }}
                aria-label={`View ${r.name ?? r.code} team`}
              >
                <PulseRow
                  label={
                    <>
                      {r.code}
                      {r.name && (
                        <span
                          style={{
                            color: "var(--text-dim)",
                            marginLeft: 6,
                          }}
                        >
                          — {r.name}
                        </span>
                      )}{" "}
                      <span style={{ color: "var(--text-mute)" }}>
                        ({r.ownerCount}{" "}
                        {r.ownerCount === 1 ? "owner" : "owners"})
                      </span>
                    </>
                  }
                  value={`${r.drinks.toLocaleString()} ›`}
                />
              </button>
            ))
          )}
        </div>

        <div className="h-section">🚨 Needs Attention</div>
        <div className="card">
          {attentionItems.length === 0 ? (
            <div
              style={{
                padding: "12px",
                color: "var(--text-mute)",
                fontSize: 13,
              }}
            >
              🎉 Everyone&apos;s on track this week.
            </div>
          ) : (
            attentionItems.map((line, i) => (
              <div key={i} className="pulse-row">
                <div className="pulse-label">{line}</div>
              </div>
            ))
          )}
        </div>

        <div className="tagline">2,000+ clubs and beyond.</div>
      </div>
      )}

      {/* Bottom Nav */}
      <div className="navbar">
        <NavButton page="home" current={page} onSelect={go} icon="🏠" label="Home" />
        <NavButton page="log" current={page} onSelect={go} icon="➕" label="Log" />
        <NavButton page="week" current={page} onSelect={go} icon="🏆" label="Week" />
        <NavButton page="group" current={page} onSelect={go} icon="📊" label="Group" />
        {owner.is_admin && (
          <NavButton page="admin" current={page} onSelect={go} icon="⭐" label="Admin" />
        )}
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
  code?: string;
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
        {code && <span className="sub">{code}</span>}
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
