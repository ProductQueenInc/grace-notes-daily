// Local-time YYYY-MM-DD helpers.
// IMPORTANT: never use Date.toISOString().slice(0,10) for "today" — that gives
// UTC date, which can roll over hours before or after the user's local midnight.
// Every "today" anchor in the app (habits, grace note cache, devotional cache,
// daily chat reset, calendar today cell, streak walk) must agree on the user's
// local day, otherwise yesterday's state leaks into the new day.

export function isoForDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function localTodayISO(): string {
  return isoForDate(new Date());
}
