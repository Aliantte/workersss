import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { sql, ensureSchema } from "@/lib/db";
import { isAuthorizedCronRequest } from "@/lib/auth";
import { logReport } from "@/lib/reports";
import { getNumberSetting } from "@/lib/settings";
import type { Post } from "@/lib/types";

export const dynamic = "force-dynamic";

export const maxDuration = 280;

// Each post renders TWO images (Instagram + TikTok), so this stays low —
// learned the hard way on the Etsy shop that too much per-run image work
// risks a hard 280s timeout. Boardroom can tune these within hard bounds,
// enforced in getNumberSetting() regardless of what it decides.
const DEFAULT_POST_CAP = 2;
const DEFAULT_RESOLUTION = 1280;

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

  const postCap = await getNumberSetting("designer_post_cap", DEFAULT_POST_CAP, 1, 6);
  const baseRes = await getNumberSetting("designer_resolution", DEFAULT_RESOLUTION, 768, 1600);
  const tiktokHeight = Math.round(baseRes * (16 / 9));

  const { rows: posts } = await sql<Post>`
    SELECT * FROM posts WHERE status = 'new' ORDER BY created_at ASC LIMIT ${postCap}`;

  let rendered = 0;
  let failed = 0;
  const token = process.env.POLLINATIONS_TOKEN;

  for (const post of posts) {
    try {
      // Real-source posts (Twitch clips, etc) already have a real thumbnail —
      // no AI generation needed, and hotlinking it directly (rather than
      // downloading and re-hosting it) keeps this squarely in "sharing a
      // link with credit" territory rather than "copying someone's media."
      if (post.thumbnail_url) {
        await sql`INSERT INTO post_assets (post_id, platform, url) VALUES (${post.id}, 'instagram', ${post.thumbnail_url})
                  ON CONFLICT (post_id, platform) DO UPDATE SET url = EXCLUDED.url`;
        await sql`INSERT INTO post_assets (post_id, platform, url) VALUES (${post.id}, 'tiktok', ${post.thumbnail_url})
                  ON CONFLICT (post_id, platform) DO UPDATE SET url = EXCLUDED.url`;
        await sql`UPDATE posts SET status = 'image-ready' WHERE id = ${post.id}`;
        rendered++;
        continue;
      }

      const platforms: { platform: "instagram" | "tiktok"; width: number; height: number }[] = [
        { platform: "instagram", width: baseRes, height: baseRes },
        { platform: "tiktok", width: baseRes, height: tiktokHeight },
      ];

      for (const { platform, width, height } of platforms) {
        const prompt = buildImagePrompt(post, platform);
        const seed = Math.floor(Math.random() * 1_000_000);
        const params = new URLSearchParams({
          width: String(width),
          height: String(height),
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

  await sql`INSERT INTO run_metrics (employee, rendered, failed) VALUES ('Designer', ${rendered}, ${failed})`;

  await logReport(
    "Designer",
    `${rendered} posts rendered (both formats)${failed > 0 ? `, ${failed} failed` : ""}`
  );

  return NextResponse.json({ ok: true, rendered, failed, postCap, baseRes });
}
