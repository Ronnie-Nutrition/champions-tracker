import { mondayOfWeek, todayLocalISO } from "./dates";

export type DailyLogRow = {
  log_date: string; // "YYYY-MM-DD"
  consumptions: number | null;
  consumption_sales: number | null;
  retail_sales: number | null;
  new_customers: number | null;
  deliveries: number | null;
  social_posts: number | null;
};

export type WeekSums = {
  consumptions: number;
  consumption_sales: number;
  retail_sales: number;
  new_customers: number;
  deliveries: number;
  social_posts: number;
};

export const EMPTY_WEEK: WeekSums = {
  consumptions: 0,
  consumption_sales: 0,
  retail_sales: 0,
  new_customers: 0,
  deliveries: 0,
  social_posts: 0,
};

// Consecutive days with at least one daily_log row, counting back from
// today. If today hasn't been logged yet, start from yesterday so the
// streak doesn't visibly drop to 0 every day at midnight before the
// owner has had a chance to log.
export function computeStreak(rows: DailyLogRow[], now: Date = new Date()): number {
  const logged = new Set(rows.map((r) => r.log_date));
  const cursor = new Date(now);
  if (!logged.has(todayLocalISO(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (logged.has(todayLocalISO(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Sum every column for rows whose log_date falls in [startISO, endISO] inclusive.
export function sumWeek(
  rows: DailyLogRow[],
  startISO: string,
  endISO: string
): WeekSums {
  const sums: WeekSums = { ...EMPTY_WEEK };
  for (const r of rows) {
    if (r.log_date < startISO || r.log_date > endISO) continue;
    sums.consumptions += r.consumptions ?? 0;
    sums.consumption_sales += r.consumption_sales ?? 0;
    sums.retail_sales += r.retail_sales ?? 0;
    sums.new_customers += r.new_customers ?? 0;
    sums.deliveries += r.deliveries ?? 0;
    sums.social_posts += r.social_posts ?? 0;
  }
  return sums;
}

// Sum every column for rows in [Monday-of-this-week, today]
export function sumThisWeek(rows: DailyLogRow[], now: Date = new Date()): WeekSums {
  return sumWeek(rows, todayLocalISO(mondayOfWeek(now)), todayLocalISO(now));
}

export function formatMoney(n: number): string {
  // $2,847 — no decimals, whole dollars only (matches daily_logs schema)
  return `$${n.toLocaleString("en-US")}`;
}
