import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import type { Report } from "@/lib/types";

export const dynamic = "force-dynamic";

const ROLE_MAP: Record<string, { employee: Report["employee"]; label: string; title: string }> = {
  research: { employee: "Aliantte", label: "Research Lab", title: "Aliantte" },
  studio: { employee: "Pin Laden", label: "Studio", title: "Pin Laden" },
  editor: { employee: "Ally Al", label: "Editor", title: "Ally Al" },
  packager: { employee: "Packager", label: "Packaging Bay", title: "Boxley" },
};

export async function GET(req: NextRequest, { params }: { params: { role: string } }) {
  const role = params.role;
  const info = ROLE_MAP[role];
  if (!info) {
    return NextResponse.json({ error: "Unknown role" }, { status: 404 });
  }

  try {
    await ensureSchema();

    const { rows: reports } = await sql<Report>`
      SELECT * FROM reports WHERE employee = ${info.employee} ORDER BY created_at DESC LIMIT 25`;

    let items: unknown[] = [];

    if (role === "research") {
      const { rows } = await sql`
        SELECT id, category, concept, status, created_at FROM ideas
        ORDER BY created_at DESC LIMIT 20`;
      items = rows;
    } else if (role === "studio") {
      const { rows } = await sql`
        SELECT a.id, a.url, a.created_at, i.concept, i.category FROM assets a
        JOIN ideas i ON i.id = a.idea_id
        WHERE a.type = 'design'
        ORDER BY a.created_at DESC LIMIT 20`;
      items = rows;
    } else if (role === "editor") {
      const { rows } = await sql`
        SELECT lc.idea_id, lc.title, lc.created_at, i.concept, i.category FROM listing_copy lc
        JOIN ideas i ON i.id = lc.idea_id
        ORDER BY lc.created_at DESC LIMIT 20`;
      items = rows;
    } else if (role === "packager") {
      const { rows } = await sql`
        SELECT id, concept, category, status, created_at FROM ideas
        WHERE status IN ('pending-review', 'approved', 'archived')
        ORDER BY created_at DESC LIMIT 20`;
      items = rows;
    }

    return NextResponse.json({ label: info.label, title: info.title, reports, items });
  } catch (err) {
    return NextResponse.json(
      { label: info.label, title: info.title, reports: [], items: [], error: String(err) },
      { status: 200 }
    );
  }
}
