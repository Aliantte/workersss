import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import type { MockupWithIdea } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql<MockupWithIdea>`
      SELECT m.*, i.concept, i.category FROM mockups m
      JOIN ideas i ON i.id = m.idea_id
      ORDER BY m.idea_id DESC, m.template_name ASC`;
    return NextResponse.json({ mockups: rows });
  } catch (err) {
    return NextResponse.json({ mockups: [], error: String(err) }, { status: 200 });
  }
}
