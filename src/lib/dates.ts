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

// Monday of the current local week (PRD: weeks start Monday)
export function mondayOfWeek(d: Date = new Date()): Date {
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const offset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + offset);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function weekLabel(d: Date = new Date()): string {
  const monday = mondayOfWeek(d);
  const monthDay = monday.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  return `Week of ${monthDay}`;
}
