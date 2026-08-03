import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { sql, ensureSchema } from "@/lib/db";
import { isAuthorizedCronRequest } from "@/lib/auth";
import { logReport } from "@/lib/reports";
import type { Post } from "@/lib/types";

export const dynamic = "force-dynamic";

export const maxDuration = 280;

// Each post renders TWO images (Instagram + TikTok), so this stays low —
// learned the hard way on the Etsy shop that too much per-run image work
// risks a hard 280s timeout that kills the whole run mid-work. Cap dropped
// again (3 -> 2) to make room for the resolution bump below.
const POST_CAP = 2;

const QUALITY_SUFFIX =
  "Professional, polished illustration quality — avoid the generic over-smoothed, mushy-detail look common in AI art, avoid warped or nonsensical small details, coherent clean composition.";

function buildImagePrompt(post: Post, platform: "instagram" | "tiktok"): string {
  const aspectNote =
    platform === "tiktok"
      ? "vertical 9:16 composition, key visual centered for mobile full-screen viewing"
      : "square/portrait composition suitable for an Instagram feed post";
  return `Social media graphic. Concept: ${post.hook}. Style: ${post.style}. ${aspectNote}. High resolution, clean composition, leaves room for text overlay, no watermark, no existing logos or trademarks. ${QUALITY_SUFFIX}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();

  const { rows: posts } = await sql<Post>`
    SELECT * FROM posts WHERE status = 'new' ORDER BY created_at ASC LIMIT ${POST_CAP}`;

  let rendered = 0;
  let failed = 0;
  const token = process.env.POLLINATIONS_TOKEN;

  for (const post of posts) {
    try {
      const platforms: { platform: "instagram" | "tiktok"; width: string; height: string }[] = [
        { platform: "instagram", width: "1280", height: "1280" },
        { platform: "tiktok", width: "1280", height: "2276" },
      ];

      for (const { platform, width, height } of platforms) {
        const prompt = buildImagePrompt(post, platform);
        const seed = Math.floor(Math.random() * 1_000_000);
        const params = new URLSearchParams({
          width,
          height,
          seed: String(seed),
          nologo: "true",
          ...(token ? { token } : {}),
        });
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`;

        const res = await fetch(imageUrl);
        if (!res.ok) continue;
        const bytes = await res.arrayBuffer();

        const blob = await put(`social/post-${post.id}-${platform}.png`, Buffer.from(bytes), {
          access: "public",
          contentType: "image/png",
        });

        // Upsert-safe via the (post_id, platform) unique constraint — if this
        // asset already exists (a re-run after a partial failure), overwrite
        // rather than risk a duplicate row. Same lesson learned from the
        // Etsy editor's duplicate-key bug.
        await sql`INSERT INTO post_assets (post_id, platform, url) VALUES (${post.id}, ${platform}, ${blob.url})
                  ON CONFLICT (post_id, platform) DO UPDATE SET url = EXCLUDED.url`;
      }

      await sql`UPDATE posts SET status = 'image-ready' WHERE id = ${post.id}`;
      rendered++;
    } catch (err) {
      console.error(`designer failed on post ${post.id}`, err);
      failed++;
    }
  }

  await logReport(
    "Designer",
    `${rendered} posts rendered (both formats)${failed > 0 ? `, ${failed} failed` : ""}`
  );

  return NextResponse.json({ ok: true, rendered, failed });
}
