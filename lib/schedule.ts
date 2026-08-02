export const RESEARCH_HOURS = [0, 4, 8, 12, 16, 20];
export const STORM_HOURS = [2, 8, 14, 20];
export const ANIME_HOURS = [5, 11, 17, 23];

/** Returns a short "next run in Xh Ym" label, computed in UTC to match the cron schedule. */
export function nextRunLabel(hours: number[]): string {
  const now = new Date();
  const nowHour = now.getUTCHours();
  const nowMin = now.getUTCMinutes();

  const sorted = [...hours].sort((a, b) => a - b);
  let next = sorted.find((h) => h > nowHour);
  let dayOffset = 0;
  if (next === undefined) {
    next = sorted[0];
    dayOffset = 1;
  }

  const totalMinutesUntil = (next - nowHour + dayOffset * 24) * 60 - nowMin;
  const hh = Math.floor(totalMinutesUntil / 60);
  const mm = totalMinutesUntil % 60;
  return `${hh}h ${mm}m`;
}
