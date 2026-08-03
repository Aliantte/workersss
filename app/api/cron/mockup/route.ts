import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { sql, ensureSchema } from "@/lib/db";
import { isAuthorizedCronRequest } from "@/lib/auth";
import { logReport } from "@/lib/reports";
import { generateMockup, MOCKUP_TEMPLATES } from "@/lib/mockup";

export const dynamic = "force-dynamic";

export const maxDuration = 120;

// Only tumbler wraps have real reference templates right now. Other
// categories would need their own template photos before this expands to
// them — this isn't a limitation of the code, just a "haven't sourced photos
// for wall art / phone cases / etc yet" situation.
const MOCKUP_CATEGORY = "mug_tumbler_wrap";
const IDEA_CAP = 3;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();

  // Ideas with a rendered design, in this category, that don't already have
  // mockups for every template.
  const { rows: candidates } = await sql<{ id: number; design_url: string }>`
    SELECT i.id, a.url AS design_url FROM ideas i
    JOIN assets a ON a.idea_id = i.id AND a.type = 'design'
    WHERE i.category = ${MOCKUP_CATEGORY}
      AND (SELECT COUNT(*) FROM mockups m WHERE m.idea_id = i.id) < ${MOCKUP_TEMPLATES.length}
    ORDER BY i.created_at DESC
    LIMIT ${IDEA_CAP}`;

  let generated = 0;
  let failed = 0;

  for (const idea of candidates) {
    try {
      const designRes = await fetch(idea.design_url);
      if (!designRes.ok) {
        failed++;
        continue;
      }
      const designBuffer = Buffer.from(await designRes.arrayBuffer());

      for (const template of MOCKUP_TEMPLATES) {
        const { rows: existing } = await sql`SELECT 1 FROM mockups WHERE idea_id = ${idea.id} AND template_name = ${template.name}`;
        if (existing.length > 0) continue;

        const resultBuffer = await generateMockup(designBuffer, template);
        const blob = await put(`mockups/idea-${idea.id}-${template.name}.jpg`, resultBuffer, {
          access: "public",
          contentType: "image/jpeg",
        });

        await sql`INSERT INTO mockups (idea_id, template_name, url) VALUES (${idea.id}, ${template.name}, ${blob.url})
                  ON CONFLICT (idea_id, template_name) DO UPDATE SET url = EXCLUDED.url`;
      }
      generated++;
    } catch (err) {
      console.error(`mockup failed on idea ${idea.id}`, err);
      failed++;
    }
  }

  await logReport(
    "Pin Laden",
    `${generated} tumbler mockup set${generated === 1 ? "" : "s"} generated${failed > 0 ? `, ${failed} failed` : ""}`
  );

  return NextResponse.json({ ok: true, generated, failed });
}
