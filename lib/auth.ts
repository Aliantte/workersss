import { NextRequest } from "next/server";

/**
 * Vercel automatically sends `Authorization: Bearer ${CRON_SECRET}` on cron
 * invocations, and auto-populates CRON_SECRET as an env var once you add
 * a cron job. Locally (no CRON_SECRET set) this check is skipped so you can
 * hit the routes by hand while developing.
 */
export function isAuthorizedCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
