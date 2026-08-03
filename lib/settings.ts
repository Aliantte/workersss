import { sql } from "./db";

export async function getSetting(key: string): Promise<string | null> {
  const { rows } = await sql<{ value: string }>`SELECT value FROM settings WHERE key = ${key}`;
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string, reason: string): Promise<void> {
  await sql`INSERT INTO settings (key, value, reason) VALUES (${key}, ${value}, ${reason})
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, reason = EXCLUDED.reason, updated_at = now()`;
}

/** Reads a numeric setting, clamped to [min, max] regardless of what's stored — the clamp is enforced on every read, not just on write, so a bad value can never silently take effect. */
export async function getNumberSetting(key: string, fallback: number, min: number, max: number): Promise<number> {
  const raw = await getSetting(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function getAllSettings(): Promise<{ key: string; value: string; reason: string | null; updated_at: string }[]> {
  const { rows } = await sql<{ key: string; value: string; reason: string | null; updated_at: string }>`
    SELECT * FROM settings ORDER BY key ASC`;
  return rows;
}
