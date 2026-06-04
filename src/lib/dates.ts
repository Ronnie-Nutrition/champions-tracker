// All date helpers use the device's local timezone. Auto-detect is the
// PRD-locked behavior; we don't normalize to UTC anywhere user-facing.

export function todayLocalISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayLabel(d: Date = new Date()): string {
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  return `Today — ${weekday}, ${monthDay}`;
}

export function loggingLabel(d: Date = new Date()): string {
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  return `Logging — ${weekday}, ${monthDay}`;
}

// Backfill window: the daily form may log today OR up to `maxBack` prior
// days, so a member who forgot to hit send last night can still post it.
// Anything older than the window is intentionally locked out — the board
// can't be edited days after the fact.
export type LogDateOption = { iso: string; chip: string; full: string };

export function backfillDateOptions(
  maxBack: number,
  d: Date = new Date()
): LogDateOption[] {
  const opts: LogDateOption[] = [];
  for (let i = 0; i <= maxBack; i++) {
    const dt = new Date(d);
    dt.setDate(d.getDate() - i);
    const weekday = dt.toLocaleDateString("en-US", { weekday: "long" });
    const monthDay = dt.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
    const chip = i === 0 ? "Today" : i === 1 ? "Yesterday" : weekday;
    opts.push({ iso: todayLocalISO(dt), chip, full: `${weekday}, ${monthDay}` });
  }
  return opts;
}

// Monday of the current local week (PRD: weeks start Monday)
export function mondayOfWeek(d: Date = new Date()): Date {
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const offset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + offset);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Monday of the week that is `offset` weeks away from the current week.
// offset 0 = this week, -1 = last week, etc.
export function mondayOfWeekOffset(offset: number, d: Date = new Date()): Date {
  const monday = mondayOfWeek(d);
  monday.setDate(monday.getDate() + offset * 7);
  return monday;
}

// Sunday (end) of the week that starts on the given Monday.
export function sundayOfWeek(monday: Date): Date {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}

export function weekLabel(d: Date = new Date()): string {
  const monday = mondayOfWeek(d);
  const monthDay = monday.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  return `Week of ${monthDay}`;
}
