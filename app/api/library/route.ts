import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import type { IdeaWithBundle, PostWithBundle } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();

    const { rows: etsyItems } = await sql<IdeaWithBundle>`
      SELECT i.*, a.url AS design_url, lc.title, lc.tags, lc.description
      FROM ideas i
      LEFT JOIN assets a ON a.idea_id = i.id AND a.type = 'design'
      LEFT JOIN listing_copy lc ON lc.idea_id = i.id
      WHERE i.status = 'approved'
      ORDER BY i.created_at DESC`;

    const { rows: socialItems } = await sql<PostWithBundle>`
      SELECT p.*, ig.url AS instagram_url, tt.url AS tiktok_url, pc.caption, pc.hashtags
      FROM posts p
      LEFT JOIN post_assets ig ON ig.post_id = p.id AND ig.platform = 'instagram'
      LEFT JOIN post_assets tt ON tt.post_id = p.id AND tt.platform = 'tiktok'
      LEFT JOIN post_copy pc ON pc.post_id = p.id
      WHERE p.status = 'approved'
      ORDER BY p.created_at DESC`;

    return NextResponse.json({ etsyItems, socialItems });
  } catch (err) {
    return NextResponse.json({ etsyItems: [], socialItems: [], error: String(err) }, { status: 200 });
  }
}
