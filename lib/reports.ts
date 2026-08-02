import { sql } from "./db";
import type { Report } from "./types";

export async function logReport(employee: Report["employee"], summary: string) {
  await sql`INSERT INTO reports (employee, summary) VALUES (${employee}, ${summary})`;
}
