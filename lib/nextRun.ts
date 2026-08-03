// Every 2 hours, full 24h coverage — matches vercel.json's "0 */2 * * *" for research.
const RESEARCH_HOURS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

/** Seconds until the next research cycle kicks off, computed in UTC to match the cron schedule. */
export function secondsUntilNextCycle(): number {
  const now = new Date();
  const nowHour = now.getUTCHours();
  const nowMin = now.getUTCMinutes();
  const nowSec = now.getUTCSeconds();

  let next = RESEARCH_HOURS.find((h) => h > nowHour);
  let dayOffset = 0;
  if (next === undefined) {
    next = RESEARCH_HOURS[0];
    dayOffset = 1;
  }

  const totalSecondsUntil = (next - nowHour + dayOffset * 24) * 3600 - nowMin * 60 - nowSec;
  return totalSecondsUntil;
}

export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(Math.floor(s % 60)).padStart(2, "0");
  return `${h}:${m}:${ss}`;
}
